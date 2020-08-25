import IBatcherIdent from "./IBatcherIdent";
import IBatchState from "./IBatchState";

export default interface IBatcher extends IBatcherIdent, IBatchState {
  // "batcherId":1,
  // "batcherLabel":"default",
  // "confTarget":6,
  // "nbOutputs":12,
  // "oldest":123123,
  // "total":0.86990143

  confTarget?: number;
}
