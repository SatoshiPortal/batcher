import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { BatchRequest } from "./BatchRequest";

// CREATE TABLE batch (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   cn_batcher_id INTEGER,
//   txid TEXT,
//   spent_details TEXT,
//   spent_ts INTEGER,
//   created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
//   updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
// );
// CREATE INDEX idx_batch_cn_batcher_id ON batch (cn_batcher_id);
// CREATE INDEX idx_batch_txid ON batch (txid);

@Entity()
export class Batch {
  @PrimaryGeneratedColumn({ name: "id" })
  batchId!: number;

  @Index("idx_batch_cn_batcher_id")
  @Column({ type: "integer", name: "cn_batcher_id" })
  cnBatcherId!: number;

  @Index("idx_batch_txid")
  @Column({ type: "text", name: "txid", nullable: true })
  txid?: string;

  @Column({ type: "text", name: "spent_details", nullable: true })
  spentDetails?: string;

  @Column({ type: "integer", name: "spent_ts", nullable: true })
  spentTimestamp?: Date;

  @CreateDateColumn({ type: "integer", name: "created_ts" })
  createdAt?: Date;

  @UpdateDateColumn({ type: "integer", name: "updated_ts" })
  updatedAt?: Date;

  @OneToMany(() => BatchRequest, (batchRequest) => batchRequest.batch)
  batchRequests!: BatchRequest[];
}
