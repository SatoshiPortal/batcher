import IReqExecuteBatch from "../types/IReqExecuteBatch";

class ExecuteBatchValidator {
  static validateRequest(request: IReqExecuteBatch): boolean {
    if (request.batchId || request.batchRequestId) {
      return true;
    } else {
      return true;
    }
  }
}

export { ExecuteBatchValidator };
