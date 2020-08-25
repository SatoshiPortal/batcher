import IBatchDetails from "./IBatchDetails";
import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespGetBatchDetails {
  result?: IBatchDetails;
  error?: IResponseError<never>;
}
