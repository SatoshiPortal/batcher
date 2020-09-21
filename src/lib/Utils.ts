import logger from "./logger";
import axios, { AxiosRequestConfig } from "axios";

class Utils {
  static async post(
    url: string,
    postdata: unknown,
    addedOptions?: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    logger.info(
      "Utils._post %s %s %s",
      url,
      JSON.stringify(postdata),
      addedOptions
    );

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
      logger.debug("response.data = %s", JSON.stringify(response.data));

      return { status: response.status, data: response.data };
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.info("error.response.data = %s", error.response.data);
        logger.info("error.response.status = %d", error.response.status);
        logger.info("error.response.headers = %s", error.response.headers);

        return { status: error.response.status, data: error.response.data };
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.info("error.message = %s", error.message);

        return { status: -1, data: error.message };
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.info("Error: %s", error.message);

        return { status: -2, data: error.message };
      }
    }
  }
}

export { Utils };
