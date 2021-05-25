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
docker run --rm -it -v $PWD:/usr/src/app -p 9229:9229 -p 8000:8000 --network cyphernodeappsnet -v "$HOME/.cyphernode/cyphernode/dist/cyphernode/gatekeeper/certs/cert.pem:/usr/src/app/data/cert.pem:ro" --entrypoint ash batcher
cd /usr/src/app
npm install
npm run build
npm run start:dev
```

### Deployment setup

Service:

```bash
docker build -t cyphernode/batcher:v0.1.2-rc.1-local .

CYPHERNODE_DIST=~/.cyphernode/cyphernode/dist

sudo mkdir -p $CYPHERNODE_DIST/apps/batcher/data
sudo cp cypherapps/docker-compose.yaml $CYPHERNODE_DIST/apps/batcher
sudo cp -r cypherapps/data $CYPHERNODE_DIST/apps/batcher
sudo chown -R cyphernode:cyphernode $CYPHERNODE_DIST/apps/batcher
```

Change `$CYPHERNODE_DIST/apps/batcher/data/config.json`

### Rebuild and redeploy one-liner

```bash
docker build -t cyphernode/batcher:v0.1.2-rc.1-local . ; docker stop `docker ps -q -f "name=batcher"`
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
curl -d '{"id":1,"method":"dequeueFromNextBatch","params":{"batchRequestId":8}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the result and see that the removed output is absent (replace batchId value by the one you got with first command)

```bash
curl -d '{"id":1,"method":"getBatchDetails"}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch exactly the same output as first

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1q0jrfsg98jakmuz0xc0mmxp2ewmqpz0tuh273fy","amount":0.0001,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json"  -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the result and see that the added output is there (replace batchRequestId value by the one you got with above command)

```bash
curl -d '{"id":1,"method":"getBatchDetails"}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch for the same destination address

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1q0jrfsg98jakmuz0xc0mmxp2ewmqpz0tuh273fy","amount":0.0002,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the details and see the merged outputs by looking at the cnOutputId fields have the same value (...)

```bash
curl -d '{"id":1,"method":"getBatchDetails"}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch again for another address

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1qgg7uag4v5y3c96qkdt6lg2tzz9a680a2exeqrs","amount":0.0003,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the details with new output (...)

```bash
curl -d '{"id":1,"method":"getBatchDetails"}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Add to batch once again for another address

```bash
curl -d '{"id":1,"method":"queueForNextBatch","params":{"address":"bcrt1qwuacwtj8l7y74ty4y3hjjf825ycp0pnwgsq9xp","amount":0.0004,"webhookUrl":"http://webhookserver:1111/indiv"}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Check the details with the new output (...)

```bash
curl -d '{"id":1,"method":"getBatchDetails"}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
```

### Let's dequeueAndPay the output before the last one

```bash
curl -d '{"id":1,"method":"dequeueAndPay","params":{"batchRequestId":21,"confTarget":4}}' -H "Content-Type: application/json" -k -u "<username>:<dd xxd output>" https://localhost/batcher/api | jq
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
    },
    address: string,
    amount: number
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
    },
    address: string,
    amount: number
  }
  error?: {
    code: number;
    message: string;
    data?: D;
  }
}
```

### dequeueAndPay

Note: If the spend fails, the output will be dequeued from the batch and the client must deal with reexecuting the spend.

Request:

```TypeScript
{
  batchRequestId: number;
  address?: string;
  amount?: number;
  confTarget?: number;
  replaceable?: boolean;
  subtractfeefromamount?: boolean;
}
```

Response:

```TypeScript
{
  result?: {
    dequeueResult: {
      batchRequestId: number;
      batchId: number;
      cnResult: {
        batcherId?: number;
        batcherLabel?: string;
        outputId?: number;
        nbOutputs?: number;
        oldest?: Date;
        total?: number;
      };
      address: string,
      amount: number
    }
    spendResult: {
      result?: {
        txid?: string;
        hash?: string;
        details?: {
          address: string;
          amount: number;
          firstseen: Date;
          size: number;
          vsize: number;
          replaceable: boolean;
          fee: number;
          subtractfeefromamount: boolean;
        }
      };
      error?: {
        code: number;
        message: string;
        data?: D;
      }
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
    "requestCountInBatch": 12,
    "status": "accepted",
    "txid": "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    "hash": "fc02518e32c22574158b96a513be92739ecb02d0caa463bb273e28d2efead8be",
    "details": {
      "address": "2N8DcqzfkYi8CkYzvNNS5amoq3SbAcQNXKp",
      "amount": 0.0001,
      "firstseen": 1584568841,
      "size": 222,
      "vsize": 141,
      "replaceable": false,
      "fee": 0.00000141
    }
  }
}
```
