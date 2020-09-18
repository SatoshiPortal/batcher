import logger from "./logger";
import BatcherConfig from "../config/BatcherConfig";
import { CyphernodeClient } from "./CyphernodeClient";
import { BatcherDB } from "./BatcherDB";
import { BatchRequest } from "../entity/BatchRequest";
import IReqBatchRequest from "../types/IReqBatchRequest";
import IRespAddToBatch from "../types/cyphernode/IRespAddToBatch";
import IReqBatchSpend from "../types/cyphernode/IReqBatchSpend";
import IRespBatchSpend from "../types/cyphernode/IRespBatchSpend";
import { Batch } from "../entity/Batch";
import {
  ErrorCodes,
  IResponseMessage,
} from "../types/jsonrpc/IResponseMessage";
import IRespBatchRequest from "../types/IRespBatchRequest";
import IReqGetBatchDetails from "../types/IReqGetBatchDetails";
import IRespGetBatchDetails from "../types/IRespGetBatchDetails";
import { GetBatchDetailsValidator } from "../validators/GetBatchDetailsValidator";
import { QueueForNextBatchValidator } from "../validators/QueueForNextBatchValidator";
import IReqExecuteBatch from "../types/IReqExecuteBatch";
import { ExecuteBatchValidator } from "../validators/ExecuteBatchValidator";
import IRespExecuteBatch from "../types/IRespExecuteBatch";
import IReqAddToBatch from "../types/cyphernode/IReqAddToBatch";
import { Utils } from "./Utils";
import { Scheduler } from "./Scheduler";
import IReqDequeueAndPay from "../types/IReqDequeueAndPay";
import IRespDequeueAndPay from "../types/IRespDequeueAndPay";
import IRespSpend from "../types/cyphernode/IRespSpend";
import IReqSpend from "../types/cyphernode/IReqSpend";
import { DequeueAndPayValidator } from "../validators/DequeueAndPayValidator";

class Batcher {
  private _batcherConfig: BatcherConfig;
  private _cyphernodeClient: CyphernodeClient;
  private _batcherDB: BatcherDB;
  private _scheduler: Scheduler;
  private _intervalTimeout?: NodeJS.Timeout;
  private _intervalThreshold?: NodeJS.Timeout;

  constructor(batcherConfig: BatcherConfig) {
    this._batcherConfig = batcherConfig;
    this._cyphernodeClient = new CyphernodeClient(this._batcherConfig);
    this._batcherDB = new BatcherDB(this._batcherConfig);
    this._scheduler = new Scheduler(this._batcherConfig);
    this.startIntervals();
  }

  configureBatcher(batcherConfig: BatcherConfig): void {
    this._batcherConfig = batcherConfig;
    this._batcherDB.configureDB(this._batcherConfig).then(() => {
      this._cyphernodeClient.configureCyphernode(this._batcherConfig);
      this._scheduler.configureScheduler(this._batcherConfig).then(() => {
        this.startIntervals();
      });
    });
  }

  startIntervals(): void {
    if (this._intervalTimeout) {
      clearInterval(this._intervalTimeout);
    }
    this._intervalTimeout = setInterval(
      this._scheduler.timeout,
      this._batcherConfig.BATCH_TIMEOUT_MINUTES * 60000,
      this._scheduler
    );

    if (this._intervalThreshold) {
      clearInterval(this._intervalThreshold);
    }
    this._intervalThreshold = setInterval(
      this._scheduler.checkThreshold,
      this._batcherConfig.CHECK_THRESHOLD_MINUTES * 60000,
      this._scheduler,
      this
    );
  }

