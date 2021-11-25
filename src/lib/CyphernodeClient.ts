import logger from "./Log2File";
import crypto from "crypto";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import https from "https";
import path from "path";
import fs from "fs";
import BatcherConfig from "../config/BatcherConfig";
import IRespGetBatchDetails from "../types/cyphernode/IRespGetBatchDetails";
import IRespAddToBatch from "../types/cyphernode/IRespAddToBatch";
import IReqBatchSpend from "../types/cyphernode/IReqBatchSpend";
import IReqGetBatchDetails from "../types/cyphernode/IReqGetBatchDetails";
import IRespBatchSpend from "../types/cyphernode/IRespBatchSpend";
import IReqAddToBatch from "../types/cyphernode/IReqAddToBatch";
import { IResponseError, ErrorCodes } from "../types/jsonrpc/IResponseMessage";
import IReqSpend from "../types/cyphernode/IReqSpend";
import IRespSpend from "../types/cyphernode/IRespSpend";

class CyphernodeClient {
  private baseURL: string;
  // echo -n '{"alg":"HS256","typ":"JWT"}' | basenc --base64url | tr -d '='
  private readonly h64: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
  private apiId: string;
  private apiKey: string;
  private caFile: string;

  constructor(batcherConfig: BatcherConfig) {
    this.baseURL = batcherConfig.CN_URL;
    this.apiId = batcherConfig.CN_API_ID;
    this.apiKey = batcherConfig.CN_API_KEY;
    this.caFile = path.resolve(batcherConfig.BASE_DIR, "cert.pem");
  }

  configureCyphernode(batcherConfig: BatcherConfig): void {
    this.baseURL = batcherConfig.CN_URL;
    this.apiId = batcherConfig.CN_API_ID;
    this.apiKey = batcherConfig.CN_API_KEY;
    this.caFile = path.resolve(batcherConfig.BASE_DIR, "cert.pem");
  }

  _generateToken(): string {
    logger.info("CyphernodeClient._generateToken");

    const current = Math.round(new Date().getTime() / 1000) + 10;
    const p = '{"id":"' + this.apiId + '","exp":' + current + "}";
    const re1 = /\+/g;
    const re2 = /\//g;
    const p64 = Buffer.from(p)
      .toString("base64")
      .replace(re1, "-")
      .replace(re2, "_")
      .split("=")[0];
    const msg = this.h64 + "." + p64;
    const s = crypto
      .createHmac("sha256", this.apiKey)
      .update(msg)
      .digest("base64")
      .replace(re1, "-")
      .replace(re2, "_")
      .split("=")[0];
    const token = msg + "." + s;

    logger.debug("CyphernodeClient._generateToken :: token=" + token);

    return token;
  }

