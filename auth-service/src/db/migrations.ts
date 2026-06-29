import { pool } from "../auth";
import logger from "../logger";

export async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id TEXT NOT NULL,
        actor_email TEXT,
        action TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log (actor_id);
    `);
    logger.info("Database migrations completed");
  } catch (error: unknown) {
    logger.warn("Database migration failed", { error: (error as Error).message });
  }
}
