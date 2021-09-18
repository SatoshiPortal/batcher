FROM node:14.11.0-alpine3.11 as build-base

WORKDIR /batcher

COPY package.json /batcher

RUN apk add --update --no-cache --virtual .gyp \
  python \
  make \
  g++
RUN npm install

#--------------------------------------------------------------

FROM node:14.11.0-alpine3.11
WORKDIR /batcher

COPY --from=build-base /batcher/node_modules/ /batcher/node_modules/
COPY package.json /batcher
COPY tsconfig.json /batcher
COPY src /batcher/src

RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
