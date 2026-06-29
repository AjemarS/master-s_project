import { pool } from "../auth";
import logger from "../logger";

export interface AuditEntry {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await pool.query(
        `INSERT INTO audit_log (actor_id, actor_email, action, target_id, target_type, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          entry.actorId,
          entry.actorEmail || null,
          entry.action,
          entry.targetId || null,
          entry.targetType || null,
          JSON.stringify(entry.metadata || {}),
          entry.ipAddress || null,
        ],
      );
      return;
    } catch (error: unknown) {
      if (attempt < 2) {
        logger.warn("Retrying audit log write", { error: (error as Error).message, action: entry.action, attempt });
        continue;
      }
      logger.error("Failed to write audit log after retries", { error: (error as Error).message, action: entry.action });
    }
  }
}

export function auditFromReq(actorId: string, action: string, targetId?: string, targetType?: string, metadata?: Record<string, unknown>) {
  return (req: import("express").Request) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    writeAuditLog({ actorId, action, targetId, targetType, metadata, ipAddress: ip });
  };
}
