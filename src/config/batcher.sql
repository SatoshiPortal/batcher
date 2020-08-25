PRAGMA foreign_keys = ON;

CREATE TABLE batch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cn_batcher_id INTEGER,
  txid TEXT,
  spent_details TEXT,
  spent_ts INTEGER,
  created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_batch_cn_batcher_id ON batch (cn_batcher_id);
CREATE INDEX idx_batch_txid ON batch (txid);

CREATE TABLE batch_request (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id INTEGER,
  description TEXT,
  address TEXT,
  amount REAL,
  cn_batcher_id INTEGER,
  cn_batcher_label TEXT,
  webhook_url TEXT,
  calledback INTEGER DEFAULT NULL,
  calledback_ts INTEGER,
  batch_id INTEGER REFERENCES batch,
  cn_output_id INTEGER,
  merged_output INTEGER,
  created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_batch_request_external_id ON batch_request (external_id);
CREATE INDEX idx_batch_request_cn_batcher_id ON batch_request (cn_batcher_id);
CREATE INDEX idx_batch_request_cn_output_id ON batch_request (cn_output_id);
