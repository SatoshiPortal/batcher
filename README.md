Created by Kexkey and Francis from bullbitcoin.com 

## batcher cypherapp API intro

Batcher is Bitcoin transaction batching and automation plugin for cyphernode users (a cypherapp) designed for high-volume enterprise users performing multiple Bitcoin transactions per day. Instead of making one Bitcoin transaction for each Bitcoin payment (e.g. a user withdrawing Bitcoin from an exchange) it allows you to schedule and manage batches of multiple Bitcoins payments sent to the Bitcoin Blockchain as a single transaction.

Cypherapps can be conceived as cyphernode "plugins". Running a Cyphernode instance is thus required to use the Batcher cypherapp. Instead of communicating directly with the Cyphernode API, users will connect to the Batcher API. Batcher will then manage how and when Cyphernode will be creating Bitcoin transactions.

Batcher is currently implemented in the Bull Bitcoin exchange

### Benefits 

- Significantly lower transaction fee expenses
- Fewer change outputs 
- Smaller chains of unconfirned ancestor UTXOs

All of this makes you spend up to 80% less on transaction fees overall. The hot wallets have fewer errors. It makes your on-chain non-custodial Bitcoin payout solutions seemlessly automated for optimal results according to your condigs.

### Downsides

- Payments are not instant. You should notify the end-users when they can expect the transaction to be done.
- UTXO clusters easier to detect with chainalysis software or human trackers. Users that are in the bitcoin transaction will know that the other addresses of that transaction are highly likely to be users of the same service. 

## Concept and workflow

### Batching schedule

Create a batching schedule via the configs. You can opt for an amount based (e.g. everytime the batch reaches at least 0.5 Bitcoin) or by frequency (e.g. execute the current batches ever 4 hours). We recommend you opting for both (e.g. execute the batch every time the amount exceeds 1 Bitcoin or every hour, whichever comes first).

#### Batch management info via the API

reloadConfig, getConfig

Request: N/A

Response:

```TypeScript
{
  result?: {
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
    CN_MQTT_BROKER: string;
    DEFAULT_BATCHER_ID: number;
    BATCH_TIMEOUT_MINUTES: number;
    BATCH_THRESHOLD_AMOUNT: number;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```
#### Batching configs

Edit the config here https://github.com/SatoshiPortal/batcher/blob/7d5fda30b5be3d0d8d655fecd59cce69c32a0cfb/src/config/BatcherConfig.ts

`BATCH_TIMEOUT_MINUTES:` set this as the maximum frequency. If the threshold amount is not reached it will execute regardless at this frequency. 

`CHECK_THRESHOLD_MINUTES:` frequency of checking the threshold.

`BATCH_THRESHOLD_AMOUNT:` the target batch threshold. When this amount is reached, the batch will be executed as a Bitcoin transaction. If it is not reached, the batch will be executed at according to the batch timeout setting.

`BATCH_CONF_TARGET: `when the batch is executed, this setting will determine which network fee level the Bitcoin Core wallet will use for the payments. You can for example have 2 batches, one with batch_conf_target of 6 for express withdrawals and one of batch_conf_target of 100 for non-urgent transactions.

### API Workflow

- **Add to batch**: submit a Bitcoin address and amount of a payment to a batching queue via API.
- For each payment (output + amount) you should add a callback URL that will receive the webhook notification when the transaction is sent (0-conf) and/or confirmed (1-conf). This is useful for notifying users that their withdrawal has been processed. You will receive detailed transaction info.
- Specify which batching schedule you want that payment to be queued in when submitting Bitcoin payments to the Batcher API. You may want to have different batching schedules, some more frequent than others, and some with lower confirmation targets (lower fees) than others. 
- If multiple payments are being made to a single Bitcoin address, batcher will aggregate the amounts and make a single payment to that Bitcoin address. This is not optional because Bitcoin Core would otherwise reject the transaction.
- Once the amount or expiry time thresholds have been reached, Batcher will dispatch a request to the Bitcoin Core instance running in cyphernode to create and broadcast the transaction using the “send multi” Bitcoin Core RPC call.
- In the API response, you get the time of the next batch. You can notify the user that the batch will be executed at the latest at that time (and possibly earlier).

Because of the nature of Bitcoin transaction, the end result will be to create a much smaller amount of slightly bigger transactions.


