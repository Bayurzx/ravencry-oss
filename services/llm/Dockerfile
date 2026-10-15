# =============================================================================
# RAVENCRY LLM / Qwen Triage Service — Multi-stage Dockerfile
# Node.js 22 LTS (Jod), Express, OpenAI-compatible SDK
# =============================================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build 2>/dev/null || npx tsc --outDir dist

# ---- Stage 2: Production ----
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl
RUN addgroup -g 1001 -S ravencry && adduser -S ravencry -u 1001 -G ravencry

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

USER ravencry
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]

# ---- Stage 3: Dev ----
FROM node:22-alpine AS dev
WORKDIR /app

RUN apk add --no-cache curl
RUN npm install -g tsx

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 3002
CMD ["npx", "tsx", "watch", "src/index.ts"]
