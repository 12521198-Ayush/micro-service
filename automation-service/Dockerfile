FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 3008

CMD ["node", "src/app.js"]
