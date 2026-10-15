FROM docker.io/library/node:25-alpine AS base

# Dependencies (prisma/ is needed by the postinstall `prisma generate`).
FROM base AS deps
# glibc compatibility for native binaries on Alpine (musl).
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Build the standalone Next.js server.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js anonymous telemetry (https://nextjs.org/telemetry).
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image: only the standalone server, migrations and the entrypoint.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma CLI for `migrate deploy` at startup, installed at build time so the container starts offline.
# The version comes from package-lock.json, so it always matches the generated client.
COPY package-lock.json /tmp/package-lock.json
RUN npm install -g "prisma@$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
  && npm cache clean --force && rm /tmp/package-lock.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Writable folders for the prerender cache and uploaded images (UPLOADS_DIR defaults to .data/uploads)
RUN mkdir -p .next .data/uploads && chown -R nextjs:nodejs .next .data

# Copy prisma folder for migrations, and the entrypoint that applies them
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-start.sh ./docker-start.sh

# Standalone output: the server and only the node_modules it traces.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client and query engine, used by the server and by the seed script.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# /api/health answers 503 when the database is unreachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "./docker-start.sh"]
