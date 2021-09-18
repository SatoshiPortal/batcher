import logger from "./Log2File";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

class Utils {
  static async post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info("Utils.post", url, JSON.stringify(postdata), addedOptions);

    let configs: AxiosRequestConfig = {
      baseURL: url,
      method: "post",
      data: postdata,
    };
    if (addedOptions) {
      configs = Object.assign(configs, addedOptions);
    }

    try {
      const response = await axios.request(configs);
      logger.debug(
        "Utils.post :: response.data =",
        JSON.stringify(response.data)
      );

      return { status: response.status, data: response.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error: AxiosError = err;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.info(
            "Utils.post :: error.response.data =",
            JSON.stringify(error.response.data)
          );
          logger.info(
            "Utils.post :: error.response.status =",
            error.response.status
          );
          logger.info(
            "Utils.post :: error.response.headers =",
            error.response.headers
          );

          return { status: error.response.status, data: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info("Utils.post :: error.message =", error.message);

          return { status: -1, data: error.message };
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("Utils.post :: Error:", error.message);

          return { status: -2, data: error.message };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: -2, data: (err as any).message };
      }
    }
  }
}

export { Utils };
