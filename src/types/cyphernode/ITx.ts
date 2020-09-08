export default interface ITx {
  txid?: string;
  hash?: string;
  details?: {
    address: string;
    amount: number;
    firstseen: Date;
    size: number;
    vsize: number;
    replaceable: boolean;
    fee: number;
    subtractfeefromamount: boolean;
  };
}
