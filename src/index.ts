import { HttpServer } from "./lib/HttpServer";
import logger from "./lib/logger";

const setup = async (): Promise<void> => {
  logger.debug("setup");
};

const main = async (): Promise<void> => {
  await setup();

  const httpServer = new HttpServer();
  httpServer.start();
};

main();
