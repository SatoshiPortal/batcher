import IReqGetBatchDetails from "../types/IReqGetBatchDetails";

class GetBatchDetailsValidator {
  static validateRequest(request: IReqGetBatchDetails): boolean {
    if (request.batchId) {
      return true;
    } else if (request.batchRequestId) {
      return true;
    } else {
      return false;
    }
  }
}

export { GetBatchDetailsValidator };
