const express = require("express");
const amqp = require("amqplib");
const { Resend } = require("resend");

const { closeAll } = require("./db");
const notifDb = require("./notifications");
const prefsDb = require("./preferences");
const sse = require("./sse");
const events = require("./events");
const admin = require("./admin");
const { initTables } = require("./db-init");

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

const processedIds = new Set();
const DEDUP_TTL = 300_000;

async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log(`[dry-run] Email to ${to}: ${subject}`);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  console.log(`[email] Sent to ${to}: ${subject}`);
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function handleOrderEvent(routingKey, event, eventId) {
  const template = TEMPLATES[routingKey];
  if (!template) return;
  const { subject, html } = template(event);
  const { customer_email, order_number, total_amount, status } = event;

  let type;
  if (routingKey === "order.created") type = "order_confirmed";
  else if (routingKey === "order.cancelled") type = "order_cancelled";
  else if (routingKey === "order.status_changed") {
    if (status === "delivered") type = "order_delivered";
    else type = "order_shipped";
  }

  let user = null;
  if (event.user_id) {
    user = { id: event.user_id };
  } else if (customer_email) {
    try {
      user = await admin.getUserByEmail(customer_email);
    } catch (err) {
      console.error(`[error] Failed to look up user by email: ${err.message}`);
    }
  }

  if (user) {
    await prefsDb.ensureDefaults(user.id);
    const prefs = await prefsDb.getPreferences(user.id);

    if (prefs[`${type}_in_app`]) {
      const notif = await notifDb.createNotification({
        userId: user.id,
        type,
        title: subject,
        description: stripHtml(html),
        channel: "in_app",
        metadata: { order_number, total_amount, status },
      });
      sse.broadcast(user.id, notif);
    }

    if (prefs[`${type}_email`] && customer_email) {
      await sendEmail(customer_email, subject, html);
    }
  } else if (customer_email) {
    await sendEmail(customer_email, subject, html);
  } else {
    console.log(`[skip] No recipient for ${routingKey} event ${eventId || "?"}`);
  }
}

async function handleLowStock(event, eventId) {
  const template = TEMPLATES["inventory.low_stock"];
  if (!template) return;
  const { subject, html } = template(event);

  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, subject, html);
  } else {
    console.warn(`[skip] ADMIN_EMAIL not configured — low stock alert lost for product #${event.product_id}`);
  }

  try {
    const admins = await admin.getAdminUsers();
    for (const a of admins) {
      await prefsDb.ensureDefaults(a.id);
      const prefs = await prefsDb.getPreferences(a.id);
      if (prefs.low_stock_in_app) {
        const notif = await notifDb.createNotification({
          userId: a.id,
          type: "low_stock",
          title: subject,
          description: stripHtml(html),
          channel: "in_app",
          metadata: { product_id: event.product_id, quantity: event.quantity, warehouse_name: event.warehouse_name },
        });
        sse.broadcast(a.id, notif);
      }
    }
  } catch (err) {
    console.error(`[error] Failed to create low_stock in-app notifications: ${err.message}`);
  }
}

async function handleEvent(routingKey, event, eventId) {
  if (eventId) {
    if (processedIds.has(eventId)) {
      console.log(`[dedup] Skipping ${eventId} (in-memory)`);
      return;
    }
    const alreadyProcessed = await events.isProcessed(eventId);
    if (alreadyProcessed) {
      processedIds.add(eventId);
      console.log(`[dedup] Skipping ${eventId} (db)`);
      return;
    }
    processedIds.add(eventId);
    setTimeout(() => processedIds.delete(eventId), DEDUP_TTL);
    await events.markProcessed(eventId);
  }

  if (!TEMPLATES[routingKey]) {
    console.log(`[unknown] No template for ${routingKey}`);
    return;
  }

  if (routingKey === "inventory.low_stock") {
    await handleLowStock(event, eventId);
  } else if (["order.created", "order.status_changed", "order.cancelled"].includes(routingKey)) {
    await handleOrderEvent(routingKey, event, eventId);
  }
}

let channel = null;
let connection = null;

async function startConsumer() {
  await initTables();

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
    try { await channel.close(); } catch (e) { }
  }
  if (connection) {
    try { await connection.close(); } catch (e) { }
  }
  console.log("[shutdown] RabbitMQ disconnected");
}

const app = express();
app.use(require("cors")());

