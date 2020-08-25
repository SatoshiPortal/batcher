import IBatchDetails from "./cyphernode/IBatchDetails";
import { Batch } from "../entity/Batch";

export default interface IExecuteBatchResult {
  batch: Batch;
  cnResult: IBatchDetails;
}
