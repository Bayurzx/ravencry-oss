# Article 2: Every Service in Its Place
## Prompt, instructions, reference materials, and research
### Generated: 2026-07-15

---

## Suggested Titles

Primary:
**"Every Service in Its Place: The Architecture Decisions Behind RAVENCRY"**

Alternatives:
- "Eight Services, Five Channels, One Command: How RAVENCRY's Stack Fits Together"
- "The Boxes on the Diagram: What Each RAVENCRY Service Does and Why"

---

## Article Purpose

A calm, methodical walkthrough of the RAVENCRY production stack. Eleven Docker containers, eight custom services, two databases, five input channels, five languages. Each service gets its own section — what it does, why we chose the technology, the decisions that shaped it, and what we cut. The focus is on engineering rationale, not feature lists.

The existing `articles/02-what-we-built.md` is the primary source. This article expands that into a fuller narrative with deeper rationale.

---

## Writing Instructions

### Required Reading (read BEFORE writing)

1. `prompt-system/articles/master-plan.md` — global rules, anti-AI checklist, cross-linking map, tone, voice, scene, settings
2. `prompt-system/skills/anti-ai-writing.md` — full anti-AI writing rules
3. `articles/02-what-we-built.md` — primary source, already contains deep service-by-service descriptions
4. `docker-compose.yml` — full production compose (all 11 services, env vars, healthchecks)
5. `docker-compose.dev.yml` — dev overrides (for context on what we changed for production)
6. `Caddyfile` — reverse proxy, subdomain routing, bot rejection, security headers
7. `README.md` — service table, architecture overview, quick start
8. `features.md` — CORE feature map
9. `step_qwencloud.md` — agent society architecture, communication patterns table
10. `ravencry_opus_optimization.md` — Task 2 (Tech Stack Decisions), design recommendations
11. `diag_architect.md` — service inventory, data flows, DNS routing, architectural decisions
12. `hackathon_context.md` — key decisions, Docker debugging discoveries
13. `issues.md` — live `docker compose ps` output
14. ALL Dockerfiles — `services/api/Dockerfile`, `services/llm/Dockerfile`, `services/crucix/Dockerfile`, `services/telegram/Dockerfile`, `services/sms/Dockerfile`, `services/ussd/Dockerfile`, `services/whisper/Dockerfile`, `services/naptip/Dockerfile`

> **Validity warning:** Some referenced docs (especially `articles/02-what-we-built.md`, `issues.md`, and `ravencry_opus_optimization.md`) were written during the June 2026 hackathon. Docker Compose output, endpoint counts, and service statuses may have drifted. Verify numbers against the live system. The architecture docs trump the memory.

> **Demo note:** Several endpoints currently accessible for demonstration purposes — including `crucix.ravencry.cv`, `n8n.ravencry.cv`, and `ops.ravencry.cv` — have access that will expire in August 2026. The article should note these are temporary demo routes and document the planned IP whitelist for production.

### Research Before Writing (online)

1. **n8n vs Temporal vs Prefect (2026)** — Workflow orchestration landscape. Why n8n for hackathon (visual editor = demo-friendly), what you'd use for production.
2. **faster-whisper vs WhisperX vs OpenAI Whisper (2026)** — Current state of open-source speech-to-text. faster-whisper benchmarks, int8 quantization RAM usage. Note: faster-whisper was chosen for hackathon cost constraints. When funding allows, we will evaluate alternatives — possibly training a custom model optimized for Nigerian languages and code-switching, since general-purpose ASR models struggle with Hausa/Yoruba/Igbo/Pidgin mixtures.
3. **Caddy 2 vs Traefik vs Nginx (2026)** — Reverse proxy landscape. Caddy's automatic HTTPS, plugin ecosystem, performance.
4. **Africa's Talking API (2026)** — Current SMS/USSD API docs, sandbox limitations, batch SMS limits, pricing Nigeria.

### Article Structure

**Opening (2 paragraphs)**
Start with `docker compose ps`. Eleven services, all healthy. "One command deploys the entire stack." Then zoom out: what are we looking at? An API gateway, an AI triage layer, an OSINT engine, four delivery channels, a transcription service, a workflow orchestrator, and a reverse proxy. Backed by PostgreSQL and S3.

**Section: The API Gateway (port 3003) (~3 paragraphs)**
Express 4, TypeScript, 14 endpoints. Single entry point for all public and operator traffic. Consistent error format `{ error, code, details? }`. Per-endpoint rate limiting. Race condition guard on approval: `UPDATE ... WHERE status = 'pending' RETURNING *`. SSE live feed for real-time alerts. Why a gateway instead of direct service-to-service calls.

Reference: `articles/02-what-we-built.md` "API Gateway" section, `docker-compose.yml` api service.

**Section: The LLM Triage Service (port 3002) (~3 paragraphs)**
LLM-agnostic by design. Four providers implemented (Qwen, OpenAI, DeepSeek, Gemini), one `LLM_PROVIDER` env var. Four endpoints: extract, classify, classify-osint, check-authenticity. Post-LLM validation catches malformed output. Why `temperature: 0.1` for safety-critical classification. Why `qwen-plus` for FLASH, `qwen-turbo` for OSINT.

