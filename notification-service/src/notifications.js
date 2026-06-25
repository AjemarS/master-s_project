const { getNotifPool } = require("./db");

const ALLOWED_COLUMNS = new Set([
  "id", "user_id", "type", "title", "description", "channel",
  "read", "dismissed", "metadata", "created_at", "read_at", "sent_at",
]);

async function createNotification({ userId, type, title, description, channel, metadata }) {
  const pool = getNotifPool();
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, description, channel, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, title, description, channel || "in_app", JSON.stringify(metadata || {})]
  );
  return rows[0];
}

async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const pool = getNotifPool();
  const offset = (page - 1) * limit;
  const { rows: items } = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND dismissed = false
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND dismissed = false`,
    [userId]
  );
  return { items, total: count, page, limit };
}

async function getUnreadCount(userId) {
  const pool = getNotifPool();
  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND read = false AND dismissed = false`,
    [userId]
  );
  return count;
}

async function markRead(id, userId) {
  const pool = getNotifPool();
  const params = [id];
  let userClause = "";
  if (userId) {
    params.push(userId);
    userClause = `AND user_id = $2`;
  }
  const { rows } = await pool.query(
    `UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 ${userClause} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function markAllRead(userId) {
  const pool = getNotifPool();
  await pool.query(
    `UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false AND dismissed = false`,
    [userId]
  );
}

async function dismiss(id, userId) {
  const pool = getNotifPool();
  const params = [id];
  let userClause = "";
  if (userId) {
    params.push(userId);
    userClause = `AND user_id = $2`;
  }
  const { rows } = await pool.query(
    `UPDATE notifications SET dismissed = true WHERE id = $1 ${userClause} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function clearAll(userId) {
  const pool = getNotifPool();
  await pool.query(
    `UPDATE notifications SET dismissed = true WHERE user_id = $1 AND dismissed = false`,
    [userId]
  );
}

module.exports = { createNotification, listNotifications, getUnreadCount, markRead, markAllRead, dismiss, clearAll };
