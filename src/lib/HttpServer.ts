// lib/HttpServer.ts
import express from "express";
import logger from "./Log2File";
import AsyncLock from "async-lock";
import BatcherConfig from "../config/BatcherConfig";
import fs from "fs";
import { Batcher } from "./Batcher";
import IReqBatchRequest from "../types/IReqBatchRequest";
import {
  IResponseMessage,
  ErrorCodes,
} from "../types/jsonrpc/IResponseMessage";
import { IRequestMessage } from "../types/jsonrpc/IRequestMessage";
import IRespBatchRequest from "../types/IRespBatchRequest";
import IRespGetBatchDetails from "../types/IRespGetBatchDetails";
import IReqGetBatchDetails from "../types/IReqGetBatchDetails";
import IReqExecuteBatch from "../types/IReqExecuteBatch";
import IRespExecuteBatch from "../types/IRespExecuteBatch";
import { Batch } from "../entity/Batch";
import IRespDequeueAndPay from "../types/IRespDequeueAndPay";
import IReqDequeueAndPay from "../types/IReqDequeueAndPay";

class HttpServer {
  // Create a new express application instance
  private readonly _httpServer: express.Application = express();
  private readonly _lock = new AsyncLock();
  private _batcherConfig: BatcherConfig = JSON.parse(
    fs.readFileSync("data/config.json", "utf8")
  );
  private _batcher: Batcher = new Batcher(this._batcherConfig);

  setup(): void {
    logger.debug("setup");
    this._httpServer.use(express.json());
  }

  async loadConfig(): Promise<void> {
    logger.debug("loadConfig");

    this._batcherConfig = JSON.parse(
      fs.readFileSync("data/config.json", "utf8")
    );

    this._batcher.configureBatcher(this._batcherConfig);
  }

  async queueForNextBatch(
    params: object | undefined
  ): Promise<IRespBatchRequest> {
    logger.debug("/queueForNextBatch params:", params);

    // - address, required, desination address
    // - amount, required, amount to send to the destination address
    // - batcherId, optional, the id of the batcher to which the output will be added, default batcher if not supplied, overrides batcherLabel
    // - batcherLabel, optional, the label of the batcher to which the output will be added, default batcher if not supplied
    // - webhookUrl, optional, the webhook to call when the batch is broadcast

    const reqBatchRequest: IReqBatchRequest = params as IReqBatchRequest;
    logger.debug("reqBatchRequest:", reqBatchRequest);

    // Convert address to lowercase only if bech32
    const lowercased = reqBatchRequest.address.toLowerCase();
    if (
      lowercased.startsWith("bc") ||
      lowercased.startsWith("tb") ||
      lowercased.startsWith("bcrt")
    ) {
      reqBatchRequest.address = lowercased;
    }

    return await this._batcher.queueForNextBatch(reqBatchRequest);
  }

  async dequeueFromNextBatch(
    params: object | undefined
  ): Promise<IRespBatchRequest> {
    logger.debug("/dequeueFromNextBatch params:", params);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchRequestId = parseInt((params as any).batchRequestId);
    logger.debug("batchRequestId:", batchRequestId);

    return await this._batcher.dequeueFromNextBatch(batchRequestId);
  }

  async dequeueAndPay(params: object | undefined): Promise<IRespDequeueAndPay> {
    logger.debug("/dequeueAndPay params:", params);

    const reqDequeueAndPay: IReqDequeueAndPay = params as IReqDequeueAndPay;
    logger.debug("reqDequeueAndPay:", reqDequeueAndPay);

    // Convert address to lowercase only if bech32
    if (reqDequeueAndPay.address) {
      const lowercased = reqDequeueAndPay.address.toLowerCase();
      if (
        lowercased.startsWith("bc") ||
        lowercased.startsWith("tb") ||
        lowercased.startsWith("bcrt")
      ) {
        reqDequeueAndPay.address = lowercased;
      }
    }

    return await this._batcher.dequeueAndPay(reqDequeueAndPay);
  }

  async getBatchDetails(
    params: object | undefined
  ): Promise<IRespGetBatchDetails> {
    logger.debug("/getBatchDetails params:", params);

    const reqGetBatchDetails: IReqGetBatchDetails = params as IReqGetBatchDetails;

    return await this._batcher.getBatchDetails(reqGetBatchDetails);
  }

