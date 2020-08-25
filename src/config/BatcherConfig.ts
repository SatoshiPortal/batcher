export default interface BatcherConfig {
  LOG: string;
  BASE_DIR: string;
  DATA_DIR: string;
  DB_NAME: string;
  URL_SERVER: string;
  URL_PORT: number;
  URL_CTX_WEBHOOKS: string;
  SESSION_TIMEOUT: number;
  CN_URL: string;
  CN_API_ID: string;
  CN_API_KEY: string;
  DEFAULT_BATCHER_ID: number;
  BATCH_TIMEOUT_MINUTES: number;
  CHECK_THRESHOLD_MINUTES: number;
  BATCH_THRESHOLD_AMOUNT: number;
  BATCH_CONF_TARGET: number;
}
