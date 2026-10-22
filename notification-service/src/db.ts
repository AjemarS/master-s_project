import { Pool } from "pg";
import logger from "./logger";

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
    // pg emits "error" when the server drops an idle connection (DB restart); unhandled, it kills the process
    notifPool.on("error", (err) => logger.error("PostgreSQL idle client error", { error: err.message }));
  }
  return notifPool;
}

export async function closeAll(): Promise<void> {
  if (notifPool) {
    try { await notifPool.end(); } catch { }
    notifPool = null;
  }
}
