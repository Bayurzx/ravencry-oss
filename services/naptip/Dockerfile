# =============================================================================
# RAVENCRY NAPTIP Bridge — Dockerfile
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
RUN npm install --ignore-scripts typescript @types/node @types/express tsx && \
    npx tsc

# ---- Stage 2: Production ----
FROM node:20-alpine

RUN addgroup -g 1001 -S ravencry && \
    adduser -S nodejs -G ravencry -u 1001

WORKDIR /app

# Copy production deps + build output
COPY --from=build --chown=nodejs:ravencry /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:ravencry /app/dist ./dist
COPY --from=build --chown=nodejs:ravencry /app/package.json ./

USER nodejs

EXPOSE 3008

ENV NODE_ENV=production
ENV PORT=3008

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3008/health || exit 1

CMD ["node", "dist/index.js"]
