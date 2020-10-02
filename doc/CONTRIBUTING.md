# batcher

- To remote debug the app, use start:dev entrypoint in docker-compose.yaml instead of default start
- src/index.ts is the app entrypoint, it instantiates an Express HTTP server and start it
- src/lib/HttpServer.ts is the main piece where the magic happens

## DBMS / ORM

TypeORM and sqlite3 are used for persistance.  The ER model has been automatically created by TypeORM from `entity/Batch.ts` and `entity/BatchRequest.ts`.

```asciimodel
Batch 1---n BatchRequest
```

## Types and JSON-RPC

All the defined types can be found in `types/`.  The types inside `cyphernode/` are used for Cyphernode's requests and responses.  The types inside `jsonrpc/` are the based for the json-rpc standard for all the requests and responses.  The other types are the ones related to this Batcher.

## Business logic

The interesting code is found inside the `lib/` directory.

## Validators

The validating classes can be found in `validators/` and are used to validate the inputs.

### HttpServer.ts

The Express HTTP server, listening to `URL_PORT` port.  There is two endpoints:

- `/api`: used for batching functionalities.  The `method` property is used to dispatch to the good endpoint.
- `/webhooks`: used for when Cyphernode calls the webhooks.  Delegates the webhooks to the upstream caller, which is usually the Batcher client.  If batch requests have been merged because they had the same destination address, this is taken care here and multiple upstream webhooks can be triggered by one Cyphernode webhook.  The exact URL context is set by the `URL_CTX_WEBHOOKS` config property.

### Batcher

Baching business logic.  We receive requests, we validate them, process them, persist, call Cyphernode, marshall responses and update the DB.

### BatcherDB

Batcher database façade, everything DB related is in there.  Batcher is using it.  The corresponding sqlite file will be found in `DATA_DIR/DB_NAME` file.

### CyphernodeClient

The Cyphernode client-side code, used to call our Cyphernode instance.  It will use `CN_URL` as the gatekeeper's URL with `CN_API_ID` and `CN_API_KEY` for authentication/authorization.

### Scheduler

Every `BATCH_TIMEOUT_MINUTES` minutes, the Scheduler will call executeBatch on the Batcher.  Every `CHECK_THRESHOLD_MINUTES` minutes, the Scheduler will check if we have at least `BATCH_THRESHOLD_AMOUNT` bitcoins queued for the next batch and if so, it will call executeBatch on the Batcher.  It will use `BATCH_CONF_TARGET` as the confTarget.

### Utils

Currently only a post utility.  Used by the Batcher to delegate-call the webhooks.

### logger

Winston logging framework is used for logging.
