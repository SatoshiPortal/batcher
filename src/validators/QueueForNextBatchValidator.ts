import IReqBatchRequest from "../types/IReqBatchRequest";

class QueueForNextBatchValidator {
  static validateRequest(request: IReqBatchRequest): boolean {
    if (request.address && request.amount) {
      return true;
    } else {
      return false;
    }
  }
}

export { QueueForNextBatchValidator };
