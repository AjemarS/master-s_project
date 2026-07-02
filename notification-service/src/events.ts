import { getNotifPool } from "./db";

const CLEANUP_INTERVAL = 3600_000;
const EVENT_TTL = 86400_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export async function markProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  const pool = getNotifPool();
  const { rowCount } = await pool.query(
    `INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [eventId]
  );
  return (rowCount || 0) > 0;
}

export async function cleanupOldEvents(): Promise<void> {
  const pool = getNotifPool();
  const cutoff = new Date(Date.now() - EVENT_TTL).toISOString();
  await pool.query(`DELETE FROM processed_events WHERE created_at < $1`, [cutoff]);
}

export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupOldEvents, CLEANUP_INTERVAL);
  cleanupOldEvents().catch(() => {});
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
