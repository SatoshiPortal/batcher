import IBatchRequestResult from "./IBatchRequestResult";
import ITx from "./cyphernode/ITx";
import { IResponseError } from "./jsonrpc/IResponseMessage";

export default interface IDequeueAndPayResult {
  dequeueResult: IBatchRequestResult;
  spendResult: { result?: ITx; error?: IResponseError<never> };
}
