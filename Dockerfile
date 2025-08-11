# ---------- Build stage ----------
FROM node:20-alpine AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# dev-залежності потрібні для білду (typescript/@types тощо)
COPY package.json package-lock.json* ./
RUN npm ci

# для sharp (часто потрібно на Alpine)
RUN apk add --no-cache libc6-compat

# копіюємо увесь код і збираємо
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
WORKDIR /app

# рантайм-залежності без dev
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# для sharp
RUN apk add --no-cache libc6-compat

# копіюємо тільки те, що реально потрібно для `next start`
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# (НЕ копіюємо next.config/tsconfig/eslint — вони не потрібні у рантаймі)

EXPOSE 3000
CMD ["npm", "start"]
