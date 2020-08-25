import IBatcher from "./IBatcher";
import { IResponseError } from "../jsonrpc/IResponseMessage";

export default interface IRespGetBatcher {
  result?: IBatcher;
  error?: IResponseError<never>;
}
