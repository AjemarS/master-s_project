import { getNotifPool } from "./db";

export async function initTables(): Promise<void> {
  const pool = getNotifPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        type        VARCHAR(50) NOT NULL,
        title       VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        channel     VARCHAR(20) NOT NULL DEFAULT 'in_app',
        read        BOOLEAN DEFAULT false,
        dismissed   BOOLEAN DEFAULT false,
        metadata    JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        read_at     TIMESTAMPTZ,
        sent_at     TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notif_user_created
        ON notifications (user_id, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id                  UUID PRIMARY KEY,
        order_confirmed_email    BOOLEAN DEFAULT true,
        order_confirmed_in_app   BOOLEAN DEFAULT true,
        order_shipped_email      BOOLEAN DEFAULT true,
        order_shipped_in_app     BOOLEAN DEFAULT true,
        order_delivered_email    BOOLEAN DEFAULT true,
        order_delivered_in_app   BOOLEAN DEFAULT true,
        order_cancelled_email    BOOLEAN DEFAULT true,
        order_cancelled_in_app   BOOLEAN DEFAULT true,
        marketing_email          BOOLEAN DEFAULT true,
        marketing_in_app         BOOLEAN DEFAULT true,
        low_stock_email          BOOLEAN DEFAULT true,
        low_stock_in_app         BOOLEAN DEFAULT true,
        created_at               TIMESTAMPTZ DEFAULT NOW(),
        updated_at               TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id   TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_events_created
        ON processed_events (created_at)
    `);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
