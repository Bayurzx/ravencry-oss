# =============================================================================
# RAVENCRY Web — Multi-stage Dockerfile
# Next.js 16 + React 19, Node.js 22 LTS (Jod)
# =============================================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder
WORKDIR /build

# pnpm for lockfile compatibility
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY apps/web/package.json apps/web/pnpm-lock.yaml* apps/web/
WORKDIR /build/apps/web
RUN pnpm install --frozen-lockfile

COPY apps/web/ ./
RUN pnpm run build

# ---- Stage 2: Production ----
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl
RUN addgroup -g 1001 -S ravencry && adduser -S ravencry -u 1001 -G ravencry

# Copy standalone output from builder
COPY --from=builder /build/apps/web/.next/standalone ./
COPY --from=builder /build/apps/web/.next/static ./.next/static
COPY --from=builder /build/apps/web/public ./public

USER ravencry
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "server.js"]