# Technical docs

## Preparation

### Password generation

Generate a random password, used by the batcher client (your web app):

```bash
dd if=/dev/urandom bs=32 count=1 2> /dev/null | xxd -ps -c 32
```

Construct the bcrypt hash of the password, to put in the docker-compose.yaml file as traefik.frontend.auth.basic.users value:

```bash
htpasswd -bnB <username> '<dd xxd output>' | sed 's/\$/\$\$/g'
<username>:$$2y$$05$$LFKGjKBkmWbI5RUFBqwonOWEcen4Yu.mU139fvD3flWcP8gUqLLaC
```

### Development setup

Port 9229 is used to remote debug the TS app.  Optional.

```bash
docker build -t batcher .
docker run --rm -it -v $PWD:/usr/src/app -p 9229:9229 -p 8000:8000 --network cyphernodeappsnet -v "~/.cyphernode/cyphernode/dist/cyphernode/gatekeeper/certs/cert.pem:/usr/src/app/data/cert.pem:ro" batcher ash
npm install
npm run build
npm run start:dev
```

### Deployment setup

Service:

```bash
docker build -t cyphernode/batcher:v0.1.0-local .

CYPHERNODE_DIST=~/.cyphernode/cyphernode/dist

sudo mkdir -p $CYPHERNODE_DIST/apps/batcher/data
sudo cp cypherapps/docker-compose.yaml $CYPHERNODE_DIST/apps/batcher
sudo cp -r cypherapps/data $CYPHERNODE_DIST/apps/batcher
sudo chown -R cyphernode:cyphernode $CYPHERNODE_DIST/apps/batcher
```

Change `$CYPHERNODE_DIST/apps/batcher/data/config.json`

### Rebuild and redeploy one-liner

```bash
docker build -t cyphernode/batcher:v0.1.0-local . ; docker stop `docker ps -q -f "name=batcher"`
```

## Notes

How to listen and simulate the webhook server:

```bash
docker run --rm -it -p 1111:1111 --network cyphernodeappsnet --name webhookserver alpine ash
```

```bash
nc -vlkp1111 -e sh -c 'echo -en "HTTP/1.1 200 OK\r\n\r\n" ; timeout -t 1 tee /dev/tty | cat ; echo 1>&2'
```

## Usage

### Add to batch

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1q0jrfsg98jakmuz0xc0mmxp2ewmqpz0tuh273fy","amount":0.0001,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json"  -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Remove from batch (replace batchRequestId value by the one you got with above command)

```bash
curl -d '{"id":1,"method":"dequeueFromNextBatch","params":{"batchRequestId":18}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the result and see that the removed output is absent (replace batchId value by the one you got with first command)

```bash
curl -d '{"id":1,"method":"getBatchDetails","params":{"batchId":3}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch exactly the same output as first

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1q0jrfsg98jakmuz0xc0mmxp2ewmqpz0tuh273fy","amount":0.0001,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json"  -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the result and see that the added output is there (replace batchRequestId value by the one you got with above command)

```bash
curl -d '{"id":1,"method":"getBatchDetails","params":{"batchRequestId":19}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch for the same destination address

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1q0jrfsg98jakmuz0xc0mmxp2ewmqpz0tuh273fy","amount":0.0002,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the details and see the merged outputs by looking at the cnOutputId fields have the same value (...)

```bash
curl -d '{"id":1,"method":"getBatchDetails","params":{"batchRequestId":20}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch again for another address

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1qgg7uag4v5y3c96qkdt6lg2tzz9a680a2exeqrs","amount":0.0003,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the details with new output (...)

```bash
curl -d '{"id":1,"method":"getBatchDetails","params":{"batchRequestId":21}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Execute the batch!  The resulting tx should have 3 outputs: the 2 batched requests and the change output

```bash
curl -d '{"id":1,"method":"executeBatch","params":{"batchRequestId":21}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Look at the "webhook simulator output" to see the webhooks being called for the 3 requests (even if two of them have been merged)

Simply running the `webhookserver` container above and look at the stdout.

## Requests and Responses

### queueForNextBatch

Request:

```TypeScript
{
  batcherId?: number;
  batcherLabel?: string;
  externalId?: number;
  description?: string;
  address: string;
  amount: number;
  webhookUrl?: string;
}
```

