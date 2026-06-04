# syntax=docker/dockerfile:1

# ---------- Dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
# Prisma needs openssl; libc6-compat covers glibc-linked binaries on Alpine.
RUN apk add --no-cache libc6-compat openssl
# Schema + config must be present: `postinstall` runs `prisma generate`.
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---------- Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined at build time (must be present now, not at runtime).
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# Build the standalone server. We do NOT use `npm run build` because it also
# runs `prisma migrate deploy`, which needs a live DB — migrations run in the
# `migrate` service at deploy time instead. The dummy DATABASE_URL only
# satisfies module-load checks; no DB connection is made during the build.
RUN npx prisma generate \
  && DATABASE_URL="mysql://build:build@localhost:3306/build" npx next build

# ---------- Runner (standalone) ----------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Self-contained server + static assets only → small image.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
