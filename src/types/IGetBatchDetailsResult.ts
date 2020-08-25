import { Batch } from "../entity/Batch";

export default interface IGetBatchDetailsResult {
  batch: Batch;
  etaSeconds?: number;
}
