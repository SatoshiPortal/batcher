import logger from "./Log2File";
import BatcherConfig from "../config/BatcherConfig";
import { Batcher } from "./Batcher";
import { Utils } from "./Utils";

class Scheduler {
  private _batcherConfig: BatcherConfig;
  private _startedAt = new Date().getTime();

  constructor(batcherConfig: BatcherConfig) {
    this._batcherConfig = batcherConfig;
  }

  async configureScheduler(batcherConfig: BatcherConfig): Promise<void> {
    this._batcherConfig = batcherConfig;
    this._startedAt = new Date().getTime();
  }

  timeout(scheduler: Scheduler): void {
    logger.info("Scheduler.timeout");

    scheduler._startedAt = new Date().getTime();
    logger.debug(
      "Scheduler.timeout this._startedAt =",
      scheduler._startedAt
    );

    const postdata = {
      id: 0,
      method: "executeBatch",
      params: {
        confTarget: scheduler._batcherConfig.BATCH_CONF_TARGET,
      },
    };

    Utils.post(
      scheduler._batcherConfig.URL_SERVER +
      ":" +
      scheduler._batcherConfig.URL_PORT +
      "/api",
      postdata
    ).then((res) => {
      logger.debug("Scheduler.timeout, res=", JSON.stringify(res));
    });
  }

  getTimeLeft(): number {
    logger.info("Scheduler.getTimeLeft");

    const now = new Date().getTime();
    logger.debug("Scheduler.getTimeLeft now =", now);
    logger.debug("Scheduler.getTimeLeft this._startedAt =", this._startedAt);

    const delta = now - this._startedAt;
    logger.debug("Scheduler.getTimeLeft delta =", delta);
    logger.debug(
      "Scheduler.getTimeLeft this._batcherConfig.BATCH_TIMEOUT_MINUTES * 60000 =",
      this._batcherConfig.BATCH_TIMEOUT_MINUTES * 60000
    );

    return Math.round(
      (this._batcherConfig.BATCH_TIMEOUT_MINUTES * 60000 - delta) / 1000
    );
  }

  checkThreshold(scheduler: Scheduler, batcher: Batcher): void {
    logger.info("Scheduler.checkThreshold");

    batcher
      .getOngoingBatch(scheduler._batcherConfig.DEFAULT_BATCHER_ID, false)
      .then((ongoingBatch) => {
        if (ongoingBatch) {
          logger.debug("Scheduler.checkThreshold, ongoing batch!");
          let total = 0.0;

          ongoingBatch.batchRequests.forEach((br) => {
            total += br.amount;
          });
          logger.debug("Scheduler.checkThreshold, total =", total);

          if (total >= scheduler._batcherConfig.BATCH_THRESHOLD_AMOUNT) {
            logger.debug("Scheduler.checkThreshold, total >= threshold!");

            scheduler._startedAt = new Date().getTime();
            logger.debug(
              "Scheduler.checkThreshold this._startedAt =",
              scheduler._startedAt
            );

            const postdata = {
              id: 0,
              method: "executeBatch",
              params: {
                confTarget: scheduler._batcherConfig.BATCH_CONF_TARGET,
              },
            };

            Utils.post(
              scheduler._batcherConfig.URL_SERVER +
              ":" +
              scheduler._batcherConfig.URL_PORT +
              "/api",
              postdata
            ).then((res) => {
              logger.debug(
                "Scheduler.checkThreshold, res=",
                JSON.stringify(res)
              );
            });
          }
        }
      });
  }
}

export { Scheduler };
