import IReqExecuteBatch from "../types/IReqExecuteBatch";

class ExecuteBatchValidator {
  static validateRequest(request: IReqExecuteBatch): boolean {
    // For now, there's no validation really, if nothing supplied we'll use default batch
    if (request.batchId || request.batchRequestId) {
      return true;
    } else {
      return true;
    }
  }
}

export { ExecuteBatchValidator };
