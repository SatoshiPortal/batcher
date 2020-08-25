import logger from "./logger";
import crypto from "crypto";
import axios, { AxiosRequestConfig } from "axios";
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
import { IResponseError } from "../types/jsonrpc/IResponseMessage";

class CyphernodeClient {
  private baseURL: string;
  private readonly h64: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9Cg==";
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
    const p64 = Buffer.from(p).toString("base64");
    const msg = this.h64 + "." + p64;
    const s = crypto
      .createHmac("sha256", this.apiKey)
      .update(msg)
      .digest("hex");
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
    logger.info("CyphernodeClient._post %s %s %s", url, postdata, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "post",
      baseURL: this.baseURL,
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
      logger.debug("response.data = %s", response.data);

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.info("error.response.data = %s", error.response.data);
        logger.info("error.response.status = %d", error.response.status);
        logger.info("error.response.headers = %s", error.response.headers);

        return { status: error.response.status, data: error.response.data };
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.info("error.message = %s", error.message);

        return { status: -1, data: error.message };
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.info("Error: %s", error.message);

        return { status: -2, data: error.message };
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _get(url: string, addedOptions?: unknown): Promise<any> {
    logger.info("CyphernodeClient._get %s %s", url, addedOptions);

    let configs: AxiosRequestConfig = {
      url: url,
      method: "get",
      baseURL: this.baseURL,
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
      logger.debug("response.data = %s", response.data);

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.info("error.response.data = %s", error.response.data);
        logger.info("error.response.status = %d", error.response.status);
        logger.info("error.response.headers = %s", error.response.headers);

        return { status: error.response.status, data: error.response.data };
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.info("error.message = %s", error.message);

        return { status: -1, data: error.message };
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.info("Error: %s", error.message);

        return { status: -2, data: error.message };
      }
    }
  }

  async watch(
    btcaddr: string,
    cb0conf: string,
    cb1conf: string
  ): Promise<unknown> {
    logger.info(
      "CyphernodeClient.watch: %s, %s, %s",
      btcaddr,
      cb0conf,
      cb1conf
    );

    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","unconfirmedCallbackURL":"192.168.122.233:1111/callback0conf","confirmedCallbackURL":"192.168.122.233:1111/callback1conf"}
    const data = {
      address: btcaddr,
      unconfirmedCallbackURL: cb0conf,
      confirmedCallbackURL: cb1conf,
    };
    return await this._post("/watch", data);
  }

  async unwatch(btcaddr: string): Promise<unknown> {
    logger.info("CyphernodeClient.unwatch: %s", btcaddr);

    // 192.168.122.152:8080/unwatch/2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp
    return await this._get("/unwatch/" + btcaddr);
  }

  async getActiveWatches(): Promise<unknown> {
    logger.info("CyphernodeClient.getActiveWatches");

    // 192.168.122.152:8080/getactivewatches
    return await this._get("/getactivewatches");
  }

  async getTransaction(txid: string): Promise<unknown> {
    logger.info("CyphernodeClient.getTransaction: %s", txid);

    // http://192.168.122.152:8080/gettransaction/af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648
    return await this._get("/gettransaction/" + txid);
  }

  async getElementsTransaction(txid: string): Promise<unknown> {
    logger.info("CyphernodeClient.getElementsTransactionSync: %s", txid);

    // http://192.168.122.152:8080/elements_gettransaction/af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648
    return await this._get("/elements_gettransaction/" + txid);
  }

  async spend(
    btcaddr: string,
    amnt: number,
    confTarget: number
  ): Promise<unknown> {
    logger.info(
      "CyphernodeClient.spend: %s, %f, %d",
      btcaddr,
      amnt,
      confTarget
    );

    // BODY {"address":"2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp","amount":0.00233,"confTarget":4}
    const data = { address: btcaddr, amount: amnt, confTarget: confTarget };
    return await this._post("/spend", data);
  }

  async elementsSpend(
    addr: string,
    amnt: number,
    confTarget: number,
    assetId: string
  ): Promise<unknown> {
    logger.info(
      "CyphernodeClient.elementsSpend: %s, %f, %d, %s",
      addr,
      amnt,
      confTarget,
      assetId
    );

    // BODY {"address":"AzpmavTHCTfJhUqoS28kg3aTmCzu9uqCdfkqmpCALetAoa3ERpZnHvhNzjMP3wo4XitKEMm62mjFk7B9","amount":0.00233,"confTarget":4,"assetId":"b2e15d0d7a0c94e4e2ce0fe6e8691b9e451377f6e46e8045a86f7c4b5d4f0f23"}
    const data = {
      address: addr,
      amount: amnt,
      confTarget: confTarget,
      assetId: assetId,
    };
    return await this._post("/elements_spend", data);
  }

  async getBalance(): Promise<unknown> {
    logger.info("CyphernodeClient.getBalance");

    // http://192.168.122.152:8080/getbalance
    return await this._get("/getbalance");
  }

  async getNewAddress(): Promise<unknown> {
    logger.info("CyphernodeClient.getNewAddress");

    // http://192.168.122.152:8080/getnewaddress
    return await this._get("/getnewaddress");
  }

  async getWasabiNewAddress(label: string): Promise<unknown> {
    logger.info("CyphernodeClient.wasabiGetNewAddress");

    // POST https://cyphernode/wasabi_getnewaddress
    // BODY {"label":"Pay #12 for 2018"}
    const data = { label };
    return await this._post("/wasabi_getnewaddress", data);
  }

  async otsStamp(hash: string, callbackUrl: string): Promise<unknown> {
    logger.info("CyphernodeClient.ots_stamp: %s, %s", hash, callbackUrl);

    // POST https://cyphernode/ots_stamp
    // BODY {"hash":"1ddfb769eb0b8876bc570e25580e6a53afcf973362ee1ee4b54a807da2e5eed7","callbackUrl":"192.168.111.233:1111/callbackUrl"}
    const data = { hash: hash, callbackUrl: callbackUrl };
    return await this._post("/ots_stamp", data);
  }

  async otsGetfile(hash: string): Promise<unknown> {
    logger.info("CyphernodeClient.ots_getfile: %s", hash);

    // http://192.168.122.152:8080/ots_getfile/1ddfb769eb0b8876bc570e25580e6a53afcf973362ee1ee4b54a807da2e5eed7

    // encoding: null is for HTTP get to not convert the binary data to the default encoding
    return await this._get("/ots_getfile/" + hash, { encoding: null });
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

    logger.info("CyphernodeClient.addToBatch: %s", batchRequestTO);

    let result: IRespAddToBatch;
    const response = await this._post("/addtobatch", batchRequestTO);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: { message: response.data } as IResponseError<any>,
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

    logger.info("CyphernodeClient.removeFromBatch: %d", outputId);

    let result: IRespAddToBatch;
    const response = await this._post("/removefrombatch", {
      outputId,
    });

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: { message: response.data } as IResponseError<any>,
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

    logger.info("CyphernodeClient.getBatchDetails: %s", batchIdent);

    let result: IRespGetBatchDetails;
    const response = await this._post("/getbatchdetails", batchIdent);

    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: { message: response.data } as IResponseError<any>,
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

    logger.info("CyphernodeClient.batchSpend: %s", batchSpendTO);

    let result: IRespBatchSpend;
    const response = await this._post("/batchspend", batchSpendTO);
    if (response.status >= 200 && response.status < 400) {
      result = { result: response.data.result };
    } else {
      result = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: { message: response.data } as IResponseError<any>,
      } as IRespBatchSpend;
    }
    return result;
  }
}

export { CyphernodeClient };