  async getBatchDetails(
    getBatchDetailsTO: IReqGetBatchDetails
  ): Promise<IRespGetBatchDetails> {
    logger.info(
      "Batcher.getBatchDetails, batchRequestId: %d",
      getBatchDetailsTO.batchRequestId
    );

    const response: IRespGetBatchDetails = {};

    if (GetBatchDetailsValidator.validateRequest(getBatchDetailsTO)) {
      // Inputs are valid.
      logger.debug("Batcher.getBatchDetails, Inputs are valid.");

      let batch: Batch;
      if (getBatchDetailsTO.batchRequestId) {
        logger.debug(
          "Batcher.getBatchDetails, getting Batch By BatchRequest ID."
        );

        batch = await this._batcherDB.getBatchByRequest(
          getBatchDetailsTO.batchRequestId
        );
      } else {
        logger.debug("Batcher.getBatchDetails, getting Batch By Batch ID.");

        batch = await this._batcherDB.getBatch(
          getBatchDetailsTO.batchId as number
        );
      }

      if (batch) {
        logger.debug("Batcher.getBatchDetails, batch found.");

        if (batch.txid) {
          response.result = { batch };
        } else {
          response.result = {
            batch,
            etaSeconds: this._scheduler.getTimeLeft(),
          };
        }
      } else {
        // Batch not found
        logger.debug("Batcher.getBatchDetails, Batch not found.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "Batch not found",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("Batcher.getBatchDetails, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async queueForNextBatch(
    batchRequestTO: IReqBatchRequest
  ): Promise<IRespBatchRequest> {
    logger.info(
      "Batcher.queueForNextBatch, batchRequestTO: %s",
      batchRequestTO
    );

    const response: IRespBatchRequest = {};

    if (QueueForNextBatchValidator.validateRequest(batchRequestTO)) {
      // Inputs are valid.
      logger.debug("Batcher.queueForNextBatch, inputs are valid");

      // We need to check if the destination address is already queued, because
      // Bitcoin Core's sendmany RPC doesn't support duplicated addresses.

      let currentBatchRequests: BatchRequest[];
      let currentBatchRequestsTotal = 0.0;

      const reqAddToBatch: IReqAddToBatch = Object.assign({}, batchRequestTO);
      reqAddToBatch.outputLabel = batchRequestTO.description;

      if (batchRequestTO.batcherId) {
        currentBatchRequests = await this._batcherDB.getOngoingBatchRequestsByAddressAndBatcherId(
          batchRequestTO.address,
          batchRequestTO.batcherId
        );
      } else if (batchRequestTO.batcherLabel) {
        currentBatchRequests = await this._batcherDB.getOngoingBatchRequestsByAddressAndBatcherLabel(
          batchRequestTO.address,
          batchRequestTO.batcherLabel
        );
      } else {
        currentBatchRequests = await this._batcherDB.getOngoingBatchRequestsByAddressAndBatcherId(
          batchRequestTO.address,
          this._batcherConfig.DEFAULT_BATCHER_ID
        );
      }
      if (currentBatchRequests.length > 0) {
        // There's already an output to this address in ongoing batch, let's merge them!
        logger.debug(
          "Batcher.queueForNextBatch, there's already an output to this address in ongoing batch, let's merge them."
        );

        currentBatchRequests.forEach((currentBatchRequest) => {
          currentBatchRequestsTotal += currentBatchRequest.amount;
        });

        // First, remove the existing output in Cyphernode's batch.
        logger.debug(
          "Batcher.queueForNextBatch, first, remove the existing output in Cyphernode's batch."
        );

        const addToBatchResp = await this._cyphernodeClient.removeFromBatch(
          currentBatchRequests[0].cnOutputId as number
        );
        if (addToBatchResp.result) {
          reqAddToBatch.amount += currentBatchRequestsTotal;
        }
      }

      // Let's now add the new output to the next Cyphernode batch and get the batcher id back.
      logger.debug(
        "Batcher.queueForNextBatch, let's now add the new output to the next Cyphernode batch and get the batcher id back."
      );

      if (reqAddToBatch.webhookUrl) {
        reqAddToBatch.webhookUrl =
          this._batcherConfig.URL_SERVER +
          ":" +
          this._batcherConfig.URL_PORT +
          "/" +
          this._batcherConfig.URL_CTX_WEBHOOKS;
      }

      const addToBatchResp = await this._cyphernodeClient.addToBatch(
        reqAddToBatch
      );

      // Parse Cyphernode response

      if (addToBatchResp?.result?.batcherId) {
        // There is a result, let's create the request row in the database
        logger.debug(
          "Batcher.queueForNextBatch, there is a result from Cyphernode, let's create the request row in the database"
        );

        let batchRequest = new BatchRequest();
        batchRequest.externalId = batchRequestTO.externalId;
        batchRequest.description = batchRequestTO.description;
        batchRequest.address = batchRequestTO.address;
        batchRequest.amount = batchRequestTO.amount;
        batchRequest.cnBatcherId = addToBatchResp.result.batcherId;
        batchRequest.cnBatcherLabel = batchRequestTO.batcherLabel;
        batchRequest.webhookUrl = batchRequestTO.webhookUrl;
        batchRequest.cnOutputId = addToBatchResp.result.outputId;

        if (currentBatchRequests.length > 0) {
          // If there was already this address as output in ongoing batch,
          // we need to save the new outputId received from Cyphernode
          logger.debug(
            "Batcher.queueForNextBatch, if there was already this address as output in ongoing batch, we need to save the new outputId received from Cyphernode."
          );

          batchRequest.mergedOutput = true;
          currentBatchRequests.forEach((currentBatchRequest) => {
            currentBatchRequest.mergedOutput = true;
            currentBatchRequest.cnOutputId = addToBatchResp?.result?.outputId;
            this._batcherDB.saveRequest(currentBatchRequest);
          });
        }

        // Let's see if there's already an ongoing batch.  If not, we create one.
        logger.debug(
          "Batcher.queueForNextBatch, let's see if there's already an ongoing batch.  If not, we create one."
        );

        const batch: Batch = await this.getOngoingBatch(
          addToBatchResp.result.batcherId,
          true
        );

        logger.debug(
          "Batcher.queueForNextBatch, we modify and save the batch request."
        );

        batchRequest.batch = batch;
        batchRequest = await this._batcherDB.saveRequest(batchRequest);

        response.result = {
          batchId: batchRequest.batch.batchId,
          batchRequestId: batchRequest.batchRequestId,
          etaSeconds: this._scheduler.getTimeLeft(),
          cnResult: addToBatchResp.result,
          address: batchRequest.address,
          amount: batchRequest.amount,
        };
      } else if (addToBatchResp.error) {
        // There was an error on Cyphernode end, return that.
        logger.debug(
          "Batcher.queueForNextBatch, there was an error on Cyphernode end, return that."
        );

        response.error = addToBatchResp.error;
      } else {
        // There was an error calling Cyphernode.
        logger.debug(
          "Batcher.queueForNextBatch, there was an error calling Cyphernode."
        );

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "An unknown error occurred",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("Batcher.queueForNextBatch, there is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async getOngoingBatch(batcherId: number, createNew: boolean): Promise<Batch> {
    logger.info("Batcher.getOngoingBatch, batcherId: %d", batcherId);

    // Let's see if there's already an ongoing batch.  If not, we create one.

    let batch: Batch;

    if (!batcherId) {
      batcherId = this._batcherConfig.DEFAULT_BATCHER_ID;
    }
    batch = await this._batcherDB.getOngoingBatchByBatcherId(batcherId);

    logger.debug("Batcher.getOngoingBatch, batch: %s", batch);
    logger.debug("Batcher.getOngoingBatch, createNew: %s", createNew);

    if (batch == null && createNew) {
      batch = new Batch();
      batch.cnBatcherId = batcherId;
      batch = await this._batcherDB.saveBatch(batch);
    }

    return batch;
  }

  async dequeueFromNextBatch(
    batchRequestId: number
  ): Promise<IRespBatchRequest> {
    logger.info(
      "Batcher.dequeueFromNextBatch, batchRequestId: %d",
      batchRequestId
    );

    // First of all, get the request.
    logger.debug("Batcher.dequeueFromNextBatch, first of all, get the request");

    const batchRequest: BatchRequest = await this._batcherDB.getRequest(
      batchRequestId
    );

    const response: IRespBatchRequest = {};

    if (batchRequest?.cnOutputId) {
      logger.debug(
        "Batcher.dequeueFromNextBatch, cnOutputId found, remove it in Cyphernode."
      );

      const removeFromBatchResp: IRespAddToBatch = await this._cyphernodeClient.removeFromBatch(
        batchRequest.cnOutputId
      );

      if (removeFromBatchResp.error) {
        // There was an error on Cyphernode end, return that.
        logger.debug(
          "Batcher.dequeueFromNextBatch, there was an error on Cyphernode end, return that."
        );

        response.error = removeFromBatchResp.error;
      } else if (removeFromBatchResp.result?.batcherId) {
        // Let's remove this batch request from our database
        logger.debug(
          "Batcher.dequeueFromNextBatch, let's remove this batch request from our database."
        );

        response.result = {
          batchId: batchRequest.batch.batchId,
          batchRequestId: batchRequestId,
          etaSeconds: this._scheduler.getTimeLeft(),
          cnResult: removeFromBatchResp.result,
          address: batchRequest.address,
          amount: batchRequest.amount,
        };

        await this._batcherDB.removeRequest(batchRequest);
      } else {
        // There was an error calling Cyphernode.
        logger.debug(
          "Batcher.dequeueFromNextBatch, there was an error calling Cyphernode."
        );

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "An unknown error occurred",
        };
      }
    } else {
      // Batch request not found!
      logger.debug("Batcher.dequeueFromNextBatch, batch request not found.");

      response.error = {
        code: ErrorCodes.InvalidParams,
        message: "Batch request does not exist",
      };
    }
    return response;
  }

  async dequeueAndPay(
    dequeueAndPayReq: IReqDequeueAndPay
  ): Promise<IRespDequeueAndPay> {
    logger.info("Batcher.dequeueAndPay", dequeueAndPayReq);

    const response: IRespDequeueAndPay = {};

    if (DequeueAndPayValidator.validateRequest(dequeueAndPayReq)) {
      const dequeueResp = await this.dequeueFromNextBatch(
        dequeueAndPayReq.batchRequestId
      );

      if (dequeueResp?.error) {
        // Could not dequeue request from batch
        logger.debug(
          "Batcher.dequeueAndPay, could not dequeue request from batch."
        );

        response.error = {
          code: ErrorCodes.InternalError,
          message: "Could not dequeue request from batch",
        };
      } else if (dequeueResp?.result) {
        const address = dequeueAndPayReq.address
          ? dequeueAndPayReq.address
          : dequeueResp.result.address;
        const amount = dequeueAndPayReq.amount
          ? dequeueAndPayReq.amount
          : dequeueResp.result.amount;

        const spendRequestTO: IReqSpend = {
          address,
          amount,
          confTarget: dequeueAndPayReq.confTarget,
          replaceable: dequeueAndPayReq.replaceable,
          subtractfeefromamount: dequeueAndPayReq.subtractfeefromamount,
        };

        const spendResp: IRespSpend = await this._cyphernodeClient.spend(
          spendRequestTO
        );

        if (spendResp?.error) {
          // There was an error on Cyphernode end, return that.
          logger.debug(
            "Batcher.dequeueAndPay: There was an error on Cyphernode end, return that."
          );

          response.error = spendResp.error;
        } else if (spendResp?.result) {
          response.result = {
            batchRequest: dequeueResp.result,
            spendResult: spendResp.result,
          };
        }
      }
    } else {
      // There is an error with inputs
      logger.debug("Batcher.dequeueAndPay: There is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async executeBatch(
    executeBatchReq: IReqExecuteBatch
  ): Promise<IRespExecuteBatch> {
    logger.info("Batcher.executeBatch", executeBatchReq);

    const response: IRespExecuteBatch = {};

    if (ExecuteBatchValidator.validateRequest(executeBatchReq)) {
      // Inputs are valid.
      logger.debug("Batcher.executeBatch: Inputs are valid");

      let batchToSpend: Batch;

      // Get batch
      if (executeBatchReq.batchId) {
        // ...by batch id
        logger.debug("Batcher.executeBatch: by batch id");

        batchToSpend = await this._batcherDB.getBatch(executeBatchReq.batchId);
      } else if (executeBatchReq.batchRequestId) {
        // ...by batch request id
        logger.debug("Batcher.executeBatch: by batch request id");

        batchToSpend = await this._batcherDB.getBatchByRequest(
          executeBatchReq.batchRequestId
        );
      } else {
        // Spend ongoing batch on default batcher
        logger.debug(
          "Batcher.executeBatch: Spend ongoing batch on default batcher"
        );

        batchToSpend = await this._batcherDB.getOngoingBatchByBatcherId(
          this._batcherConfig.DEFAULT_BATCHER_ID
        );
      }

      if (batchToSpend) {
        if (batchToSpend.txid) {
          // Batch already executed!
          logger.debug("Batcher.executeBatch: Batch already executed.");

          response.error = {
            code: ErrorCodes.InvalidRequest,
            message: "Batch already executed",
          };
          return response;
        }
      } else {
        // No ongoing batch!
        logger.debug("Batcher.executeBatch: No ongoing batch.");

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "No ongoing batch",
        };
        return response;
      }

      const batchSpendRequestTO: IReqBatchSpend = {
        batcherId: batchToSpend.cnBatcherId,
        confTarget: executeBatchReq.confTarget,
      };

      const batchSpendResult: IRespBatchSpend = await this._cyphernodeClient.batchSpend(
        batchSpendRequestTO
      );

      if (batchSpendResult?.error) {
        // There was an error on Cyphernode end, return that.
        logger.debug(
          "Batcher.executeBatch: There was an error on Cyphernode end, return that."
        );

        response.error = batchSpendResult.error;
      } else if (batchSpendResult?.result) {
        logger.debug("Batcher.executeBatch: There's a result for batchSpend.");

        batchToSpend.spentDetails = JSON.stringify(batchSpendResult.result);
        batchToSpend.txid = batchSpendResult.result.txid;
        batchToSpend.spentTimestamp = new Date();
        batchToSpend = await this._batcherDB.saveBatch(batchToSpend);

        // Remove the output array, we already have them as batch requests
        batchSpendResult.result.outputs = undefined;

        response.result = {
          batch: batchToSpend,
          cnResult: batchSpendResult.result,
        };
      } else {
        // There was an error calling Cyphernode.
        logger.debug(
          "Batcher.executeBatch: There was an error calling Cyphernode."
        );

        response.error = {
          code: ErrorCodes.InvalidRequest,
          message: "An unknown error occurred",
        };
      }
    } else {
      // There is an error with inputs
      logger.debug("Batcher.executeBatch: There is an error with inputs.");

      response.error = {
        code: ErrorCodes.InvalidRequest,
        message: "Invalid arguments",
      };
    }

    return response;
  }

  async getOngoingBatches(): Promise<Batch[]> {
    return await this._batcherDB.getOngoingBatches();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processWebhooks(webhookBody: any): Promise<IResponseMessage> {
    logger.info("Batcher.processWebhooks: %s", webhookBody);

    const brs = await this._batcherDB.getRequestsByCnOutputId(
      webhookBody.outputId
    );

    const nbRequestsInBatch = await this._batcherDB.getRequestCountByBatchId(
      brs[0].batch.batchId
    );

    let result: IResponseMessage = {} as IResponseMessage;
    let response: IResponseMessage = {} as IResponseMessage;

    brs.forEach(async (br) => {
      if (br.webhookUrl && !br.calledback) {
        const postdata = {
          batchRequestId: br.batchRequestId,
          batchId: br.batch.batchId,
          cnBatcherId: br.batch.cnBatcherId,
          requestCountInBatch: nbRequestsInBatch,
          status: webhookBody.status,
          txid: webhookBody.txid,
          hash: webhookBody.hash,
          details: Object.assign(webhookBody.details, {
            address: br.address,
            amount: br.amount,
          }),
        };
        response = await Utils.post(br.webhookUrl, postdata);
        if (response.result) {
          br.calledback = true;
          br.calledbackTimestamp = new Date();
          this._batcherDB.saveRequest(br);
        } else {
          result = response;
        }
      }
    });
    if (result) {
      return result;
    } else {
      return response;
    }
  }
}

export { Batcher };
