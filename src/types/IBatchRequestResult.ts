import IAddToBatchResult from "./cyphernode/IAddToBatchResult";

export default interface IBatchRequestResult {
  batchRequestId: number;
  batchId: number;
  etaSeconds: number;
  cnResult: IAddToBatchResult;
}
