# ---------- Build stage ----------
FROM node:20-alpine AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Виносимо тільки файли залежностей для кешу
COPY package.json package-lock.json* ./
RUN npm ci

# Копіюємо решту коду
COPY . .

# (опційно) увімкни standalone у next.config.js: module.exports = { output: 'standalone' }
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

WORKDIR /app

# Копіюємо standalone-рантайм і статичні файли
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# COPY --from=builder /app/scripts ./scripts

# Безпека: запускаємо від користувача node
USER node

EXPOSE 3000
CMD ["node", "server.js"]
