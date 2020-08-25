import IBatcherIdent from "./IBatcherIdent";

export default interface IReqBatchSpend extends IBatcherIdent {
  // - batcherId, optional, id of the batcher to execute, overrides batcherLabel, default batcher will be spent if not supplied
  // - batcherLabel, optional, label of the batcher to execute, default batcher will be executed if not supplied
  // - confTarget, optional, overrides default value of createbatcher, default to value of createbatcher, default Bitcoin Core conf_target will be used if not supplied

  confTarget?: number;
}
