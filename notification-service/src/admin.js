const { getAuthPool } = require("./db");

async function getAdminUsers() {
  const pool = getAuthPool();
  const { rows } = await pool.query(
    `SELECT id, name, email FROM "user" WHERE role = 'admin'`
  );
  return rows;
}

async function getUserByEmail(email) {
  const pool = getAuthPool();
  const { rows } = await pool.query(
    `SELECT id, name, email FROM "user" WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function getUserEmails(userIds) {
  if (userIds.length === 0) return {};
  const pool = getAuthPool();
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query(
    `SELECT id, email FROM "user" WHERE id IN (${placeholders})`,
    userIds
  );
  const map = {};
  for (const u of rows) {
    map[u.id] = u.email;
  }
  return map;
}

module.exports = { getAdminUsers, getUserByEmail, getUserEmails };
