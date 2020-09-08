import IReqDequeueAndPay from "../types/IReqDequeueAndPay";

class DequeueAndPayValidator {
  static validateRequest(request: IReqDequeueAndPay): boolean {
    if (request.batchRequestId) {
      return true;
    } else {
      return false;
    }
  }
}

export { DequeueAndPayValidator };
