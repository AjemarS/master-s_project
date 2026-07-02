import winston from "winston";

let logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };

if (process.env.NODE_ENV === "test") {
  logger = {
    info: (...args: unknown[]) => console.log(...args),
    error: (...args: unknown[]) => console.error(...args),
    warn: (...args: unknown[]) => console.warn(...args),
  };
} else {
  const wlogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    defaultMeta: { service: "notification-service" },
    transports: [],
  });

  if (process.env.NODE_ENV === "production") {
    wlogger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
      })
    );
  } else {
    wlogger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} ${level} [${service}] ${message}${extra}`;
          }),
        ),
      })
    );
  }
  logger = wlogger;
}

export default logger;
