import IBatchRequestResult from "./IBatchRequestResult";
import ITx from "./cyphernode/ITx";

export default interface IDequeueAndPayResult {
  batchRequest: IBatchRequestResult;
  spendResult: ITx;
}
