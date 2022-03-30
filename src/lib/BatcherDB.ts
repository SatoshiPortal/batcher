import logger from "./Log2File";
import path from "path";
import BatcherConfig from "../config/BatcherConfig";
import { Batch } from "../entity/Batch";
import { DataSource, IsNull } from "typeorm";
import { BatchRequest } from "../entity/BatchRequest";

class BatcherDB {
  private _db?: DataSource;

  constructor(batcherConfig: BatcherConfig) {
    this.configureDB(batcherConfig);
  }

  async configureDB(batcherConfig: BatcherConfig): Promise<void> {
    logger.info("BatcherDB.configureDB", batcherConfig);

    if (this._db?.isInitialized) {
      await this._db.destroy();
    }
    this._db = await this.initDatabase(
      path.resolve(
        batcherConfig.BASE_DIR,
        batcherConfig.DATA_DIR,
        batcherConfig.DB_NAME
      )
    );
    this._db.initialize();
  }

  async initDatabase(dbName: string): Promise<DataSource> {
    logger.info("BatcherDB.initDatabase", dbName);

    return await new DataSource({
      type: "better-sqlite3",
      database: dbName,
      entities: [Batch, BatchRequest],
      synchronize: true,
      logging: true,
    });
  }

  async saveRequest(batchRequest: BatchRequest): Promise<BatchRequest> {
    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .save(batchRequest);

    return br as BatchRequest;
  }

  async saveRequests(batchRequests: BatchRequest[]): Promise<BatchRequest[]> {
    const brs = await this._db?.manager
      .getRepository(BatchRequest)
      .save(batchRequests);

    return brs as BatchRequest[];
  }

  async getRequest(batchRequestId: number): Promise<BatchRequest> {
    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .findOne({ where: { batchRequestId }, relations: ["batch"] });

    return br as BatchRequest;
  }

  async getRequestsByCnOutputId(cnOutputId: number): Promise<BatchRequest[]> {
    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .find({ where: { cnOutputId }, relations: ["batch"] });

    return br as BatchRequest[];
  }

  async getRequestCountByBatchId(batchId: number): Promise<number> {
    logger.info("BatcherDB.getRequestCountByBatchId, batchId:", batchId);

    const batch = await this.getBatch(batchId);

    if (batch && batch.batchRequests) {
      logger.debug("Batch found:", batch);

      const nb = batch.batchRequests.length;

      return nb as number;
    }
    return 0;
  }

  async removeRequest(batchRequest: BatchRequest): Promise<BatchRequest> {
    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .remove(batchRequest);

    return br as BatchRequest;
  }

  async saveBatch(batch: Batch): Promise<Batch> {
    const b = await this._db?.manager.getRepository(Batch).save(batch);

    return b as Batch;
  }

  async getBatch(batchId: number): Promise<Batch> {
    const b = await this._db?.manager
      .getRepository(Batch)
      .findOne({ where: { batchId }, relations: ["batchRequests"] });

    return b as Batch;
  }

  async getBatchByRequest(batchRequestId: number): Promise<Batch> {
    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .findOne({ where: { batchRequestId }, relations: ["batch"] });

    const b = await this._db?.manager
      .getRepository(Batch)
      .findOne({ where: { batchId: br?.batch.batchId }, relations: ["batchRequests"] });

    return b as Batch;
  }

  async getOngoingBatchByBatcherId(cnBatcherId: number): Promise<Batch> {
    logger.info(
      "BatcherDB.getOngoingBatchByBatcherId, cnBatcherId:",
      cnBatcherId
    );

    const b = await this._db?.manager
      .getRepository(Batch)
      .findOne({ where: { cnBatcherId, txid: IsNull() }, relations: ["batchRequests"] });

    return b as Batch;
  }

  async getOngoingBatchRequestsByAddressAndBatcherId(
    address: string,
    cnBatcherId: number
  ): Promise<BatchRequest[]> {
    logger.info(
      "BatcherDB.getOngoingBatchRequestsByAddressAndBatcherId, address:", address, " cnBatcherId:",
      cnBatcherId
    );

    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .createQueryBuilder("batch_request")
      .innerJoin("batch_request.batch", "batch")
      .where({ address, cnBatcherId })
      .andWhere("batch.txid IS NULL")
      .getMany();

    return br as BatchRequest[];
  }

  async getOngoingBatchRequestsByAddressAndBatcherLabel(
    address: string,
    cnBatcherLabel: string
  ): Promise<BatchRequest[]> {
    logger.info(
      "BatcherDB.getOngoingBatchRequestsByAddressAndBatcherLabel, address:", address, " cnBatcherLabel:",
      cnBatcherLabel
    );

    const br = await this._db?.manager
      .getRepository(BatchRequest)
      .createQueryBuilder("batch_request")
      .innerJoin("batch_request.batch", "batch")
      .where({ address, cnBatcherLabel })
      .andWhere("batch.txid IS NULL")
      .getMany();

    return br as BatchRequest[];
  }

  async getOngoingBatches(): Promise<Batch[]> {
    const b = await this._db?.manager
      .getRepository(Batch)
      .find({ where: { txid: IsNull() }, relations: ["batchRequests"] });

    return b as Batch[];
  }
}

export { BatcherDB };
