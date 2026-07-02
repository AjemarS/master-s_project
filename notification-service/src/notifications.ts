import logger from "./logger";
import { getNotifPool } from "./db";

interface CreateNotifParams {
  userId: string;
  type: string;
  title: string;
  description: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  channel: string;
  read: boolean;
  dismissed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
}

interface ListResult {
  items: NotificationRow[];
  total: number;
  page: number;
  limit: number;
}

export async function createNotification({ userId, type, title, description, channel, metadata }: CreateNotifParams): Promise<NotificationRow> {
  const pool = getNotifPool();
  const { rows } = await pool.query<NotificationRow>(
    `INSERT INTO notifications (user_id, type, title, description, channel, metadata, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [userId, type, title, description, channel || "in_app", JSON.stringify(metadata || {})]
  );
  return rows[0];
}

export async function listNotifications(userId: string, { page = 1, limit = 20 } = {}): Promise<ListResult> {
  const pool = getNotifPool();
  page = Math.max(1, page);
  const offset = (page - 1) * limit;
  const { rows: items } = await pool.query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND dismissed = false
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const { rows: [{ count }] } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND dismissed = false`,
    [userId]
  );
  return { items, total: count, page, limit };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const pool = getNotifPool();
  const { rows: [{ count }] } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND read = false AND dismissed = false`,
    [userId]
  );
  return count;
}

export async function markRead(id: string, userId?: string): Promise<NotificationRow | null> {
  const pool = getNotifPool();
  const params: unknown[] = [id];
  let userClause = "";
  if (userId) {
    params.push(userId);
    userClause = `AND user_id = $2`;
  }
  const { rows } = await pool.query<NotificationRow>(
    `UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 ${userClause} RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function markAllRead(userId: string): Promise<void> {
  const pool = getNotifPool();
  await pool.query(
    `UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false AND dismissed = false`,
    [userId]
  );
}

export async function dismiss(id: string, userId?: string): Promise<NotificationRow | null> {
  const pool = getNotifPool();
  const params: unknown[] = [id];
  let userClause = "";
  if (userId) {
    params.push(userId);
    userClause = `AND user_id = $2`;
  }
  const { rows } = await pool.query<NotificationRow>(
    `UPDATE notifications SET dismissed = true WHERE id = $1 ${userClause} RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function clearAll(userId: string): Promise<void> {
  const pool = getNotifPool();
  await pool.query(
    `UPDATE notifications SET dismissed = true WHERE user_id = $1 AND dismissed = false`,
    [userId]
  );
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
const CLEANUP_INTERVAL = 86400_000;
const DISMISSED_TTL = 259200_000;

export async function cleanOldDismissed(): Promise<void> {
  const pool = getNotifPool();
  const cutoff = new Date(Date.now() - DISMISSED_TTL).toISOString();
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE dismissed = true AND created_at < $1`,
    [cutoff]
  );
  if (rowCount && rowCount > 0) {
    logger.info(`[cleanup] Deleted ${rowCount} old dismissed notifications`);
  }
}

export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanOldDismissed, CLEANUP_INTERVAL);
  cleanOldDismissed().catch(() => {});
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
