# =============================================================================
# RAVENCRY Telegram Service — Dockerfile
# Multi-stage: build → production (Node.js 20, Express + TypeScript)
# =============================================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --omit=dev 2>/dev/null || npm install --ignore-scripts --omit=dev

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Install dev deps + build
RUN npm install --ignore-scripts typescript @types/node @types/express @types/node-fetch && \
    npx tsc --project tsconfig.json

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

RUN apk add --no-cache curl tini

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 ravencry && \
    adduser -u 1001 -G ravencry -s /bin/sh -D ravencry

# Copy built files and deps
COPY --from=build --chown=ravencry:ravencry /app/dist/ ./dist/
COPY --from=build --chown=ravencry:ravencry /app/node_modules/ ./node_modules/
COPY --chown=ravencry:ravencry package.json ./

USER ravencry

ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:3005/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
