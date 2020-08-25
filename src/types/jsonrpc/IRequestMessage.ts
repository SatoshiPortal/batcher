import IMessage from "./IMessage";

export interface IRequestMessage extends IMessage {
  /**
   * The request id.
   */
  id: number | string;

  /**
   * The method to be invoked.
   */
  method: string;

  /**
   * The method's params.
   */
  params?: Array<never> | object;
}
