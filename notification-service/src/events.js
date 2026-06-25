const { getNotifPool } = require("./db");

const CLEANUP_INTERVAL = 3600_000;
const EVENT_TTL = 86400_000;

let cleanupTimer = null;

async function isProcessed(eventId) {
  if (!eventId) return false;
  const pool = getNotifPool();
  const { rows } = await pool.query(
    `SELECT 1 FROM processed_events WHERE event_id = $1`,
    [eventId]
  );
  return rows.length > 0;
}

async function markProcessed(eventId) {
  if (!eventId) return;
  const pool = getNotifPool();
  await pool.query(
    `INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [eventId]
  );
}

async function cleanupOldEvents() {
  const pool = getNotifPool();
  const cutoff = new Date(Date.now() - EVENT_TTL).toISOString();
  await pool.query(`DELETE FROM processed_events WHERE created_at < $1`, [cutoff]);
}

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupOldEvents, CLEANUP_INTERVAL);
  cleanupOldEvents().catch(() => {});
}

function stopCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

module.exports = { isProcessed, markProcessed, cleanupOldEvents, startCleanup, stopCleanup };
