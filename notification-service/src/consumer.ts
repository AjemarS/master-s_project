import amqp, { ChannelModel, Channel } from "amqplib";
import logger from "./logger";
import * as notifDb from "./notifications";
import * as prefsDb from "./preferences";
import * as sse from "./sse";
import * as events from "./events";
import * as admin from "./admin";
import { initTables } from "./db-init";
import { TEMPLATES, stripHtml, sendEmail } from "./templates";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const EXCHANGE = "techhub.events";
const QUEUES = [
  "notification.order.confirmed",
  "notification.status_changed",
  "notification.order.cancelled",
  "notification.low_stock",
];

const BINDINGS: Record<string, string> = {
  "notification.order.confirmed": "order.created",
  "notification.status_changed": "order.status_changed",
  "notification.order.cancelled": "order.cancelled",
  "notification.low_stock": "inventory.low_stock",
};

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;
let reconnectAttempt = 0;

const processedIds = new Set<string>();
const DEDUP_TTL = 300_000;

export let channel: Channel | null = null;
let connection: ChannelModel | null = null;

async function handleOrderEvent(routingKey: string, event: Record<string, unknown>, eventId?: string): Promise<void> {
  const template = TEMPLATES[routingKey];
  if (!template) return;
  const { subject, html } = template(event);
  const customer_email = event.customer_email as string | undefined;
  const order_number = event.order_number as string | undefined;
  const total_amount = event.total_amount as string | undefined;
  const status = event.status as string | undefined;

  const typeMap: Record<string, string | ((status?: string) => string)> = {
    "order.created": "order_confirmed",
    "order.cancelled": "order_cancelled",
    "order.status_changed": (s?: string) => s === "delivered" ? "order_delivered" : "order_shipped",
  };
  const mapped = typeMap[routingKey];
  const type = typeof mapped === "function" ? mapped(status) : mapped;

  if (!type) {
    logger.info("Unknown order event type", { routingKey });
    return;
  }

  let user: { id: string; email?: string } | null = null;
  if (event.user_id) {
    try {
      user = await admin.getUserById(event.user_id as string);
    } catch (err) {
      logger.error("Failed to look up user by id", { error: (err as Error).message, userId: event.user_id });
    }
    if (!user) {
      user = { id: event.user_id as string };
    }
  } else if (customer_email) {
    try {
      user = await admin.getUserByEmail(customer_email);
    } catch (err) {
      logger.error("Failed to look up user by email", { error: (err as Error).message, email: customer_email });
    }
  }

  if (user) {
    await prefsDb.ensureDefaults(user.id);
    const prefs = await prefsDb.getPreferences(user.id);

    if (prefs[`${type}_in_app` as keyof typeof prefs]) {
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

    const email = user.email || customer_email;
    if (prefs[`${type}_email` as keyof typeof prefs] && email) {
      await sendEmail(email, subject, html);
    }
  } else if (customer_email) {
    await sendEmail(customer_email, subject, html);
  } else {
    logger.info("No recipient for event", { routingKey, eventId: eventId || null });
  }
}

async function handleLowStock(event: Record<string, unknown>, eventId?: string): Promise<void> {
  const template = TEMPLATES["inventory.low_stock"];
  if (!template) return;
  const { subject, html } = template(event);

  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, subject, html);
  } else {
    logger.warn("ADMIN_EMAIL not set — low stock alert lost", { product_id: event.product_id });
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
    logger.error("Failed to create low_stock in-app notifications", { error: (err as Error).message });
  }
}

export async function handleEvent(routingKey: string, event: Record<string, unknown>, eventId?: string): Promise<void> {
  if (eventId) {
    if (processedIds.has(eventId)) {
      logger.info("Duplicate event skipped (in-memory)", { eventId });
      return;
    }
    const inserted = await events.markProcessed(eventId);
    if (!inserted) {
      processedIds.add(eventId);
      setTimeout(() => processedIds.delete(eventId), DEDUP_TTL);
      logger.info("Duplicate event skipped (db)", { eventId });
      return;
    }
    processedIds.add(eventId);
    setTimeout(() => processedIds.delete(eventId), DEDUP_TTL);
  }

  if (!TEMPLATES[routingKey]) {
    logger.info("No template for routing key", { routingKey });
    return;
  }

  const handlers: Record<string, (event: Record<string, unknown>, eventId?: string) => Promise<void>> = {
    "inventory.low_stock": handleLowStock,
    "order.created": handleOrderEvent,
    "order.status_changed": handleOrderEvent,
    "order.cancelled": handleOrderEvent,
  };
  const handler = handlers[routingKey];
  if (handler) {
    await handler(event, eventId);
  }
}

export async function startConsumer(): Promise<void> {
  await initTables();

  connection = await amqp.connect(RABBITMQ_URL);
  reconnectAttempt = 0;
  connection.on("close", () => {
    reconnectAttempt++;
    const delay = Math.min(RECONNECT_BASE * Math.pow(2, reconnectAttempt - 1), RECONNECT_MAX) + Math.random() * 1000;
    logger.error("RabbitMQ connection closed — reconnecting", { delay: Math.round(delay), attempt: reconnectAttempt });
    channel = null;
    setTimeout(startConsumer, delay);
  });
  connection.on("error", (err) => {
    reconnectAttempt++;
    const delay = Math.min(RECONNECT_BASE * Math.pow(2, reconnectAttempt - 1), RECONNECT_MAX) + Math.random() * 1000;
    logger.error("RabbitMQ connection error", { error: err.message, delay: Math.round(delay), attempt: reconnectAttempt });
    channel = null;
    setTimeout(startConsumer, delay);
  });

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  for (const queue of QUEUES) {
    await channel.assertQueue(queue, { durable: true });
    const routingKey = BINDINGS[queue];
    await channel.bindQueue(queue, EXCHANGE, routingKey);
    logger.info("Queue bound", { queue, routingKey });
  }

  function createConsumer(queue: string, routingKey: string): void {
    channel!.consume(queue, async (msg) => {
      if (!msg) return;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(msg.content.toString());
      } catch (err) {
        logger.error("Failed to parse message", { queue, error: (err as Error).message });
        channel!.nack(msg, false, false);
        return;
      }
      try {
        await handleEvent(routingKey, event, event.event_id as string || msg.properties.messageId?.toString());
        channel!.ack(msg);
      } catch (err) {
        logger.error("Failed processing event — sending to DLQ", { routingKey, error: (err as Error).message });
        channel!.nack(msg, false, false);
      }
    });
  }

  createConsumer("notification.order.confirmed", "order.created");
  createConsumer("notification.status_changed", "order.status_changed");
  createConsumer("notification.order.cancelled", "order.cancelled");
  createConsumer("notification.low_stock", "inventory.low_stock");

  logger.info("Notification service consuming events");
}

export function getHealthStatus(): { connected: boolean } {
  return { connected: channel !== null && channel.connection !== null };
}

export async function stopConsumer(): Promise<void> {
  logger.info("[shutdown] Draining consumer...");
  if (channel) {
    try { await channel.close(); } catch { }
  }
  if (connection) {
    try { await connection.close(); } catch { }
  }
  logger.info("[shutdown] RabbitMQ disconnected");
}
