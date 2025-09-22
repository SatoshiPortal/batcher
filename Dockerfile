FROM node:24.8.0 as build-base

WORKDIR /batcher

COPY package.json /batcher

RUN yarn install

#--------------------------------------------------------------

FROM node:24.8.0
WORKDIR /batcher

COPY --from=build-base /batcher/node_modules/ /batcher/node_modules/
COPY package.json /batcher
COPY tsconfig.json /batcher
COPY src /batcher/src

RUN yarn build

EXPOSE 9229 3000

ENTRYPOINT [ "yarn", "run", "start" ]
