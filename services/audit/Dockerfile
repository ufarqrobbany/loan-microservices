FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm install -D @types/express @types/node

COPY . .

RUN npm run build

CMD ["node", "dist/main.js"]