Response:

```TypeScript
{
  result?: {
    batchRequestId: number;
    batchId: number;
    etaSeconds: number;
    cnResult: {
      batcherId?: number;
      batcherLabel?: string;
      outputId?: number;
      nbOutputs?: number;
      oldest?: Date;
      total?: number;
    }
  }
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### dequeueFromNextBatch

Request:

```TypeScript
{
    batchRequestId: number;
}
```

Response:

```TypeScript
{
  result?: {
    batchRequestId: number;
    batchId: number;
    cnResult: {
      batcherId?: number;
      batcherLabel?: string;
      outputId?: number;
      nbOutputs?: number;
      oldest?: Date;
      total?: number;
    }
  }
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### getBatchDetails

Request:

```TypeScript
{
  batchRequestId?: number;
  batchId?: number;
}
```

Response:

```TypeScript
{
  result?: {
    batchId: number;
    cnBatcherId: number;
    txid?: string;
    spentDetails?: string;
    spentTimestamp?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    batchRequests: [
      {
        batchRequestId: number;
        externalId?: number;
        description?: string;
        address: string;
        amount: number;
        cnBatcherId?: number;
        cnBatcherLabel?: string;
        webhookUrl?: string;
        calledback?: boolean;
        calledbackTimestamp?: Date;
        cnOutputId?: number;
        mergedOutput?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
      },
      ...
    ]
  }
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### executeBatch

Request:

```TypeScript
{
  batchId?: number;
  batchRequestId?: number;
  confTarget?: number;
}
```

Response:

```TypeScript
{
  result?: {
    batch: {
      batchId: number;
      cnBatcherId: number;
      txid?: string;
      spentDetails?: string;
      spentTimestamp?: Date;
      createdAt?: Date;
      updatedAt?: Date;
      batchRequests: [
        {
          batchRequestId: number;
          externalId?: number;
          description?: string;
          address: string;
          amount: number;
          cnBatcherId?: number;
          cnBatcherLabel?: string;
          webhookUrl?: string;
          calledback?: boolean;
          calledbackTimestamp?: Date;
          cnOutputId?: number;
          mergedOutput?: boolean;
          createdAt?: Date;
          updatedAt?: Date;
        },
        ...
      ]
    },
    cnResult: {
      batcherId?: number;
      batcherLabel?: string;
      confTarget?: number;
      nbOutputs?: number;
      oldest?: Date;
      total?: number;
      txid?: string;
      hash?: string;
      details?: {
        firstseen: Date;
        size: number;
        vsize: number;
        replaceable: boolean;
        fee: number;
      }
    }
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### getOngoingBatches

Request: N/A

Response:

```TypeScript
{
  result?: {
    [
      {
        batchId: number;
        cnBatcherId: number;
        txid?: string;
        spentDetails?: string;
        spentTimestamp?: Date;
        createdAt?: Date;
        updatedAt?: Date;
        batchRequests: [
          {
            batchRequestId: number;
            externalId?: number;
            description?: string;
            address: string;
            amount: number;
            cnBatcherId?: number;
            cnBatcherLabel?: string;
            webhookUrl?: string;
            calledback?: boolean;
            calledbackTimestamp?: Date;
            cnOutputId?: number;
            mergedOutput?: boolean;
            createdAt?: Date;
            updatedAt?: Date;
          },
          ...
        ]
      },
      ...
    ]
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### reloadConfig, getConfig

Request: N/A

Response:

```TypeScript
{
  result?: {
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
    CN_MQTT_BROKER: string;
    DEFAULT_BATCHER_ID: number;
    BATCH_TIMEOUT_MINUTES: number;
    BATCH_THRESHOLD_AMOUNT: number;
  },
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### Spent Webhook

Webhook BODY:

```json
{
  "error": null,
  "result": {
    "batchRequestId": 48,
    "batchId": 8,
    "cnBatcherId": 1,
    "txid": "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    "hash": "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    "spentDetails": {
      "address": "2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp",
      "amount": 0.0001,
      "firstseen": 1584568841,
      "size": 222,
      "vsize": 141,
      "replaceable": false,
      "fee": 0.00000141,
      "subtractfeefromamount": false
    }
  }
}
```
