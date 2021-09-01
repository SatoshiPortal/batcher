import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Batch } from "./Batch";

// CREATE TABLE batch_request (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   external_id TEXT,
//   description TEXT,
//   address TEXT,
//   amount REAL,
//   cn_batcher_id INTEGER,
//   cn_batcher_label TEXT,
//   webhook_url TEXT,
//   calledback INTEGER DEFAULT NULL,
//   calledback_ts INTEGER,
//   batch_id INTEGER REFERENCES batch,
//   cn_output_id INTEGER,
//   merged_output INTEGER,
//   created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
//   updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
// );
// CREATE INDEX idx_batch_request_external_id ON batch_request (external_id);
// CREATE INDEX idx_batch_request_cn_batcher_id ON batch_request (cn_batcher_id);
// CREATE INDEX idx_batch_request_cn_output_id ON batch_request (cn_output_id);

@Entity()
export class BatchRequest {
  @PrimaryGeneratedColumn({ name: "id" })
  batchRequestId!: number;

  @Index("idx_batch_request_external_id")
  @Column({ type: "text", name: "external_id", nullable: true })
  externalId?: string;

  @Column({ type: "text", name: "description", nullable: true })
  description?: string;

  @Column({ type: "text", name: "address" })
  address!: string;

  @Column({ type: "real", name: "amount" })
  amount!: number;

  @Index("idx_batch_request_cn_batcher_id")
  @Column({ type: "integer", name: "cn_batcher_id", nullable: true })
  cnBatcherId?: number;

  @Column({ type: "text", name: "cn_batcher_label", nullable: true })
  cnBatcherLabel?: string;

  @Column({ type: "text", name: "webhook_url", nullable: true })
  webhookUrl?: string;

  @Column({ type: "integer", name: "calledback", nullable: true })
  calledback?: boolean;

  @Column({ type: "integer", name: "calledback_ts", nullable: true })
  calledbackTimestamp?: Date;

  @ManyToOne(() => Batch, (batch) => batch.batchRequests)
  @JoinColumn({ name: "batch_id" })
  batch!: Batch;

  @Index("idx_batch_request_cn_output_id")
  @Column({ type: "integer", name: "cn_output_id", nullable: true })
  cnOutputId?: number;

  @Column({ type: "integer", name: "merged_output", nullable: true })
  mergedOutput?: boolean;

  @CreateDateColumn({ type: "integer", name: "created_ts" })
  createdAt?: Date;

  @UpdateDateColumn({ type: "integer", name: "updated_ts" })
  updatedAt?: Date;
}
