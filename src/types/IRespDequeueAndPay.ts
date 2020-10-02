import { IResponseError } from "./jsonrpc/IResponseMessage";
import IDequeueAndPayResult from "./IDequeueAndPayResult";

export default interface IRespDequeueAndPay {
  result?: IDequeueAndPayResult;
  error?: IResponseError<never>;
}
