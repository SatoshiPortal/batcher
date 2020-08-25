import IBatcherIdent from "./IBatcherIdent";

export default interface IReqGetBatchDetails extends IBatcherIdent {
  // - batcherId, optional, id of the batcher, overrides batcherLabel, default batcher will be spent if not supplied
  // - batcherLabel, optional, label of the batcher, default batcher will be used if not supplied
  // - txid, optional, if you want the details of an executed batch, supply the batch txid, will return current pending batch
  //     if not supplied

  txid?: string;
}
