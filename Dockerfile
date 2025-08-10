# ---------- Build stage ----------
FROM node:20-alpine AS builder

# потрібен Python лише якщо залежності/скрипти щось збирають під час build
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ЯВНО копіюємо потрібні каталоги, щоб не залежати від .dockerignore
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY next.config.* ./
COPY tsconfig*.json ./
COPY eslint.config.mjs postcss.config.mjs ./

RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine

WORKDIR /app

# продовий рантайм
RUN apk add --no-cache python3 \
  && ln -sf /usr/bin/python3 /usr/bin/python  # щоб spawn('python') точно спрацював

# мінімум файлів для старту
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
