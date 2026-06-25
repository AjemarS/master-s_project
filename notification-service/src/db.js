const { Pool } = require("pg");

function createMockPool() {
  return {
    query: () => Promise.resolve({ rows: [] }),
    end: () => Promise.resolve(),
  };
}

let notifPool = null;
let authPool = null;

function getNotifPool() {
  if (process.env.NODE_ENV === "test") return createMockPool();
  if (!notifPool) {
    notifPool = new Pool({
      connectionString: process.env.NOTIFICATIONS_DATABASE_URL || "postgresql://postgres:postgres@localhost:5436/notifications_db",
      max: 10,
    });
  }
  return notifPool;
}

function getAuthPool() {
  if (process.env.NODE_ENV === "test") return createMockPool();
  if (!authPool) {
    authPool = new Pool({
      connectionString: process.env.AUTH_DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/auth_db",
      max: 5,
    });
  }
  return authPool;
}

async function closeAll() {
  if (notifPool && notifPool.end) {
    try { await notifPool.end(); } catch (e) { }
    notifPool = null;
  }
  if (authPool && authPool.end) {
    try { await authPool.end(); } catch (e) { }
    authPool = null;
  }
}

module.exports = { getNotifPool, getAuthPool, closeAll };
