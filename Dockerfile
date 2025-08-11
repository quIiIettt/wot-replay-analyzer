# ---------- Build stage ----------
FROM node:20-alpine AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# dev-залежності ПОТРІБНІ для build (typescript, @types/*, тощо)
COPY package.json package-lock.json* ./
RUN npm ci

# рекомендується для sharp та сумісності
RUN apk add --no-cache libc6-compat

COPY . .

RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
WORKDIR /app

# для sharp у рантаймі
RUN apk add --no-cache libc6-compat

# копіюємо standalone-рантайм
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# COPY --from=builder /app/scripts ./scripts

USER node
EXPOSE 3000
CMD ["node", "server.js"]
