import type { Response } from "express";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const SSE_CHANNEL = "notifications:sse";

const clients = new Map<string, Set<Response>>();
let pub: Redis | null = null;
let sub: Redis | null = null;

export async function initRedis(): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  const url = REDIS_URL;
  pub = new Redis(url);
  sub = new Redis(url);

  await sub.subscribe(SSE_CHANNEL);
  sub.on("message", (_channel: string, message: string) => {
    try {
      const { userId, data } = JSON.parse(message);
      broadcastLocal(userId, data);
    } catch { /* ignore malformed messages */ }
  });
}

export async function closeRedis(): Promise<void> {
  if (pub) { await pub.quit(); pub = null; }
  if (sub) { await sub.quit(); sub = null; }
}

function broadcastLocal(userId: string, data: unknown): void {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    try {
      res.write(payload);
    } catch {
      userClients.delete(res);
    }
  }
  if (userClients.size === 0) {
    clients.delete(userId);
  }
}

export function addClient(userId: string, res: Response): void {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(res);
  res.on("close", () => {
    clients.get(userId)?.delete(res);
    if (clients.get(userId)?.size === 0) {
      clients.delete(userId);
    }
  });
}

export function broadcast(userId: string, data: unknown): void {
  broadcastLocal(userId, data);
  if (pub) {
    pub.publish(SSE_CHANNEL, JSON.stringify({ userId, data })).catch(() => {});
  }
}

export function broadcastToAll(data: unknown): void {
  for (const [userId] of clients) {
    broadcast(userId, data);
  }
}

export function clearClients(): void {
  clients.clear();
}

export function getClientCount(): number {
  let count = 0;
  for (const userClients of clients.values()) {
    count += userClients.size;
  }
  return count;
}
