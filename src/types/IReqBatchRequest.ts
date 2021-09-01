import IBatcherIdent from "./cyphernode/IBatcherIdent";

export default interface IReqBatchRequest extends IBatcherIdent {
  externalId?: string;
  description?: string;
  address: string;
  amount: number;
  webhookUrl?: string;
}
