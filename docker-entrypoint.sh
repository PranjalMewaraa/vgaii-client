#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations…"
npx prisma migrate deploy

# Optional one-time seed: run with `SEED_ON_START=true` (e.g. first boot of a
# fresh database). Safe to leave unset in normal operation.
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Seeding database…"
  npm run seed
fi

echo "[entrypoint] Starting Next.js on port ${PORT:-3000}…"
exec npm run start
