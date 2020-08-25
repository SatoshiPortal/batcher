import { IResponseError } from "./jsonrpc/IResponseMessage";
import IExecuteBatchResult from "./IExecuteBatchResult";

export default interface IRespExecuteBatch {
  result?: IExecuteBatchResult;
  error?: IResponseError<never>;
}
