const express = require("express");
const amqp = require("amqplib");
const { Resend } = require("resend");

// ── Config ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 8003;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://techhub:techhub@rabbitmq:5672";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@techhub.shop";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const EXCHANGE = "techhub.events";
const QUEUES = [
  "notification.order.confirmed",
  "notification.status_changed",
  "notification.order.cancelled",
  "notification.low_stock",
];

const BINDINGS = {
  "notification.order.confirmed": "order.created",
  "notification.status_changed": "order.status_changed",
  "notification.order.cancelled": "order.cancelled",
  "notification.low_stock": "inventory.low_stock",
};

const RECONNECT_DELAY = 5000;

// ── Resend ──────────────────────────────────────────────────────
let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

function htmlWrap(body, title) {
  return `<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="480" style="background:#fff;border-radius:12px">
<tr><td style="padding:32px 32px 8px">
<h1 style="margin:0;font-size:24px;color:#1e293b">TechHub</h1>
</td></tr>
<tr><td style="padding:8px 32px 32px;color:#475569;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center">
TechHub &mdash; магазин побутової техніки</td></tr>
</table></td></tr></table></body></html>`;
}

const TEMPLATES = {
  "order.created": (data) => ({
    subject: `Замовлення #${data.order_number} підтверджено`,
    html: htmlWrap(`
      <p>Дякуємо за замовлення в TechHub!</p>
      <p>Ваше замовлення <strong>#${data.order_number}</strong> підтверджено та оплачено.</p>
      <p>Сума: <strong>${data.total_amount} ₴</strong></p>
      <p>Ми повідомимо вас, коли замовлення буде відправлено.</p>
    `, "Замовлення підтверджено"),
  }),
  "order.status_changed": (data) => ({
    subject: `Замовлення #${data.order_number} — ${data.status === "shipped" ? "відправлено" : "статус змінено"}`,
    html: htmlWrap(`
      <p>Статус вашого замовлення <strong>#${data.order_number}</strong> змінено.</p>
      <p>Новий статус: <strong>${data.status}</strong></p>
      ${data.status === "shipped" ? "<p>Ваше замовлення в дорозі!</p>" : ""}
      ${data.status === "delivered" ? "<p>Замовлення доставлено. Дякуємо за покупку!</p>" : ""}
    `, "Статус замовлення"),
  }),
  "order.cancelled": (data) => ({
    subject: `Замовлення #${data.order_number} скасовано`,
    html: htmlWrap(`
      <p>Ваше замовлення <strong>#${data.order_number}</strong> було скасовано.</p>
      <p>Якщо оплата була проведена, кошти буде повернено.</p>
      <p>Якщо у вас є питання, зв'яжіться з нами.</p>
    `, "Замовлення скасовано"),
  }),
  "inventory.low_stock": (data) => ({
    subject: `Низький залишок: товар #${data.product_id}`,
    html: htmlWrap(`
      <p>Залишок товару <strong>#${data.product_id}</strong> впав нижче порогу.</p>
      <p>Поточний залишок: <strong>${data.quantity}</strong> од.</p>
      <p>Склад: <strong>${data.warehouse_name || data.warehouse_id}</strong></p>
      <p>Будь ласка, замовте поповнення.</p>
    `, "Низький залишок"),
  }),
};

// ── Processed event dedup ───────────────────────────────────────
const processedIds = new Set();
const DEDUP_TTL = 300_000;

function markProcessed(eventId) {
  if (!eventId) return;
  processedIds.add(eventId);
  setTimeout(() => processedIds.delete(eventId), DEDUP_TTL);
}

function isProcessed(eventId) {
  return eventId && processedIds.has(eventId);
}

// ── Send email ──────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log(`[dry-run] Email to ${to}: ${subject}`);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  console.log(`[email] Sent to ${to}: ${subject}`);
}

// ── Handle event ────────────────────────────────────────────────
async function handleEvent(routingKey, event, eventId) {
  if (isProcessed(eventId)) {
    console.log(`[dedup] Skipping ${eventId}`);
    return;
  }
  markProcessed(eventId);

  const template = TEMPLATES[routingKey];
  if (!template) {
    console.log(`[unknown] No template for ${routingKey}`);
    return;
  }

  let to = "";
  if (routingKey === "order.created" || routingKey === "order.status_changed" || routingKey === "order.cancelled") {
    to = event.customer_email;
  } else if (routingKey === "inventory.low_stock") {
    if (!ADMIN_EMAIL) {
      console.warn(`[skip] ADMIN_EMAIL not configured — low stock alert lost for product #${event.product_id}`);
      return;
    }
    to = ADMIN_EMAIL;
  }

  if (!to) {
    console.log(`[skip] No recipient for ${routingKey} event ${eventId}`);
    return;
  }

  const { subject, html } = template(event);
  try {
    await sendEmail(to, subject, html);
  } catch (err) {
    console.error(`[error] Failed to send email: ${err.message}`);
  }
}

