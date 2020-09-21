import IReqGetBatchDetails from "../types/IReqGetBatchDetails";

class GetBatchDetailsValidator {
  static validateRequest(request: IReqGetBatchDetails): boolean {
    // For now, there's no validation really, if nothing supplied we'll use the ongoing batch on the default batcher
    if (request.batchId) {
      return true;
    } else if (request.batchRequestId) {
      return true;
    } else {
      return true;
    }
  }
}

export { GetBatchDetailsValidator };
