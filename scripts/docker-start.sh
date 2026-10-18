#!/bin/sh
# Container entrypoint: apply pending migrations, seed, start the server.
#
# Databases created before migrations were used at startup (by `prisma db push`) have the tables
# but no migration history, so `migrate deploy` stops with P3005. That happens once: every
# migration is marked as applied (the pushed schema already matches them), then deploy runs again.
set -e

if ! output=$(prisma migrate deploy 2>&1); then
  echo "$output"
  if ! echo "$output" | grep -q "P3005"; then
    exit 1
  fi

  echo "Existing database without migration history: marking all migrations as applied."
  for migration in prisma/migrations/*/; do
    prisma migrate resolve --applied "$(basename "$migration")"
  done
  prisma migrate deploy

  if ! prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code > /dev/null; then
    echo "WARNING: the database schema differs from prisma/schema.prisma. Check it with 'prisma migrate diff'." >&2
  fi
else
  echo "$output"
fi

tsx prisma/seed.mjs
exec node server.js