function requireOwnUserId(req, res, next) {
  const gatewayUserId = req.headers["x-gateway-user-id"];
  const gatewayRole = req.headers["x-gateway-user-role"];
  const targetUserId = req.query.userId || req.params.userId;

  if (!targetUserId) return res.status(400).json({ error: "userId required" });
  if (gatewayRole === "admin") return next();
  if (gatewayUserId && gatewayUserId === targetUserId) return next();
  return res.status(403).json({ error: "Access denied" });
}

app.get("/health", (req, res) => {
  const consumerOk = channel !== null && channel.connection && channel.connection.stream;
  res.json({
    status: consumerOk ? "healthy" : "degraded",
    service: "notification-service",
    consumer: consumerOk ? "connected" : "disconnected",
    sseClients: sse.getClientCount(),
  });
});

app.get("/api/notifications", requireOwnUserId, async (req, res) => {
  try {
    const { userId, page, limit } = req.query;
    const result = await notifDb.listNotifications(userId, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
    });
    res.json(result);
  } catch (err) {
    console.error(`[error] GET /api/notifications: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/unread/:userId", requireOwnUserId, async (req, res) => {
  try {
    const count = await notifDb.getUnreadCount(req.params.userId);
    res.json({ count });
  } catch (err) {
    console.error(`[error] GET /api/notifications/unread: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const gatewayUserId = req.headers["x-gateway-user-id"];
    const notif = await notifDb.markRead(req.params.id, gatewayUserId);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    res.json(notif);
  } catch (err) {
    console.error(`[error] PATCH /api/notifications/:id/read: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/notifications/read-all/:userId", requireOwnUserId, async (req, res) => {
  try {
    await notifDb.markAllRead(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    console.error(`[error] PATCH /api/notifications/read-all: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/notifications/:id/dismiss", async (req, res) => {
  try {
    const gatewayUserId = req.headers["x-gateway-user-id"];
    const notif = await notifDb.dismiss(req.params.id, gatewayUserId);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    res.json(notif);
  } catch (err) {
    console.error(`[error] POST /api/notifications/:id/dismiss: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/notifications/:userId", requireOwnUserId, async (req, res) => {
  try {
    await notifDb.clearAll(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    console.error(`[error] DELETE /api/notifications/:userId: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/preferences/:userId", requireOwnUserId, async (req, res) => {
  try {
    const prefs = await prefsDb.getPreferences(req.params.userId);
    res.json(prefs);
  } catch (err) {
    console.error(`[error] GET /api/notifications/preferences: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/notifications/preferences/:userId", requireOwnUserId, express.json(), async (req, res) => {
  try {
    const prefs = await prefsDb.setPreferences(req.params.userId, req.body);
    res.json(prefs);
  } catch (err) {
    console.error(`[error] PATCH /api/notifications/preferences: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/stream", requireOwnUserId, (req, res) => {
  const { userId } = req.query;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch (e) { clearInterval(heartbeat); }
  }, 30000);

  sse.addClient(userId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

const MARKETING_ALLOWED_TYPES = ["marketing", "offer", "promotion"];

app.post("/api/notifications/marketing", express.json(), async (req, res) => {
  try {
    const role = req.headers["x-gateway-user-role"];
    if (role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
    const { title, description, type } = req.body;
    if (!title || !description) return res.status(400).json({ error: "title and description required" });
    const notifType = MARKETING_ALLOWED_TYPES.includes(type) ? type : "marketing";

    const users = await prefsDb.getMarketingTargets(1000);
    let created = 0;
    for (const u of users) {
      if (u.marketing_in_app) {
        await notifDb.createNotification({
          userId: u.user_id,
          type: notifType,
          title,
          description,
          channel: "in_app",
          metadata: {},
        });
        created++;
      }
      if (u.marketing_email && u.email) {
        const htmlBody = htmlWrap(`<p>${description}</p>`, title);
        await sendEmail(u.email, title, htmlBody);
      }
    }
    res.json({ success: true, created });
  } catch (err) {
    console.error(`[error] POST /api/notifications/marketing: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    console.log(`[server] Notification service listening on port ${PORT}`);
    startConsumer().catch((err) => {
      console.error(`[fatal] Failed to start consumer: ${err.message}`);
      process.exit(1);
    });
  });

  events.startCleanup();

  process.on("SIGTERM", async () => {
    console.log("[shutdown] SIGTERM received");
    server.close(() => {});
    events.stopCleanup();
    await stopConsumer();
    await closeAll();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[shutdown] SIGINT received");
    server.close(() => {});
    events.stopCleanup();
    await stopConsumer();
    await closeAll();
    process.exit(0);
  });
}

module.exports = { handleEvent, sendEmail, htmlWrap, TEMPLATES, ADMIN_EMAIL, FROM_EMAIL };
