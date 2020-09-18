FROM node:14.11.0-alpine3.11

WORKDIR /batcher

COPY package.json /batcher

RUN apk add --update --no-cache --virtual .gyp \
  python \
  make \
  g++ \
 && npm install \
 && apk del .gyp

COPY tsconfig.json /batcher
COPY src /batcher/src

RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
