FROM node:18-alpine AS builder

RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts # ВАЖЛИВО: копіюємо теку зі скриптом

RUN apk add --no-cache python3

EXPOSE 3000

CMD ["npm", "start"]