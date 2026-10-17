import amqp, { Channel, ChannelModel } from "amqplib";
import logger from "./logger";
import { insertEntry } from "./store";

const EXCHANGE = "techhub.events";
const QUEUE = "audit.all";

const RECONNECT_MAX = 30000;

let channel: Channel | null = null;
let connection: ChannelModel | null = null;
let reconnectAttempt = 0;
let stopping = false;

function scheduleReconnect(): void {
  reconnectAttempt++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt - 1), RECONNECT_MAX);
  logger.error("RabbitMQ unavailable — audit consumer reconnecting", { delay, attempt: reconnectAttempt });
  setTimeout(startConsumer, delay);
}

// Never rejects: a broker that is down (at startup or later) is retried with backoff
export async function startConsumer(): Promise<void> {
  try {
    await connect();
    reconnectAttempt = 0;
  } catch (err) {
    logger.error("RabbitMQ connect failed", { error: (err as Error).message });
    channel = null;
    scheduleReconnect();
  }
}

async function connect(): Promise<void> {
  const url = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
  connection = await amqp.connect(url);
  // amqplib emits "close" after every "error"; only "close" reconnects
  connection.on("close", () => {
    channel = null;
    if (!stopping) {
      logger.error("RabbitMQ connection closed");
      scheduleReconnect();
    }
  });
  connection.on("error", (err) => {
    logger.error("RabbitMQ connection error", { error: err.message });
  });

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, "#");

  logger.info("Audit consumer bound to techhub.events with #");

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const service = msg.fields.routingKey.split(".")[0] || "unknown";

      await insertEntry({
        event_id: (payload.event_id as string) || msg.properties.messageId?.toString(),
        routing_key: msg.fields.routingKey,
        event_type: "rabbitmq",
        service: `${service}-service`,
        payload,
      });

      channel!.ack(msg);
    } catch (err) {
      logger.error("Failed to process audit event", { error: (err as Error).message });
      channel!.ack(msg);
    }
  });

  logger.info("Audit consumer started");
}

export async function stopConsumer(): Promise<void> {
  stopping = true;
  if (channel) { try { await channel.close(); } catch { /* ignore */ } }
  if (connection) { try { await connection.close(); } catch { /* ignore */ } }
}

export function isConsumerConnected(): boolean {
  return channel !== null && channel.connection !== null;
}
