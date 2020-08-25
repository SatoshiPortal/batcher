import IBatcher from "./IBatcher";
import IBatchTx from "./IBatchTx";

export default interface IBatchDetails extends IBatcher, IBatchTx {
  //    "batcherId":34,
  //    "batcherLabel":"Special batcher for a special client",
  //    "confTarget":6,
  //    "nbOutputs":83,
  //    "oldest":123123,
  //    "total":10.86990143,
  //    "txid":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
  //    "hash":"af867c86000da76df7ddb1054b273ca9e034e8c89d049b5b2795f9f590f67648",
  //    "details":{
  //      "firstseen":123123,
  //      "size":424,
  //      "vsize":371,
  //      "replaceable":true,
  //      "fee":0.00004112
  //    },
  //    "outputs":[
  //      "1abc":0.12,
  //      "3abc":0.66,
  //      "bc1abc":2.848,
  //      ...
  //    ]
}
