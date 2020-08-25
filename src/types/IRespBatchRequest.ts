import IBatchRequestResult from "./IBatchRequestResult";
import { IResponseError } from "./jsonrpc/IResponseMessage";

export default interface IRespBatchRequest {
  result?: IBatchRequestResult;
  error?: IResponseError<never>;
}
