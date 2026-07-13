import express from "express";
import logger from "./logger";
import router from "./routes";
import { startConsumer, stopConsumer, handleEvent } from "./consumer";
import * as events from "./events";
import * as sse from "./sse";
import * as rateLimiter from "./rate-limiter";
import * as notifDb from "./notifications";
import { closeAll } from "./db";

const PORT = process.env.PORT || 8003;

const app = express();
app.use(express.json());
app.use(router);

export { handleEvent } from "./consumer";
export { sendEmail, htmlWrap, TEMPLATES } from "./templates";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    logger.info(`[server] Notification service listening on port ${PORT}`);
    Promise.all([
      startConsumer(),
      sse.initRedis(),
    ]).catch((err) => {
      logger.error(`[fatal] Failed to start: ${(err as Error).message}`);
      process.exit(1);
    });
  });

  events.startCleanup();
  rateLimiter.startCleanup();
  notifDb.startCleanup();

  async function shutdown(signal: string): Promise<void> {
    logger.info(`[shutdown] ${signal} received`);
    await new Promise<void>(resolve => server.close(() => resolve()));
    events.stopCleanup();
    rateLimiter.stopCleanup();
    notifDb.stopCleanup();
    await stopConsumer();
    await sse.closeRedis();
    await closeAll();
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
