import { Pool } from "pg";

function createMockPool() {
  return {
    query: () => Promise.resolve({ rows: [] }),
    end: () => Promise.resolve(),
  } as unknown as Pool;
}

let notifPool: Pool | null = null;

export function getNotifPool(): Pool {
  if (process.env.NODE_ENV === "test") return createMockPool();
  if (!notifPool) {
    notifPool = new Pool({
      connectionString: process.env.NOTIFICATIONS_DATABASE_URL || "postgresql://postgres:postgres@localhost:5436/notifications_db",
      max: 10,
    });
  }
  return notifPool;
}

export async function closeAll(): Promise<void> {
  if (notifPool) {
    try { await notifPool.end(); } catch { }
    notifPool = null;
  }
}
