import { IResponseError } from "./jsonrpc/IResponseMessage";
// import IGetBatchDetailsResult from "./IGetBatchDetailsResult";
// import { Batch } from "../entity/Batch";
import IGetBatchDetailsResult from "./IGetBatchDetailsResult";

export default interface IRespGetBatchDetails {
  result?: IGetBatchDetailsResult;
  // result?: Batch;
  error?: IResponseError<never>;
}
