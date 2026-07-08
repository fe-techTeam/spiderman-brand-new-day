# syntax=docker/dockerfile:1
# Multi-stage build around Next 16's `output: "standalone"` (next.config.mjs).
# The runner ships only the traced server bundle — no full node_modules.
# Build:  docker build --build-arg DEPLOYMENT_ID=$(git rev-parse --short HEAD) -t spiderman-bnd .
# See DEPLOYMENT.md for the compose workflow and CloudFront setup.

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Baked into asset URLs (?dpl=) for version-skew protection behind CloudFront.
ARG DEPLOYMENT_ID
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID
# next build needs no DB or secrets: every page is a client shell and the
# mysql2 pool is lazy (verified — the build never opens a connection).
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# server.js serves public/ and .next/static only when they sit inside the
# standalone tree — behind CloudFront both are edge-cached after first hit.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# DB tooling for one-off `docker compose run` (mysql2 + @next/env are already
# in the traced standalone node_modules).
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
# bcryptjs is a dual ESM/CJS package. The app imports the ESM entry (index.js),
# which is all Next traces — but scripts/seed-admin.js require()s it, resolving
# to the CJS entry umd/index.js that the trace omits. It has zero deps, so copy
# the complete package over the partial trace to make the require resolvable.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Writable at runtime: image-optimizer cache + local-driver media (volume).
RUN mkdir -p .next/cache/images uploads && chown -R nextjs:nodejs .next/cache uploads

USER nextjs
EXPOSE 3000
# Exec form so SIGTERM reaches node and in-flight requests drain on stop.
CMD ["node", "server.js"]