  async _post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info("CyphernodeClient._post:", url, postdata, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "post",
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        Authorization: "Bearer " + this._generateToken(),
      },
      data: postdata,
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.caFile),
        // rejectUnauthorized: false,
      }),
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    // logger.debug(
    //   "CyphernodeClient._post :: configs: %s",
    //   JSON.stringify(configs)
    // );

    try {
      const response = await axios.request(configs);
      logger.debug("CyphernodeClient._post :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "CyphernodeClient._post :: error.response.data:",
            error.response.data
          );
          logger.info(
            "CyphernodeClient._post :: error.response.status:",
            error.response.status
          );
          logger.info(
            "CyphernodeClient._post :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info(
            "CyphernodeClient._post :: error.message:",
            error.message
          );

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("CyphernodeClient._post :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _get(url: string, addedOptions?: unknown): Promise<any> {
    logger.info("CyphernodeClient._get:", url, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "get",
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        Authorization: "Bearer " + this._generateToken(),
      },
      httpsAgent: new https.Agent({
        ca: fs.readFileSync(this.caFile),
        // rejectUnauthorized: false,
      }),
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug("CyphernodeClient._get :: response.data:", response.data);

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "CyphernodeClient._get :: error.response.data:",
            error.response.data
          );
          logger.info(
            "CyphernodeClient._get :: error.response.status:",
            error.response.status
          );
          logger.info(
            "CyphernodeClient._get :: error.response.headers:",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("CyphernodeClient._get :: error.message:", error.message);

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("CyphernodeClient._get :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }

  async addToBatch(batchRequestTO: IReqAddToBatch): Promise<IRespAddToBatch> {
    // POST http://192.168.111.152:8080/addtobatch

    // args:
    // - address, required, desination address
    // - amount, required, amount to send to the destination address
    // - batchId, optional, the id of the batch to which the output will be added, default batch if not supplied, overrides batchLabel
    // - batchLabel, optional, the label of the batch to which the output will be added, default batch if not supplied
    // - webhookUrl, optional, the webhook to call when the batch is broadcast

    // response:
    // - batcherId, the id of the batcher
    // - outputId, the id of the added output
    // - nbOutputs, the number of outputs currently in the batch
    // - oldest, the timestamp of the oldest output in the batch
    // - total, the current sum of the batch's output amounts

    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchId":34,"webhookUrl":"https://myCypherApp:3000/batchExecuted"}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchLabel":"lowfees","webhookUrl":"https://myCypherApp:3000/batchExecuted"}
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"batchId":34,"webhookUrl":"https://myCypherApp:3000/batchExecuted"}

    logger.info("CyphernodeClient.addToBatch:", batchRequestTO);

    let result: IRespAddToBatch;
    const response = await this._post("/addtobatch", batchRequestTO);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async removeFromBatch(outputId: number): Promise<IRespAddToBatch> {
    // POST http://192.168.111.152:8080/removefrombatch
    //
    // args:
    // - outputId, required, id of the output to remove
    //
    // response:
    // - batcherId, the id of the batcher
    // - outputId, the id of the removed output if found
    // - nbOutputs, the number of outputs currently in the batch
    // - oldest, the timestamp of the oldest output in the batch
    // - total, the current sum of the batch's output amounts
    //
    // BODY {"id":72}

    logger.info("CyphernodeClient.removeFromBatch:", outputId);

    let result: IRespAddToBatch;
    const response = await this._post("/removefrombatch", {
      outputId,
    });

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async getBatchDetails(
    batchIdent: IReqGetBatchDetails
  ): Promise<IRespGetBatchDetails> {
    // POST (GET) http://192.168.111.152:8080/getbatchdetails
    //
    // args:
    // - batcherId, optional, id of the batcher, overrides batcherLabel, default batcher will be spent if not supplied
    // - batcherLabel, optional, label of the batcher, default batcher will be used if not supplied
    // - txid, optional, if you want the details of an executed batch, supply the batch txid, will return current pending batch
    //     if not supplied
    //
    // response:
    // {"result":{
    //    "batcherId":34,
    //    "batcherLabel":"Special batcher for a special client",
    //    "confTarget":6,
    //    "nbOutputs":83,
    //    "oldest":123123,
    //    "total":10.86990143,
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112
    //    },
    //    "outputs":[
    //      "1abc":0.12,
    //      "3abc":0.66,
    //      "bc1abc":2.848,
    //      ...
    //    ]
    //  }
    // },"error":null}
    //
    // BODY {}
    // BODY {"batcherId":34}

    logger.info("CyphernodeClient.getBatchDetails:", batchIdent);

    let result: IRespGetBatchDetails;
    const response = await this._post("/getbatchdetails", batchIdent);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async batchSpend(batchSpendTO: IReqBatchSpend): Promise<IRespBatchSpend> {
    // POST http://192.168.111.152:8080/batchspend
    //
    // args:
    // - batcherId, optional, id of the batcher to execute, overrides batcherLabel, default batcher will be spent if not supplied
    // - batcherLabel, optional, label of the batcher to execute, default batcher will be executed if not supplied
    // - confTarget, optional, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core conf_target will be used if not supplied
    // NOTYET - feeRate, optional, overrides confTarget if supplied, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core value will be used if not supplied
    //
    // response:
    // - txid, the transaction txid
    // - hash, the transaction hash
    // - nbOutputs, the number of outputs spent in the batch
    // - oldest, the timestamp of the oldest output in the spent batch
    // - total, the sum of the spent batch's output amounts
    // - tx details: size, vsize, replaceable, fee
    // - outputs
    //
    // {"result":{
    //    "batcherId":34,
    //    "batcherLabel":"Special batcher for a special client",
    //    "confTarget":6,
    //    "nbOutputs":83,
    //    "oldest":123123,
    //    "total":10.86990143,
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112
    //    },
    //    "outputs":{
    //      "1abc":0.12,
    //      "3abc":0.66,
    //      "bc1abc":2.848,
    //      ...
    //    }
    //  }
    // },"error":null}
    //
    // BODY {}
    // BODY {"batcherId":34,"confTarget":12}
    // NOTYET BODY {"batcherLabel":"highfees","feeRate":233.7}
    // BODY {"batcherId":411,"confTarget":6}

    logger.info("CyphernodeClient.batchSpend:", batchSpendTO);

    let result: IRespBatchSpend;
    const response = await this._post("/batchspend", batchSpendTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        error: {
          code: response.data.error.code,
          message: response.data.error.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }

  async spend(spendTO: IReqSpend): Promise<IRespSpend> {
    // POST http://192.168.111.152:8080/spend
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"confTarget":6,"replaceable":true,"subtractfeefromamount":false}

    // args:
    // - address, required, desination address
    // - amount, required, amount to send to the destination address
    // - confTarget, optional, overrides default value, default Bitcoin Core conf_target will be used if not supplied
    // - replaceable, optional, overrides default value, default Bitcoin Core walletrbf will be used if not supplied
    // - subtractfeefromamount, optional, if true will subtract fee from the amount sent instead of adding to it
    //
    // response:
    // - txid, the transaction txid
    // - hash, the transaction hash
    // - tx details: address, aount, firstseen, size, vsize, replaceable, fee, subtractfeefromamount
    //
    // {"result":{
    //    "status":"accepted",
    //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
    //    "details":{
    //      "address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp",
    //      "amount":0.00233,
    //      "firstseen":123123,
    //      "size":424,
    //      "vsize":371,
    //      "replaceable":true,
    //      "fee":0.00004112,
    //      "subtractfeefromamount":true
    //    }
    //  }
    // },"error":null}
    //
    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233}

    logger.info("CyphernodeClient.spend:", spendTO);

    let result: IRespSpend;
    const response = await this._post("/spend", spendTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data };
    } else {
      result = {
        error: {
          code: ErrorCodes.InternalError,
          message: response.data.message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as IResponseError<any>,
      } as IRespSpend;
    }
    return result;
  }
}

export { CyphernodeClient };
