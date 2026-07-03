import express from "express";
import logger from "./logger";
import { initTables } from "./store";
import { startConsumer, stopConsumer } from "./consumer";
import routes from "./routes";

async function main() {
  await initTables();

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use(routes);

  const port = process.env.PORT || 8005;
  const server = app.listen(port, () => {
    logger.info(`Audit service listening on port ${port}`);
  });

  try {
    await startConsumer();
  } catch (err) {
    logger.error("Failed to start RabbitMQ consumer — running without event capture", {
      error: (err as Error).message,
    });
  }

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    await stopConsumer();
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: (err as Error).message });
  process.exit(1);
});
