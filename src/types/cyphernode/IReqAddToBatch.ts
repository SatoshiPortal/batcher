import IBatcherIdent from "./IBatcherIdent";

export default interface IReqAddToBatch extends IBatcherIdent {
  // - address, required, desination address
  // - amount, required, amount to send to the destination address
  // - outputLabel, optional, if you want to reference this output
  // - batcherId, optional, the id of the batcher to which the output will be added, default batcher if not supplied, overrides batcherLabel
  // - batcherLabel, optional, the label of the batcher to which the output will be added, default batcher if not supplied
  // - webhookUrl, optional, the webhook to call when the batch is broadcast

  address: string;
  amount: number;
  outputLabel?: string;
  webhookUrl?: string;
}
