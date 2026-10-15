#!/bin/bash
# =============================================================================
# RAVENCRY — ECS User Data Script
# Runs on first boot: installs Docker, Caddy, Node.js 20, psql, git
# Alibaba Cloud equivalent of steps.md T-007 STEP 6
# Note: AWS Aurora stays on AWS — no DB is provisioned on Alibaba Cloud.
# =============================================================================

set -e

apt-get update && apt-get upgrade -y

# ── Docker ─────────────────────────────────────────────────────────────────
apt-get install -y docker.io docker-compose-v2
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# ── Caddy (will run inside Docker, not as host service) ────────────────────
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy
systemctl stop caddy
systemctl disable caddy

# ── Node.js 20 ─────────────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ── PostgreSQL client ──────────────────────────────────────────────────────
apt-get install -y postgresql-client

# ── git ────────────────────────────────────────────────────────────────────
apt-get install -y git

# ── aliyun CLI ─────────────────────────────────────────────────────────────
curl -fsSL https://aliyuncli.alicdn.com/install.sh | bash

echo "=== RAVENCRY ECS setup complete ==="
