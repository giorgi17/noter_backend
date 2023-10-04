FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY . .

EXPOSE 4000

RUN yarn install

CMD [ "node", "app.js" ]