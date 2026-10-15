# What We Built: The RAVENCRY Stack

RAVENCRY is eight Docker services running on an AWS EC2 t3.large instance, backed by Aurora PostgreSQL, DynamoDB, and S3. The frontend is a Next.js PWA on Vercel. The AI layer runs on Qwen via DashScope. Alert delivery goes through Telegram, Africa's Talking (SMS/USSD), and Web Push.

Here's what each piece does and why we chose it.

## The Services

**API Gateway** — Express 4 on port 3003. This is the single entry point for all public and operator traffic. 14 endpoints: report submission, sighting tips, active alert feed with geofence, case lookup, subscribe/unsubscribe, SSE live feed, operator approve/suppress, and authentication. Every endpoint returns the same error format: `{ error, code, details? }`. Rate limiting is per-endpoint. The approve endpoint has a race condition guard — `UPDATE ... WHERE status = 'pending' RETURNING *` — so two operators can't double-broadcast the same FLASH case.

**LLM Triage** — Express on port 3002. Four endpoints: `/extract` pulls structured fields (name, age, gender, location, clothing, circumstances) from raw text in any of five languages. `/classify` determines severity: FLASH, PRIORITY, or ROUTINE. `/classify-osint` evaluates articles swept by Crucix. `/check-authenticity` runs anti-fake detection. The service is LLM-agnostic: swap `LLM_PROVIDER` from `qwen` to `openai` to `deepseek` to `gemini` and nothing else changes. Post-LLM validation catches malformed output before downstream consumers see it — missing fields get safe defaults, confidence below 0.5 routes to human review.

**Crucix Alert Engine** — Express on port 3001. A fork of CrucixAI/crucix with five Nigeria-specific source modules added to the existing 29 global sources. The modules run in parallel via `Promise.allSettled()`: naptip-rss (10 feeds from HumAngle, Premium Times, Daily Trust, The Cable), gdelt-nigeria (3 GDELT API queries for kidnapping, child-specific, and school attack events), nigeria-news-rss (Punch, Vanguard, Guardian NG, Daily Trust, Premium Times), citizen-reports (polls Aurora for pending_sweep cases), and acled-nigeria (structured conflict event data from ACLED with OAuth2 auth). The delta engine detects genuinely new events between sweeps. A shared tier mapping (`lib/tiers.mjs`) scores articles with a keyword-based relevance system across English, Hausa, Yoruba, Igbo, and Pidgin — escalators like "child" or "school" add +5, de-escalators like "found" or "rescued" subtract -3. Score ≥ 8 triggers FLASH.

**Telegram Bot** — Express on port 3005. Five commands: `/start`, `/report`, `/sighting`, `/status`, `/help`. The webhook handler acks in under 10ms and processes asynchronously (Telegram retries on slow responses, which would create duplicate cases if handled synchronously). FLASH broadcasts attempt `sendPhoto` with MarkdownV2 first, fall back to plain text on parse failure, and notify the ops channel if all attempts fail. Case IDs in plain text (`NR-2026-000001`) auto-trigger a status lookup without needing the `/status` command prefix.

**SMS Service** — Express on port 3006. Wraps Africa's Talking SDK with batch sending in chunks of 100 recipients (AT's API limit). Handles sandbox mode detection: AT rejects custom sender IDs in sandbox, so the code checks the username and strips the `from` field automatically. Phone decryption was designed as AES-256-GCM with a KMS key, but not yet implemented — the hackathon workaround uses `AT_SANDBOX_TEST_PHONES` env var for sandbox numbers.

**USSD Handler** — Express on port 3007. Africa's Talking accumulates user input in the `text` parameter (e.g., `1*Amina*8*Kano`). The handler splits on `*` to determine menu depth — completely stateless, no session storage needed for navigation. Four branches: report a missing person, report a sighting, check active alerts, subscribe/unsubscribe. DynamoDB rate limiting (3 reports per phone per 24 hours) fails open — if the DynamoDB check errors, the report proceeds anyway.

**Whisper Service** — Flask on port 8000. Runs faster-whisper with int8 quantisation on CPU. The model fits in RAM alongside seven other services on a t3.large (8GB). VAD filter removes silence before transcription. Language detection maps ISO codes to readable names. Model pre-downloads at Docker build time.

**n8n** — Port 5678. Three workflows: WF-01 handles WhatsApp intake (Meta Cloud API webhook → message type branch → Whisper for audio → Qwen extract/classify → Aurora INSERT → Meta reply), WF-02 handles FLASH broadcast (PostGIS geofence `ST_DWithin` → parallel Telegram/SMS/Push/NAPTIP delivery → alerts UPDATE), WF-03 handles OSINT ingestion (Crucix webhook → Qwen classify → pg_trgm dedup → INSERT draft case).

## The Data Layer

**Aurora PostgreSQL** with PostGIS. Fourteen migration files in `db/migrations/`. Nine tables: persons, cases, sightings, alerts, subscribers, push_subscriptions, operators, sources, lga_coords. Full referential integrity with foreign keys. Trigger-based `updated_at`. Enums for state machines (`case_status`, `alert_tier`, `alert_status`, `input_channel`, `language_code`). PostGIS `GEOGRAPHY(POINT,4326)` columns for geofencing with `ST_DWithin`. `pg_trgm` for headline dedup. `uuid-ossp` for ID generation.

**DynamoDB** with three tables on on-demand billing. `ravencry-sessions` stores WhatsApp and USSD conversation state with TTL expiry (30 min for WhatsApp, 5 min for USSD). `ravencry-alerts` tracks alert delivery. `ravencry-sweep-log` is an immutable audit trail of every Crucix sweep delta.

**S3** for audio uploads (`.ogg` from WhatsApp voice notes), photos, and attachments. Lifecycle policies auto-expire objects after 3 days.

## The Frontend

Next.js 14 PWA on Vercel. Four-step report form. Offline queue with IndexedDB and background sync. SSE live alert feed from the API Gateway. Leaflet map on alert detail pages. i18n with English and Hausa translations. Service worker via Serwist.

## The Routing

Caddy reverse proxy on EC2 handles TLS termination via Let's Encrypt, subdomain routing (`api.ravencry.cv`, `crucix.ravencry.cv`, `n8n.ravencry.cv`, `ops.ravencry.cv`), and bot scanner rejection with 410 Gone responses. Docker DNS set to `8.8.8.8` because systemd-resolved (`127.0.0.53`) is unreachable from containers.

## What We Cut

We dropped Huginn (would add ~2GB RAM for RSS polling that Crucix handles natively). We cut Appsmith (ops dashboard — no time). We mocked NAPTIP via webhook.site instead of running a container. Phone encryption is designed but not yet wired. The anti-fake pipeline uses EXIF metadata and Qwen textual analysis — reverse image search is post-hackathon.

Everything else runs. Eight services, two databases, five channels, five languages, one `docker compose up -d`.
