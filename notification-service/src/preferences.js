const { getNotifPool } = require("./db");
const { getUserEmails } = require("./admin");

const ALLOWED_COLUMNS = new Set([
  "order_confirmed_email", "order_confirmed_in_app",
  "order_shipped_email", "order_shipped_in_app",
  "order_delivered_email", "order_delivered_in_app",
  "order_cancelled_email", "order_cancelled_in_app",
  "marketing_email", "marketing_in_app",
  "low_stock_email", "low_stock_in_app",
]);

const DEFAULTS = {
  order_confirmed_email: true,
  order_confirmed_in_app: true,
  order_shipped_email: true,
  order_shipped_in_app: true,
  order_delivered_email: true,
  order_delivered_in_app: true,
  order_cancelled_email: true,
  order_cancelled_in_app: true,
  marketing_email: true,
  marketing_in_app: true,
  low_stock_email: true,
  low_stock_in_app: true,
};

async function ensureDefaults(userId) {
  const pool = getNotifPool();
  await pool.query(
    `INSERT INTO notification_preferences (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getPreferences(userId) {
  const pool = getNotifPool();
  const { rows } = await pool.query(
    `SELECT * FROM notification_preferences WHERE user_id = $1`,
    [userId]
  );
  if (rows.length === 0) {
    return { user_id: userId, ...DEFAULTS };
  }
  return rows[0];
}

async function setPreferences(userId, updates) {
  const pool = getNotifPool();
  const keys = [];
  const vals = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (!ALLOWED_COLUMNS.has(key)) continue;
    keys.push(key);
    vals.push(val);
  }

  if (keys.length === 0) {
    return getPreferences(userId);
  }

  await ensureDefaults(userId);

  const setClauses = keys.map((k) => {
    const result = `${k} = $${idx}`;
    idx++;
    return result;
  });
  setClauses.push(`updated_at = NOW()`);
  vals.unshift(userId);

  const { rows } = await pool.query(
    `UPDATE notification_preferences SET ${setClauses.join(", ")} WHERE user_id = $1 RETURNING *`,
    vals
  );
  return rows[0];
}

async function getMarketingTargets(limit = 1000) {
  const notifPool = getNotifPool();
  const { rows: prefs } = await notifPool.query(
    `SELECT user_id, marketing_in_app, marketing_email
     FROM notification_preferences
     WHERE marketing_in_app = true OR marketing_email = true
     LIMIT $1`,
    [limit]
  );

  if (prefs.length === 0) return [];

  const userIds = prefs.map((p) => p.user_id);
  const emailMap = await getUserEmails(userIds);

  return prefs.map((p) => ({
    user_id: p.user_id,
    marketing_in_app: p.marketing_in_app,
    marketing_email: p.marketing_email,
    email: emailMap[p.user_id] || null,
  }));
}

module.exports = { getPreferences, setPreferences, ensureDefaults, DEFAULTS, getMarketingTargets };
