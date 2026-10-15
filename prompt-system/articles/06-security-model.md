# Article 6: The Doors We Left Open
## Prompt, instructions, reference materials, and research
### Generated: 2026-07-15

---

## Suggested Titles

Primary:
**"The Doors We Left Open: RAVENCRY's Security Model and Production Hardening Plan"**

Alternatives:
- "What's Exposed and Why: A Hackathon Security Audit"
- "From Hackathon to Hardened: The Security Gaps We Chose to Live With"

---

## Article Purpose

An honest, detailed accounting of RAVENCRY's current security posture. This article documents which endpoints are intentionally public during development, why they are temporarily exposed, the associated risks, and the planned production hardening. It is not an apology. It is an inventory.

The article covers: the Caddy reverse proxy configuration (what it protects and what it doesn't), the API gateway's current authentication model, the database access pattern, the phone encryption gap, the env var exposure, and the hardening roadmap.

---

## Writing Instructions

### Required Reading (read BEFORE writing)

1. `prompt-system/articles/master-plan.md` — global rules, anti-AI checklist, cross-linking map, tone, voice, scene, settings
2. `prompt-system/skills/anti-ai-writing.md` — full anti-AI writing rules
3. `Caddyfile` — THE key file: reverse proxy, subdomain routing, bot rejection, security headers, TODO comments for IP whitelisting
4. `docker-compose.yml` — all port mappings, env var exposure, healthcheck endpoints
5. `README.md` — service table with ports, quick start
6. `db/migrations/008_subscribers.sql` — phone encryption design (`phone_encrypted` BYTEA, `phone_hash_sha256` TEXT)
7. `db/migrations/010_operators.sql` — operator authentication schema
8. `ravencry_opus_optimization.md` — NFR-004 phone hash contradiction, circuit breaker, API error format requirement
9. `.env.example` — all exposed environment variables
10. `pending_fix.md` — Fix 2 (dotenv comment parsing), Fix 3 (config drift)
11. `articles/03-what-we-learned.md` — Docker production issues, dotenv parsing
12. `articles/02-what-we-built.md` — API gateway section (14 endpoints, rate limiting, error format)
13. `hackathon_context.md` — Caddy section (rate_limit plugin, DNS, host conflict)
14. `specs/design.md` — security design section (auth, RBAC, data retention)

> **Validity warning:** `pending_fix.md` tracks production drift between local dev and EC2/Aurora. Items may have been resolved or newly introduced since June 2026. The `.env.example` and `Caddyfile` are the authoritative sources for current security posture. Check `docker-compose.yml` for live port mappings. Demo endpoints at `crucix.`, `n8n.`, and `ops.ravencry.cv` have access that will expire in August 2026 — the article should note which are permanent public routes vs temporary demo access.

### Research Before Writing (online)

1. **OWASP Top 10 (2026)** — Current list. Which items apply to RAVENCRY and which are already mitigated.
2. **Docker security best practices (2026)** — Non-root users, read-only filesystems, capability dropping, seccomp profiles. Which ones we follow and which we don't.
3. **Express.js security best practices (2026)** — Helmet middleware, rate limiting, CORS, input validation. Current state of Express security middleware.
4. **Nigeria Data Protection Regulation (NDPR) 2026** — Specific requirements for storing citizen phone numbers, location data, photos. What RAVENCRY needs to comply.
5. **Caddy 2 security headers (2026)** — Current best practices for security headers. What we set and what we don't.

### Article Structure

**Opening (2 paragraphs)**
Start with the uncomfortable truth: a hackathon system has doors that shouldn't be open in production. Every engineer knows this. The question is whether you document them or hope nobody notices. We're documenting them.

**Section: The Caddy reverse proxy — what it protects (~3 paragraphs)**
Walk through the `Caddyfile` line by line:

- Automatic HTTPS via Let's Encrypt on all subdomains
- Bot scanner rejection with 410 Gone for 20+ probe paths
- Security headers: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`
- Subdomain routing: `api.`, `crucix.`, `n8n.`, `ops.ravencry.cv`
- Subdomain isolation: public endpoints (`/telegram/*`, `/ussd/*`) vs everything else routed through API gateway

Reference: `Caddyfile`.

**Section: What's intentionally public and why (~4 paragraphs)**
List every exposed endpoint and the rationale:

- `api.ravencry.cv` — public API, needs to be accessible for citizen reports, alert feed, SSE
- `crucix.ravencry.cv` — Crucix HUD. Currently open. Caddyfile has `TODO: re-add IP whitelist after testing`
- `n8n.ravencry.cv` — n8n workflow editor. Currently open. Caddyfile has `TODO: re-add IP whitelist after testing`
- `ops.ravencry.cv` — Appsmith ops dashboard. Currently open. Caddyfile has `TODO: re-add IP whitelist after testing`
- Ports in docker-compose.yml: 22 (SSH), 80, 443, 3001 (Crucix dev access), 3003 (API), 5678 (n8n)
- Alibaba Cloud security group: ports 22, 80, 443, 3001 open to `0.0.0.0/0`

The three subdomains with `TODO: re-add IP whitelist` are the clearest gap. They're documented. They were open during development for testing. The plan is to restrict to a VPN IP range.

Reference: `Caddyfile` TODO comments, `docker-compose.yml` ports, `infra/aliyun/main.tf` security group rules.

**Section: Authentication — what exists and what doesn't (~3 paragraphs)**
- API gateway: operator endpoints use `api_key` header (simple, not JWT/OAuth). Documented in `specs/design.md`.
- Operator table in `db/migrations/010_operators.sql`: `id`, `email`, `password_hash`, `role`, `created_at`. The schema exists.
- No session management, token rotation, or MFA.
- n8n: protected by `N8N_WEBHOOK_SECRET` for webhook endpoints. The editor UI has n8n's built-in auth.
- Caddy `basicauth` is not configured. The Caddyfile has no auth directives.
- The race condition guard on `UPDATE ... WHERE status = 'pending' RETURNING *` prevents double-broadcast but doesn't prevent unauthorized approval.

Reference: `db/migrations/010_operators.sql`, `articles/02-what-we-built.md` API gateway section, `specs/design.md` security design.

**Section: The phone encryption gap (~2 paragraphs)**
This is the most visible security gap:

- Migration `008_subscribers.sql` stores `phone_encrypted` BYTEA and `phone_hash_sha256` TEXT
- `decryptPhone()` was never written. No KMS key exists in AWS Secrets Manager.
- Seed data uses mock BYTEA values
- SMS service works because of `AT_SANDBOX_TEST_PHONES` — n8n sends subscriber UUIDs, SMS service ignores them and sends to sandbox numbers
- If the env var is unset, it returns mock success without sending real SMS

The intent is correct: AES-256-GCM with server-side key. The implementation is deferred. For a hackathon, this is the right call. For production, it's the first thing that needs to be fixed.

Reference: `db/migrations/008_subscribers.sql`, `articles/03-what-we-learned.md` "Design vs. Reality", `articles/02-what-we-built.md` "What We Cut".

**Section: Environment variable exposure (~2 paragraphs)**
- `.env.example` contains redacted values — keys are in a separate `.env` (gitignored)
- The config drift problem from `pending_fix.md` Fix 3: `.env` (root), `services/crucix/.env`, `services/llm/.env`
- dotenv comment parsing bug from `pending_fix.md` Fix 2: inline comments become literal values
- Production `.env` on EC2 has `LLM_MODEL=` and `LLM_BASE_URL=` truly empty — confirmed clean
- Docker Compose reads `.env` into containers — any env var in `.env` is available to every container
- No secrets manager integration (design specifies AWS Secrets Manager; nothing reads from it)

Reference: `pending_fix.md`, `.env.example`, `articles/03-what-we-learned.md` dotenv section.

**Section: The hardening roadmap (~3 paragraphs)**
Priority-ordered:

1. **IP whitelist on crucix/n8n/ops subdomains** — 30 minutes, highest impact. Restrict to VPN range.
2. **Phone encryption implementation** — `decryptPhone()`, KMS key, real encryption for subscriber phones
3. **Operator authentication upgrade** — JWT with rotation, session management, at minimum HTTP basic auth via Caddy
4. **Circuit breaker on Africa's Talking** — 3 consecutive failures → skip SMS, alert ops channel
5. **Input validation hardening** — all public endpoints need stricter validation (currently per-endpoint but not comprehensive)
6. **Database credential rotation** — Aurora password rotation, env var sanitization
7. **Docker security hardening** — read-only root filesystems where possible, drop capabilities, seccomp profiles
8. **NDPR compliance review** — audit against Nigeria data protection requirements

Reference: `ravencry_opus_optimization.md` design recommendations, `specs/design.md` security section.

**Closing (1–2 paragraphs)**
Security at a hackathon is about documenting what you chose not to fix, not pretending everything is fine. Every gap listed here has a file behind it and a plan in front of it. For a system that handles citizen reports in a conflict zone, nothing here is acceptable long-term. For 39 hours of build time, nothing here was avoidable. The difference between negligence and pragmatism is documentation.

This is the final piece in the series. Call back to Article 1: the infrastructure that runs it all. End with: the system works. Now it needs to be hardened.

---

### Cross-Linking

- **Links from Article 5**: The trust-by-default article explained why we bias toward action. This article explains what we left open to make that possible.
- **Links back to Article 1**: The Alibaba Cloud security group, the SSH key setup, the Terraform that provisions it all.
- This article closes the series. The final paragraph should reference the entire journey.

---

### Voice & Tone Reminder

This is the hardest article to write without sounding defensive. The tone is not "sorry we left things open." It's not "security doesn't matter." It's: "Here's every door. Here's why it's open. Here's the key we plan to use to lock it." Calm, precise, unapologetic about the tradeoffs, clear-eyed about the risks.

The narrator is an engineer who has done security audits before and knows exactly what a penetration tester would find. The article preempts that report.

---

## Online Research URLs to Check

1. OWASP Top 10: `https://owasp.org/www-project-top-ten/` (current 2026 version)
2. Docker security: `https://docs.docker.com/engine/security/` (best practices, seccomp, capabilities)
3. Caddy 2 security: `https://caddyserver.com/docs/caddyfile/directives` (basicauth, ipfilter, header)
4. Express.js security: `https://expressjs.com/en/advanced/best-practice-security.html` (Helmet, rate limiting)
5. NDPR Nigeria: `https://ndpr.nitda.gov.ng/` (data protection requirements)
6. Helmet.js: `https://helmetjs.github.io/` (Express security headers middleware)
