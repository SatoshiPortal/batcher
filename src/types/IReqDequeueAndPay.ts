export default interface IReqDequeueAndPay {
  batchRequestId: number;
  address?: string;
  amount?: number;
  confTarget?: number;
  replaceable?: boolean;
  subtractfeefromamount?: boolean;
}
