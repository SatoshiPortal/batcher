import { ILogObject, Logger } from "tslog";
import { appendFileSync } from "fs";

function logToTransport(logObject: ILogObject): void {
  appendFileSync("logs/batcher.log", JSON.stringify(logObject) + "\n");
}

const logger = new Logger();
logger.attachTransport(
  {
    silly: logToTransport,
    debug: logToTransport,
    trace: logToTransport,
    info: logToTransport,
    warn: logToTransport,
    error: logToTransport,
    fatal: logToTransport,
  },
  "debug"
);

export default logger;
