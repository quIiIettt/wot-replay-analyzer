# ---------- Build stage ----------
FROM node:20-alpine AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# dev-залежності потрібні для білду
COPY package.json package-lock.json* ./
RUN npm ci

# (часто потрібно для sharp)
RUN apk add --no-cache libc6-compat

# копіюємо код і збираємо
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
WORKDIR /app

# залежності рантайму (без dev)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# (для sharp)
RUN apk add --no-cache libc6-compat

# мінімальний набір файлів для старту next start
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/eslint.config.mjs /app/postcss.config.mjs /app/tailwind.config.* ./ 2>/dev/null || true

EXPOSE 3000
CMD ["npm", "start"]
