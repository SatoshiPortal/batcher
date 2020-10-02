import logger from "./logger";
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
      "Scheduler.timeout this._startedAt = %d",
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
      logger.debug("Scheduler.timeout, res=%s", JSON.stringify(res));
    });
  }

  getTimeLeft(): number {
    logger.info("Scheduler.getTimeLeft");

    const now = new Date().getTime();
    logger.debug("Scheduler.getTimeLeft now = %d", now);
    logger.debug("Scheduler.getTimeLeft this._startedAt = %d", this._startedAt);

    const delta = now - this._startedAt;
    logger.debug("Scheduler.getTimeLeft delta = %d", delta);
    logger.debug(
      "Scheduler.getTimeLeft this._batcherConfig.BATCH_TIMEOUT_MINUTES * 60000 = %d",
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
          logger.debug("Scheduler.checkThreshold, total = %f", total);

          if (total >= scheduler._batcherConfig.BATCH_THRESHOLD_AMOUNT) {
            logger.debug("Scheduler.checkThreshold, total >= threshold!");

            scheduler._startedAt = new Date().getTime();
            logger.debug(
              "Scheduler.timeout this._startedAt = %d",
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
                "Scheduler.checkThreshold, res=%s",
                JSON.stringify(res)
              );
            });
          }
        }
      });
  }
}

export { Scheduler };
