import IReqBatchRequest from "../types/IReqBatchRequest";

class QueueForNextBatchValidator {
  static validateRequest(request: IReqBatchRequest): boolean {
    if (request.address && request.amount) {
      // Make sure there's not more than 8 decimals...
      // This makes sense when dealing with Lightning Network amounts...
      const nbDecimals = ((request.amount + "").split(".")[1] || []).length;
      if (nbDecimals > 8) {
        return false;
      }
      return true;
    } else {
      return false;
    }
  }
}

export { QueueForNextBatchValidator };
