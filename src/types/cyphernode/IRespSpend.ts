import { IResponseError } from "../jsonrpc/IResponseMessage";
import ITx from "./ITx";

export default interface IRespSpend {
  result?: ITx;
  error?: IResponseError<never>;
}