  async executeBatch(params: object | undefined): Promise<IRespExecuteBatch> {
    logger.debug("/executeBatch params:", params);

    // - batcherId, optional, id of the batcher to execute, overrides batcherLabel, default batcher will be spent if not supplied
    // - batcherLabel, optional, label of the batcher to execute, default batcher will be executed if not supplied
    // - confTarget, optional, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core conf_target will be used if not supplied

    const reqExecuteBatch: IReqExecuteBatch = params as IReqExecuteBatch;

    return await this._batcher.executeBatch(reqExecuteBatch);
  }

  async getOngoingBatches(): Promise<Batch[]> {
    logger.debug("/getOngoingBatches");

    return await this._batcher.getOngoingBatches();
  }

  async start(): Promise<void> {
    logger.info("Starting incredible service");

    this.setup();

    this._httpServer.post("/api", async (req, res) => {
      logger.debug("/api");

      const reqMessage: IRequestMessage = req.body;
      logger.debug("reqMessage.method:", reqMessage.method);
      logger.debug("reqMessage.params:", reqMessage.params);

      const response: IResponseMessage = {
        id: reqMessage.id,
      } as IResponseMessage;

      // Check the method and call the corresponding function
      switch (reqMessage.method) {
        case "queueForNextBatch": {
          let result: IRespBatchRequest = {};

          result = await this._lock.acquire(
            "batchModif",
            async (): Promise<IRespBatchRequest> => {
              logger.debug("acquired lock batchModif in queueForNextBatch");
              return await this.queueForNextBatch(reqMessage.params || {});
            }
          );
          logger.debug("released lock batchModif in queueForNextBatch");

          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "dequeueFromNextBatch": {
          let result: IRespBatchRequest = {};

          result = await this._lock.acquire(
            "batchModif",
            async (): Promise<IRespBatchRequest> => {
              logger.debug("acquired lock batchModif in dequeueFromNextBatch");
              return await this.dequeueFromNextBatch(reqMessage.params || {});
            }
          );
          logger.debug("released lock batchModif in dequeueFromNextBatch");

          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "dequeueAndPay": {
          let result: IRespDequeueAndPay = {};

          result = await this._lock.acquire(
            "batchModif",
            async (): Promise<IRespDequeueAndPay> => {
              logger.debug("acquired lock batchModif in dequeueAndPay");
              return await this.dequeueAndPay(reqMessage.params || {});
            }
          );
          logger.debug("released lock batchModif in dequeueAndPay");

          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "getBatchDetails": {
          const result: IRespGetBatchDetails = await this.getBatchDetails(
            reqMessage.params || {}
          );
          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "executeBatch": {
          let result: IRespExecuteBatch = {};

          result = await this._lock.acquire(
            "batchModif",
            async (): Promise<IRespExecuteBatch> => {
              logger.debug("acquired lock batchModif in executeBatch");
              return await this.executeBatch(reqMessage.params || {});
            }
          );
          logger.debug("released lock batchModif in executeBatch");

          response.result = result.result;
          response.error = result.error;
          break;
        }

        case "getOngoingBatches": {
          const result: Batch[] = await this.getOngoingBatches();
          response.result = result;
          break;
        }

        case "reloadConfig":
          await this.loadConfig();

        // eslint-disable-next-line no-fallthrough
        case "getConfig":
          response.result = this._batcherConfig;
          break;

        default:
          response.error = {
            code: ErrorCodes.MethodNotFound,
            message: "No such method!",
          };
          break;
      }

      if (response.error) {
        response.error.data = reqMessage.params as never;
        res.status(400).json(response);
      } else {
        res.status(200).json(response);
      }
    });

    this._httpServer.post(
      "/" + this._batcherConfig.URL_CTX_WEBHOOKS,
      async (req, res) => {
        logger.info(
          "/" + this._batcherConfig.URL_CTX_WEBHOOKS + ":",
          req.body
        );

        const response = await this._batcher.processWebhooks(req.body);

        if (response.error) {
          res.status(400).json(response);
        } else {
          res.status(200).json(response);
        }
      }
    );

    this._httpServer.listen(this._batcherConfig.URL_PORT, () => {
      logger.info(
        "Express HTTP server listening on port",
        this._batcherConfig.URL_PORT
      );
    });
  }
}

export { HttpServer };