Reference: `articles/02-what-we-built.md` "LLM Triage" section, `articles/04-our-qwencloud-journey.md` Qwen findings section, `docker-compose.yml` llm service.

**Section: Crucix Alert Engine (port 3001) (~3 paragraphs)**
Fork of CrucixAI/crucix. Five Nigeria-specific source modules added to 29 global sources. Parallel sweep via `Promise.allSettled()`. Delta engine for genuinely new events. Tier mapping with keyword scoring across 5 languages. Escalators (+5 for "child", "school"), de-escalators (-3 for "found", "rescued"). Score >= 8 triggers FLASH.

Reference: `articles/02-what-we-built.md` "Crucix Alert Engine" section, `prompt-system/skills/crucix-patterns.md`.

**Section: The Delivery Agents (~4 paragraphs)**
Telegram bot (port 3005): 5 commands, async webhook processing to avoid duplicate cases, MarkdownV2 with plain text fallback, case ID auto-lookup. SMS service (port 3006): Africa's Talking SDK, batch chunks of 100, sandbox auto-detect, phone encryption gap. USSD handler (port 3007): stateless `*` split parsing, four branches, DynamoDB rate limiting (fail-open). NAPTIP bridge (port 3008): mock for hackathon, CAP-JSON format.

Reference: `articles/02-what-we-built.md` delivery sections, `docker-compose.yml` telegram/sms/ussd/naptip services.

**Section: Whisper (port 8000) and n8n (port 5678) (~2 paragraphs)**
Whisper: faster-whisper with int8 quantization on CPU, fits in 8GB alongside 7 other services, VAD filter, model pre-downloaded at build time. n8n: 3 workflows (WhatsApp intake, FLASH broadcast, OSINT ingestion), visual demo-friendly, production webhooks need explicit Respond node.

Reference: `articles/02-what-we-built.md`, `services/whisper/Dockerfile`, `articles/03-what-we-learned.md` n8n section.

**Section: The Data Layer (~3 paragraphs)**
Aurora PostgreSQL with PostGIS. 15 migrations. 9 tables, full referential integrity, trigger-based `updated_at`. Enums for state machines. PostGIS `GEOGRAPHY(POINT,4326)` for geofencing. `pg_trgm` for fuzzy name and headline matching. S3 for audio/photos with 3-day lifecycle. Why Aurora over plain RDS: PostGIS support, the assessment in `ravencry_opus_optimization.md`.

Reference: `db/migrations/*`, `articles/02-what-we-built.md` data layer section, `ravencry_opus_optimization.md` Task 1B.

**Section: The Routing Layer (~2 paragraphs)**
Caddy on ports 80/443. Let's Encrypt automatic HTTPS. Subdomain routing: `api.`, `crucix.`, `n8n.`, `ops.`. Bot scanner rejection with 410 Gone. Security headers: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`. Docker DNS set to `8.8.8.8` because systemd-resolved `127.0.0.53` is unreachable.

Reference: `Caddyfile`, `articles/02-what-we-built.md` "The Routing" section, `hackathon_context.md` Caddy section.

**Section: What We Cut (~2 paragraphs)**
Huginn (2GB RAM for RSS polling that Crucix handles natively). Appsmith (ops dashboard — no time, though it's running as a container). Phone encryption (designed, not implemented — `AES-256-GCM` with KMS key). Reverse image search (post-hackathon). DynamoDB (replaced by PostgreSQL table).

Reference: `articles/02-what-we-built.md` "What We Cut" section, `ravencry_opus_optimization.md` design recommendations.

**Closing (1 paragraph)**
Everything runs. One command. The architecture is deliberate, not accidental. Every service has a reason for existing.

Cross-link: "Next: how we taught this system to think in five Nigerian languages."

---

### Cross-Linking

- **Links from Article 1**: The Alibaba Cloud article ended with "here's what runs on that ECS instance"
- **Links to Article 3**: "Next: the prompt engineering that makes the LLM triage service actually work across Hausa, Yoruba, Igbo, Pidgin, and English."

---

### Voice & Tone Reminder

This is the architecture tour. The narrator walks through a diagram on the screen, pointing at each box. Calm, precise, methodical. Every claim about what a service does is backed by a line in docker-compose.yml or a Dockerfile or a migration. No speculation. The confidence comes from having built it and watched it run.

---

## Online Research URLs to Check

1. Express 4 GitHub: `https://github.com/expressjs/express` (check latest release, maintenance status)
2. n8n docs: `https://docs.n8n.io/` (workflow engine, webhook node, production setup)
3. faster-whisper GitHub: `https://github.com/SYSTRAN/faster-whisper` (model sizes, int8 quantization)
4. Caddy 2 docs: `https://caddyserver.com/docs/` (reverse_proxy, headers, auto HTTPS)
5. Africa's Talking docs: `https://developers.africastalking.com/` (SMS API, USSD API, sandbox)
