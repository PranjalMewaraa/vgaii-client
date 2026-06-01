# syntax=docker/dockerfile:1

# ─── Builder ──────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Prisma + the mariadb driver want openssl/ca-certificates present.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# Install deps first for layer caching. `postinstall` runs `prisma generate`,
# so the schema + prisma.config.ts must be present before `npm ci`.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# App source.
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be available now (not at runtime). Pass via --build-arg / compose args.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Regenerate the client against the copied schema, then build. We call
# `next build` directly instead of `npm run build` because the npm script also
# runs `prisma migrate deploy`, which needs a live DB — that happens at
# container start instead (see docker-entrypoint.sh). A dummy DATABASE_URL keeps
# module-load checks happy; no connection is made during the build.
RUN npx prisma generate \
  && DATABASE_URL="mysql://build:build@localhost:3306/build" npx next build

# ─── Runner ───────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Bring the fully built app over (includes node_modules, .next, prisma, the
# generated client, and the entrypoint). The prisma CLI is needed at start for
# `migrate deploy`, so we keep node_modules as-is rather than pruning.
COPY --from=builder /app ./

EXPOSE 3000

# `sh` invocation avoids relying on the file's executable bit (Windows hosts).
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