// ── RabbitMQ consumer ──────────────────────────────────────────
let channel = null;
let connection = null;

async function startConsumer() {
  connection = await amqp.connect(RABBITMQ_URL);
  connection.on("close", () => {
    console.error("[rabbitmq] Connection closed — reconnecting...");
    channel = null;
    setTimeout(startConsumer, RECONNECT_DELAY);
  });
  connection.on("error", (err) => {
    console.error(`[rabbitmq] Connection error: ${err.message} — reconnecting...`);
    channel = null;
    setTimeout(startConsumer, RECONNECT_DELAY);
  });

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  for (const queue of QUEUES) {
    await channel.assertQueue(queue, { durable: true });
    const routingKey = BINDINGS[queue];
    await channel.bindQueue(queue, EXCHANGE, routingKey);
    console.log(`[queue] Bound ${queue} <- ${routingKey}`);
  }

  channel.consume("notification.order.confirmed", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await handleEvent("order.created", event, event.event_id || msg.properties.messageId);
    } catch (err) {
      console.error(`[error] Failed processing order.confirmed: ${err.message}`);
    }
    channel.ack(msg);
  });

  channel.consume("notification.status_changed", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await handleEvent("order.status_changed", event, event.event_id || msg.properties.messageId);
    } catch (err) {
      console.error(`[error] Failed processing status_changed: ${err.message}`);
    }
    channel.ack(msg);
  });

  channel.consume("notification.order.cancelled", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await handleEvent("order.cancelled", event, event.event_id || msg.properties.messageId);
    } catch (err) {
      console.error(`[error] Failed processing order.cancelled: ${err.message}`);
    }
    channel.ack(msg);
  });

  channel.consume("notification.low_stock", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await handleEvent("inventory.low_stock", event, event.event_id || msg.properties.messageId);
    } catch (err) {
      console.error(`[error] Failed processing low_stock: ${err.message}`);
    }
    channel.ack(msg);
  });

  console.log(`[ready] Notification service consuming events`);
}

async function stopConsumer() {
  console.log("[shutdown] Draining consumer...");
  if (channel) {
    try { await channel.close(); } catch (e) { /* ignore */ }
  }
  if (connection) {
    try { await connection.close(); } catch (e) { /* ignore */ }
  }
  console.log("[shutdown] RabbitMQ disconnected");
}

// ── Express server ──────────────────────────────────────────────
const app = express();
app.use(require("cors")());

// In-memory notification preferences (MVP — no persistence)
const USER_PREFS = {};

app.get("/health", (req, res) => {
  const consumerOk = channel !== null && channel.connection && channel.connection.stream;
  res.json({
    status: consumerOk ? "healthy" : "degraded",
    service: "notification-service",
    consumer: consumerOk ? "connected" : "disconnected",
  });
});

app.get("/api/notifications/preferences/:userId", (req, res) => {
  const prefs = USER_PREFS[req.params.userId] || {
    order_confirmed: true,
    order_shipped: true,
    order_delivered: true,
    order_cancelled: true,
    marketing: false,
  };
  res.json(prefs);
});

app.patch("/api/notifications/preferences/:userId", express.json(), (req, res) => {
  USER_PREFS[req.params.userId] = { ...USER_PREFS[req.params.userId], ...req.body };
  res.json(USER_PREFS[req.params.userId]);
});

const server = app.listen(PORT, () => {
  console.log(`[server] Notification service listening on port ${PORT}`);
  startConsumer().catch((err) => {
    console.error(`[fatal] Failed to start consumer: ${err.message}`);
    process.exit(1);
  });
});

// ── Graceful shutdown ───────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("[shutdown] SIGTERM received");
  server.close(() => {});
  await stopConsumer();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[shutdown] SIGINT received");
  server.close(() => {});
  await stopConsumer();
  process.exit(0);
});
