export default interface IBatchTx {
  txid?: string;
  hash?: string;
  details?: {
    firstseen: Date;
    size: number;
    vsize: number;
    replaceable: boolean;
    fee: number;
  };
  outputs?: [];
}
