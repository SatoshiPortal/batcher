import IBatchDetails from "./IBatchDetails";
import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespBatchSpend {
  result?: IBatchDetails;
  error?: IResponseError<never>;
}
