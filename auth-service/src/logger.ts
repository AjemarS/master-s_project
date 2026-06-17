import winston from "winston";

const { combine, timestamp, printf, json, errors, colorize } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, service, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
});

// Custom format for production (structured JSON)
const prodFormat = combine(timestamp(), json());

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  defaultMeta: {
    service: "auth-service",
    environment: process.env.NODE_ENV || "development",
  },
  format: isProduction
    ? prodFormat
    : combine(
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        errors({ stack: true }),
        devFormat
      ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// If production, also log to file
if (isProduction) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}

export default logger;