# =============================================================================
# RAVENCRY API Gateway — Multi-stage Dockerfile
# Express 4 + TypeScript, Node.js 22 LTS (Jod)
# =============================================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder
WORKDIR /build

COPY services/api/package.json services/api/package-lock.json* services/api/tsconfig.json services/api/
COPY packages/shared/ packages/shared/
WORKDIR /build/services/api
RUN npm ci

COPY services/api/src/ ./src/
WORKDIR /build
RUN cd services/api && npx tsc --outDir dist

# ---- Stage 2: Production ----
FROM node:22-alpine AS production
WORKDIR /build

RUN apk add --no-cache curl
RUN addgroup -g 1001 -S ravencry && adduser -S ravencry -u 1001 -G ravencry

COPY --from=builder /build/services/api/dist ./services/api/dist
COPY --from=builder /build/services/api/node_modules ./services/api/node_modules
COPY services/api/package.json services/api/

USER ravencry
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3003/api/health || exit 1

CMD ["node", "services/api/dist/services/api/src/index.js"]

# ---- Stage 3: Dev (used by docker-compose.dev.yml) ----
FROM node:22-alpine AS dev
WORKDIR /app

RUN apk add --no-cache curl
RUN npm install -g tsx

COPY services/api/package.json services/api/package-lock.json* ./
RUN npm ci

COPY services/api/tsconfig.json ./
COPY services/api/src/ ./src/
COPY packages/shared/ ./packages/shared/

EXPOSE 3003
CMD ["npx", "tsx", "watch", "src/index.ts"]
