import winston, { format } from "winston";

const options: winston.LoggerOptions = {
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === "production" ? "error" : "debug",
    }),
    new winston.transports.File({
      filename: "logs/batcher.log",
      level: "debug",
    }),
  ],
  format: winston.format.combine(
    format.splat(),
    // format.colorize(),
    format.timestamp(),
    format.simple(),
    format.metadata()
    // format.json()
  ),
};

const logger = winston.createLogger(options);

if (process.env.NODE_ENV !== "production") {
  logger.debug("Logging initialized at debug level");
}

export default logger;
