import IMessage from "./IMessage";

export interface IResponseMessage extends IMessage {
  /**
   * The request id.
   */
  id: number | string | null;

  /**
   * The result of a request. This member is REQUIRED on success.
   * This member MUST NOT exist if there was an error invoking the method.
   */
  result?: string | number | boolean | object | null;

  /**
   * The error object in case a request fails.
   */
  error?: IResponseError<never>;
}

export interface IResponseError<D> {
  /**
   * A number indicating the error type that occurred.
   */
  code: number;

  /**
   * A string providing a short description of the error.
   */
  message: string;

  /**
   * A Primitive or Structured value that contains additional
   * information about the error. Can be omitted.
   */
  data?: D;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ErrorCodes {
  // Defined by JSON RPC
  export const ParseError = -32700;
  export const InvalidRequest = -32600;
  export const MethodNotFound = -32601;
  export const InvalidParams = -32602;
  export const InternalError = -32603;
  export const serverErrorStart = -32099;
  export const serverErrorEnd = -32000;
  export const ServerNotInitialized = -32002;
  export const UnknownErrorCode = -32001;

  // Defined by the protocol.
  export const RequestCancelled = -32800;
  export const ContentModified = -32801;
}
