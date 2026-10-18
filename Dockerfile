FROM docker.io/library/node:22-alpine AS base

# Dependencies (the postinstall `prisma generate` needs prisma/ and prisma.config.ts; it writes
# the client to lib/generated/prisma).
FROM base AS deps
# glibc compatibility for native binaries on Alpine (musl).
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma/
RUN npm ci

# Build the standalone Next.js server.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/lib/generated ./lib/generated

# Disable Next.js anonymous telemetry (https://nextjs.org/telemetry).
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# What the seed imports at runtime, whole: the standalone output keeps only the files the server
# traces. This is the dependency tree of @prisma/adapter-pg, @prisma/client and bcryptjs.
RUN mkdir -p /seed/node_modules/@prisma && cd node_modules \
  && cp -r bcryptjs pg pg-* pgpass postgres-* split2 xtend /seed/node_modules/ \
  && cp -r @prisma/adapter-pg @prisma/client @prisma/client-runtime-utils @prisma/debug @prisma/driver-adapter-utils /seed/node_modules/@prisma/

# Production image: only the standalone server, migrations and the entrypoint.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma CLI for `migrate deploy` and tsx for the seed (it imports the TypeScript client), installed at
# build time so the container starts offline. Versions come from package-lock.json, so the CLI always
# matches the generated client.
COPY package-lock.json /tmp/package-lock.json
RUN lockedVersion() { node -p "require('/tmp/package-lock.json').packages['node_modules/$1'].version"; } \
  && npm install -g "prisma@$(lockedVersion prisma)" "tsx@$(lockedVersion tsx)" \
  && npm cache clean --force && rm /tmp/package-lock.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Writable folders for the prerender cache and uploaded images (UPLOADS_DIR defaults to .data/uploads)
RUN mkdir -p .next .data/uploads && chown -R nextjs:nodejs .next .data

# Copy prisma folder and config for migrations, and the entrypoint that applies them
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-start.sh ./docker-start.sh

# Standalone output: the server and only the node_modules it traces.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The seed script runs outside the Next.js bundle, so it needs the generated client, the Prisma
# runtime with the pg adapter, and bcryptjs.
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated ./lib/generated
COPY --from=builder --chown=nextjs:nodejs /seed/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# /api/health answers 503 when the database is unreachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "./docker-start.sh"]
