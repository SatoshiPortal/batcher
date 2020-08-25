import { IResponseError } from "../jsonrpc/IResponseMessage";
import IAddToBatchResult from "./IAddToBatchResult";

export default interface IRespAddToBatch {
  result?: IAddToBatchResult;
  error?: IResponseError<never>;
}
