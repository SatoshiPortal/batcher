FROM node:13.3.0-alpine3.10

WORKDIR /batcher

RUN apk add --update --no-cache \
  sqlite

COPY ./package.json /batcher
RUN npm install
COPY ./ /batcher
RUN npm run build

EXPOSE 9229 3000

ENTRYPOINT [ "npm", "run", "start" ]
