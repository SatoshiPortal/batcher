import IBatcherIdent from "./IBatcherIdent";
import IOutput from "./IOutput";
import IBatchState from "./IBatchState";

export default interface IAddToBatchResult
  extends IBatcherIdent,
    IOutput,
    IBatchState {
  // - batcherId, the id of the batcher
  // - outputId, the id of the added output
  // - nbOutputs, the number of outputs currently in the batch
  // - oldest, the timestamp of the oldest output in the batch
  // - total, the current sum of the batch's output amounts
}
