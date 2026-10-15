# RAVENCRY — Build Task List
## Kiro Spec · todo.md · v1.1 · June 2026 (Opus-optimized)

> This is the single source of truth for what to build and in what order.
> Check off tasks as you complete them.
> Do not start a task unless its dependencies are checked.

---

## PHASE SUMMARY

| Phase     | Name                | Est. Hours    | Critical Path |
| --------- | ------------------- | ------------- | ------------- |
| Phase 0   | Environment Setup   | 3h            | Yes           |
| Phase 1   | Core Infrastructure | 5h (+1h)      | Yes           |
| Phase 2   | Ingest Pipeline     | 5h            | Yes           |
| Phase 3   | AI Triage Layer     | 5h (+1h)      | Yes           |
| Phase 4   | Alert Delivery      | 5h (+1h)      | Yes           |
| Phase 5   | Frontend PWA        | 6h (+1h)      | Yes           |
| Phase 6   | Ops Dashboard       | 3h            | No            |
| Phase 7   | Integration Testing | 4h            | Yes           |
| Phase 8   | Submission          | 3h            | Yes           |
| **Total** |                     | **~39 hours** |               |

> **Opus revision:** Total increased from 35h to 39h. With safe cuts (Huginn, NAPTIP mock, i18n defer): ~22h minimum demo path.

---

## CRITICAL PATH (minimum to demo)

```
T-001 → T-005 → T-010 → T-011 → T-020 → T-025 → T-030
→ T-031 → T-035 → T-040 → T-045 → T-046 → T-060 → T-061 → T-070
```
Translation: AWS → Docker → DB → Crucix → Qwen → WhatsApp intake → FLASH broadcast → PWA → end-to-end test → submit

---

## PARALLEL TRACKS

Once T-010 (Aurora) is done, these can run simultaneously:

| Track A                    | Track B                    | Track C                    |
| -------------------------- | -------------------------- | -------------------------- |
| Crucix setup (T-020–T-024) | Qwen service (T-030–T-034) | PWA scaffold (T-045–T-047) |
| USSD handler (T-038)       | Whisper service (T-035)    | i18n setup (T-048)         |

---

## LLM ASSIGNMENT GUIDE

> **Array format:** `["first_choice", "second_choice", ...]` — index 0 = best fit for the task.
> Every task below has an `**LLM:**` field. Use this table as the quick reference.

### Model Strengths

| Model          | Best For                                                                                                               | Avoid For                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Opus 4.6**   | Complex architecture, multi-file refactoring, safety-critical prompt design, long-form writing, state machines         | Simple CRUD, boilerplate config                     |
| **Sonnet 4.5** | Fast implementation, moderate complexity code, API integrations, test scripts, SQL                                     | Tasks needing deep architectural reasoning          |
| **Gemini**     | Research, diagrams, Mermaid rendering, multilingual verification, content polish                                       | Low-level systems code                              |
| **GL5**        | General coding, boilerplate, config files, standard patterns                                                           | Safety-critical or domain-specific Nigerian context |
| **DeepSeek**   | Algorithmic code, Dockerfiles, backend services, SQL optimization                                                      | Nigerian language/cultural context                  |
| **Qwen**       | Nigerian language tasks (Hausa/Yoruba/Igbo/Pidgin), multilingual prompts, self-testing                                 | Infrastructure tasks                                |
| **Human**      | AWS console, account creation, visual builders (Appsmith/n8n), screen recording, testing on real devices, Hausa review | Repetitive code generation                          |

### Summary by Task Category

| Category               | # Tasks | Primary LLM           | Human Required?      |
| ---------------------- | ------- | --------------------- | -------------------- |
| AWS/Infra provisioning | 8       | Human                 | ✅ Always             |
| SQL/Schema             | 2       | Sonnet 4.5            | Run only             |
| Docker/Config          | 2       | Sonnet 4.5            | Run only             |
| Backend services       | 10      | Opus 4.6 / Sonnet 4.5 | n8n visual editor    |
| AI/Prompt engineering  | 4       | Opus 4.6              | —                    |
| Frontend/React         | 5       | Sonnet 4.5            | Deployment           |
| Ops dashboard          | 3       | Human (Appsmith)      | ✅ Always             |
| Testing                | 5       | Human                 | ✅ Always             |
| Submission             | 4       | Opus 4.6 + Human      | ✅ Recording + submit |

---

## PHASE 0 — ENVIRONMENT SETUP
*Day 1, morning. ~3 hours. Do this first, in order.*

---

### T-001 · AWS account and IAM setup
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 20 min
**Depends on:** —
**Status:** [X] TODO
**LLM:** `["Human"]` — AWS console operations, credential management. No LLM can click through AWS UI.

**Steps:**
1. Log in to AWS console
2. Create IAM user `ravencry-deploy` with programmatic access
3. Attach policies: AmazonRDSFullAccess, AmazonDynamoDBFullAccess, AmazonS3FullAccess, SecretsManagerReadWrite, EC2FullAccess
4. Save access key + secret key to 1Password / secure notes
5. Configure AWS CLI: `aws configure`

**Definition of Done:** `aws sts get-caller-identity` returns ravencry-deploy ARN

---

### T-002 · GitHub repo initialisation
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 15 min
**Depends on:** —
**Status:** [ ] TODO
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Scaffold files (.gitignore, .env.example, folder structure). Human creates the repo on GitHub, LLM generates boilerplate.

**Steps:**
1. Create GitHub repo: `ravencry` (public for hackathon judges)
2. Init monorepo structure per design.md Section 9
3. Commit `.env.example` with all keys documented
4. Add `.gitignore` (node_modules, .env, *.pem, dist/)
5. Add MIT LICENSE

**Definition of Done:** Repo public, README placeholder committed

---

### T-003 · Vercel project creation
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 10 min
**Depends on:** T-002
**Status:** [ ] TODO
**LLM:** `["Human"]` — Vercel web UI, account linking. No LLM can do this.

**Steps:**
1. vercel.com → New Project → Import from GitHub → select ravencry
2. Set root directory: `apps/web`
3. Add env vars: NEXT_PUBLIC_API_URL (placeholder for now), NEXT_PUBLIC_VAPID_KEY
4. Deploy (will fail, that's fine — just need the project created)

**Definition of Done:** Vercel project exists, deployment URL allocated (e.g. ravencry-web.vercel.app)

---

### T-004 · Africa's Talking sandbox registration
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 20 min
**Depends on:** —
**Status:** [x] DONE (SMS/USSD only — WhatsApp not available on AT)
**LLM:** `["Human"]` — Web registration, sandbox activation.

**Steps:**
1. Register at africastalking.com → Sandbox environment
2. Create application: `RAVENCRY`
3. Enable: SMS, USSD ~~, WhatsApp~~ (AT does NOT offer WhatsApp in sandbox)
4. Note: API key, username, shortcode, USSD service code
5. Add to AWS Secrets Manager (T-009)

**⚠️ Issue:** AT sandbox only provides SMS, USSD, Airtime, Voice, Mobile Data. No WhatsApp/Chat access. WhatsApp moved to Meta Cloud API (see T-006B).

**Definition of Done:** Can send test SMS from AT sandbox to simulator

---

### T-005 · Qwen API key provisioning
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 10 min
**Depends on:** —
**Status:** [x] TODO
**LLM:** `["Human"]` — Cloud console login, API key generation.

**Steps:**
1. Log in to Alibaba Cloud / Qwen Cloud console (qwencloud-hackathon.devpost.com)
2. Navigate to DashScope → API Keys → Create
3. Note key (starts with sk-)
4. Test: `curl -X POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions -H "Authorization: Bearer $KEY" ...`

**Definition of Done:** curl returns a valid completion response

---

### T-006 · Telegram bot creation
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 10 min
**Depends on:** —
**Status:** [x] DONE (as of 2026-06-16)
**LLM:** `["Human"]` — Telegram BotFather interaction, channel creation.

**Steps:**
1. Telegram → @BotFather → /newbot → name: RAVENCRY Alert Bot → username: ravencry_alert_bot
2. Note BOT_TOKEN
3. Create two channels: RAVENCRY Alerts (public), RAVENCRY Ops (private)
4. Add bot as admin to both channels
5. Note channel IDs

**Definition of Done:** Bot responds to /start in private chat

---

### T-006B · Meta WhatsApp Cloud API setup `[ADDED]`
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 30 min
**Depends on:** —
**Status:** [x] DONE (2026-07-07 — Graph API v25.0 confirmed, HTTP 200 with `wamid`)
**LLM:** `["Human"]` — Meta Business portal setup, webhook configuration. Requires Facebook account.

**Steps:**
1. Go to developers.facebook.com → Create App → Type: Business → Add WhatsApp product
2. In WhatsApp → API Setup: note Phone Number ID, Business Account ID, Temporary Access Token
3. Send test message: `curl -X POST https://graph.facebook.com/v21.0/{PHONE_ID}/messages -H 'Authorization: Bearer {TOKEN}' -H 'Content-Type: application/json' -d '{"messaging_product":"whatsapp","to":"{YOUR_NUMBER}","type":"text","text":{"body":"RAVENCRY test"}}'`
4. Configure webhook: URL = `https://api.ravencry.cv/whatsapp/webhook`, Verify Token = `ravencry-webhook-verify`
5. Subscribe to webhook fields: `messages`
6. Generate permanent System User token (Settings → Business Settings → System Users)
7. Add tokens to AWS Secrets Manager: `ravencry/prod/meta-whatsapp-token`, `ravencry/prod/meta-phone-number-id`

**Definition of Done:** Test message received on your phone. Webhook verification passes.

**Note:** Free tier allows 1,000 free service conversations/month. Sufficient for hackathon + early MVP.

---

### T-007 · EC2 instance provisioning
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 20 min
**Depends on:** T-001
**Status:** [x] TODO
**LLM:** `["Human"]` — AWS console, SSH. LLM can generate the Caddy install script, but human must execute.

**Steps:**
1. Launch EC2: t3.large (8GB RAM), Ubuntu 24.04 LTS, 30GB gp3 storage
2. Security group: inbound 22 (SSH, your IP only), 80, 443, 3001 (Crucix API)
3. Create key pair, download .pem
4. SSH in, run: `sudo apt update && sudo apt install docker.io docker-compose-v2 -y`
5. Add ubuntu user to docker group: `sudo usermod -aG docker ubuntu`
6. Install Caddy: `sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && echo 'deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main' | sudo tee /etc/apt/sources.list.d/caddy-stable.list && sudo apt update && sudo apt install caddy`

**Definition of Done:** `docker run hello-world` succeeds on EC2. `caddy version` returns version.

---

### T-008 · Aurora PostgreSQL provisioning
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 40 min
**Depends on:** T-001
**Status:** [x] TODO
**LLM:** `["Human"]` — AWS RDS console/CLI, VPC/security group config.

**Steps:**
1. Tear down old standard RDS PostgreSQL instance (if exists): `delete-db-instance --skip-final-snapshot`
2. AWS RDS → Create Aurora cluster: `aurora-postgresql` engine, version 16.4
3. Create writer instance: db.t3.medium (Aurora minimum, no micro available)
4. Master username: ravencry_admin
5. VPC: same as EC2. Subnet group: `ravencry-db-subnets`. No public access.
6. Security group: allow inbound 5432 from EC2 security group only
7. Note: cluster endpoint, port, username, password
8. Enable extensions: `CREATE EXTENSION IF NOT EXISTS postgis;` + `CREATE EXTENSION IF NOT EXISTS vector;`

**Definition of Done:** `psql $DATABASE_URL` connects from EC2. `SELECT postgis_version()` returns version. `SELECT extversion FROM pg_extension WHERE extname = 'vector'` returns version. H0 hackathon requirement (Aurora PostgreSQL) satisfied.

---

### T-009 · AWS Secrets Manager setup
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 15 min
**Depends on:** T-001
**Status:** [x] TODO
**LLM:** `["Human"]` — AWS Secrets Manager console.

**Steps:**
Create the following secrets (all in us-east-1):
- `ravencry/prod/db-url` = postgres://ravencry_admin:{pass}@{endpoint}:5432/ravencry
- `ravencry/prod/qwen-api-key`
- `ravencry/prod/africastalking-key`
- `ravencry/prod/africastalking-username`
- `ravencry/prod/telegram-bot-token`
- `ravencry/prod/telegram-alert-channel-id`
- `ravencry/prod/telegram-ops-channel-id`
- `ravencry/prod/n8n-webhook-secret`
- `ravencry/prod/vapid-private-key`
- `ravencry/prod/vapid-public-key`

**Definition of Done:** `aws secretsmanager get-secret-value --secret-id ravencry/prod/db-url` returns value

---

### T-010 · DynamoDB tables creation
**Phase:** [HACKATHON] Phase 0
**Layer:** INFRA
**Estimate:** 15 min
**Depends on:** T-001
**Status:** [x] TODO
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Can generate the AWS CLI `create-table` commands. Human executes or reviews in console.

**Steps:**
Create 3 tables (on-demand billing):
1. `ravencry-alerts`: PK=alert_id (S), SK=created_at (S). GSI: case-index (PK=case_id, SK=created_at)
2. `ravencry-sweep-log`: PK=sweep_id (S), SK=swept_at (S). TTL attribute: sweep_ttl
3. `ravencry-sessions`: PK=session_key (S). TTL attribute: expires_at

**Definition of Done:** All 3 tables visible in DynamoDB console, on-demand billing confirmed

---

## PHASE 1 — CORE INFRASTRUCTURE
*Day 1, morning. ~4 hours.*

---

### T-011 · Aurora: run schema migrations
**Phase:** [HACKATHON] Phase 1
**Layer:** INFRA
**Estimate:** 30 min
**Depends on:** T-008
**Status:** [x] TODO
**LLM:** `["Sonnet 4.5", "Opus 4.6", "DeepSeek"]` — SQL migration file generation from schema spec. Sonnet handles this fast; Opus for complex constraint logic.

**Steps:**
1. SSH to EC2, install psql: `sudo apt install postgresql-client -y`
2. Connect: `psql $DATABASE_URL`
3. Run migrations 001 through 014 in order from `db/migrations/`
4. Verify: `\dt` shows all 10 tables. `\dx` shows postgis + pg_trgm + uuid-ossp active.

**Definition of Done:** `SELECT id FROM cases LIMIT 1` runs without error. `SELECT postgis_version()` returns version string. `SELECT email FROM operators LIMIT 1` returns `admin@ravencry.cv`.

---

### T-012 · S3 bucket and lifecycle policy
**Phase:** [HACKATHON] Phase 1
**Layer:** INFRA
**Estimate:** 15 min
**Depends on:** T-001
**Status:** [x] TODO
**LLM:** `["Human"]` — AWS S3 console. LLM can generate lifecycle JSON policy to paste in.

**Steps:**
1. Create bucket: `ravencry-media-prod` in us-east-1
2. Block all public access: ✅
3. Apply lifecycle policy from design.md Section 3 (delete originals after 3 days, audio after 1 day)
4. Create IAM policy for EC2 to access bucket: PutObject, GetObject, DeleteObject on arn:aws:s3:::ravencry-media-prod/*

**Definition of Done:** Lifecycle rules visible in S3 console. EC2 can upload test file: `aws s3 cp test.txt s3://ravencry-media-prod/test.txt`

---

### T-013 · Docker Compose: base setup on EC2
**Phase:** [HACKATHON] Phase 1
**Layer:** INFRA
**Estimate:** 30 min
**Depends on:** T-007
**Status:** [x] DONE (files created; deploy on EC2 pending human execution)
**LLM:** `["Sonnet 4.5", "DeepSeek", "GL5"]` — docker-compose.yml generation, Dockerfile authoring. Straightforward config work.

**Steps:**
1. `git clone` monorepo to EC2
2. Copy `.env.example` to `.env`, fill all values from Secrets Manager
3. Build all images: `docker compose build`
4. Start all services: `docker compose up -d`
5. Check all healthy: `docker compose ps`

**Files created:**
- `docker-compose.yml` — 7 services (caddy, api, crucix, llm, whisper, n8n, appsmith)
- `docker-compose.dev.yml` — dev overrides (hot reload, debug flags)
- `Caddyfile` — reverse proxy with rate limiting + IP whitelist for internal services
- `.env.example` — 40+ env vars with docs
- `services/api/Dockerfile` — multi-stage Node.js 20 (production + dev targets)
- `services/api/package.json` — Express 4 + TypeScript dependencies
- `services/api/tsconfig.json` — strict TS config
- `services/api/src/index.ts` — Express server with all 12 API endpoints (health, reports, sightings, alerts, SSE, ops, auth)
- `services/llm/Dockerfile` — multi-stage Node.js 20
- `services/llm/package.json` — Express + OpenAI SDK
- `services/llm/tsconfig.json`
- `services/llm/src/index.ts` — 4 AI endpoints (/extract, /classify, /classify-osint, /check-authenticity) using existing provider abstraction
- `services/llm/src/prompts/extract.ts` — QW-01 multilingual extraction prompt (EN/HA/YO/IG/Pidgin)
- `services/llm/src/prompts/classify.ts` — QW-02 severity classification (FLASH rules)
- `services/crucix/Dockerfile` — multi-stage, stub until T-020 fork
- `services/crucix/package.json`
- `services/crucix/src/index.mjs` — health endpoint stub (full impl in T-020)
- `services/whisper/Dockerfile` — Python 3.11 + faster-whisper (pre-downloads model at build)
- `services/whisper/requirements.txt` — faster-whisper, flask, gunicorn
- `services/whisper/whisper_server.py` — /transcribe + /health, VAD, language detection

**Definition of Done:** All 6 services show healthy status. `curl localhost:3001/health` returns `{"status":"ok"}`

---

### T-014 · Seed database with test data
**Phase:** [HACKATHON] Phase 1
**Layer:** INFRA
**Estimate:** 15 min
**Depends on:** T-011
**Status:** [ ] TODO
**LLM:** `["Sonnet 4.5", "Qwen", "Gemini"]` — Realistic Nigerian seed data (names, locations, LGAs). Qwen/Gemini strong on Nigerian cultural context for realistic test personas.

**Steps:**
1. Run `psql $DATABASE_URL < db/seed.sql`
2. Verify: `SELECT COUNT(*) FROM cases` → 4. `SELECT COUNT(*) FROM subscribers` → 50.
3. Confirm admin operator: `SELECT email FROM operators` → admin@ravencry.cv

**Definition of Done:** Seed data present. Can log into Appsmith with admin@ravencry.cv / change-me-now.

---

### T-015 · Express API gateway scaffold `[ADDED]`
**Phase:** [HACKATHON] Phase 1
**Layer:** BACKEND
**Estimate:** 60 min
**Depends on:** T-011, T-013
**Status:** [x] DONE (2026-06-19)
**LLM:** `["Opus 4.6", "Sonnet 4.5", "DeepSeek"]` — Complex multi-endpoint Express + TypeScript service with race condition guards, rate limiting, SSE. Opus excels at this architectural scope.

**Steps:**
1. Create `services/api/` with Express 4 + TypeScript
2. Implement endpoints from design.md Section 4: /api/reports, /api/sightings, /api/alerts/active, /api/cases/:id, /api/subscribe, /api/health, /events (SSE)
3. Implement operator endpoints: /api/ops/alerts/:id/approve (with `WHERE status = 'pending'` race guard), /api/ops/alerts/:id/suppress, /api/ops/queue
4. Add consistent error format: `{ error, code, details? }` per NFR-012
5. Add rate limiting middleware per NFR-005
6. Add `AUTO_APPROVE_FLASH` ENV flag support
7. Add to docker-compose.yml

**Definition of Done:** `curl localhost:3003/api/health` returns `{"status":"ok"}`. All public endpoints return proper error format on bad input.

---

## PHASE 2 — INGEST PIPELINE
*Day 1, afternoon. ~5 hours.*

---

### T-020 · Crucix: fork and baseline run
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** 30 min
**Depends on:** T-013
**Status:** [x] TODO
**LLM:** `["Human", "Sonnet 4.5"]` — Human forks the repo and runs npm install. Sonnet reviews baseline config, identifies needed changes.

**Steps:**
1. Fork CrucixAI/crucix into ravencry monorepo under `services/crucix/`
2. `npm install` in services/crucix
3. `npm run dev` → confirm sweep runs with default sources
4. Access Crucix HUD: http://localhost:3001

**Definition of Done:** Crucix dashboard loads. At least 1 sweep completes without error.

---

### T-021 · Crucix: add nigeria-keywords.json
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** 30 min
**Depends on:** T-020
**Status:** [x] DONE
**LLM:** `["Sonnet 4.5", "Qwen", "Gemini"]` — Nigerian kidnapping keywords in Hausa/Yoruba/Igbo/Pidgin. Qwen has strong multilingual Nigerian language coverage. Gemini for research verification.

**Steps:**
1. Create `services/crucix/config/nigeria-keywords.json` per prompt 04 spec
2. Export utility: `loadKeywords()` used by all source modules
3. Write unit test: keyword matching works for Hausa and English terms

**Definition of Done:** `loadKeywords().kidnapping.hausa` returns array of Hausa kidnapping terms

---

### T-022 · Crucix: add 4 Nigeria source modules
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** 90 min
**Depends on:** T-021
**Status:** [x] DONE (2026-06-21)
**LLM:** `["Opus 4.6", "Sonnet 4.5", "DeepSeek"]` — 4 source modules with API integration (GDELT, RSS, Aurora polling). Complex async patterns. Opus handles the full-scope module design best.

**Steps:**
1. Create `apis/sources/naptip-rss.mjs` — poll NAPTIP feed, filter by keywords
2. Create `apis/sources/gdelt-nigeria.mjs` — GDELT API v2 with Nigeria kidnapping query
3. Create `apis/sources/nigeria-news-rss.mjs` — 5 feeds in parallel, keyword filter
4. Create `apis/sources/citizen-reports.mjs` — Aurora query for pending_sweep cases
5. Register all 4 in Crucix source loader

**Definition of Done:** All 4 sources show green in Crucix HUD. `gdelt-nigeria` returns ≥1 event on first sweep.

---

### T-023 · Crucix: modify tier mapping + FLASH webhook
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** 45 min
**Depends on:** T-022
**Status:** [x] DONE (2026-06-21)
**LLM:** `["Sonnet 4.5", "DeepSeek", "GL5"]` — Modifying existing Crucix briefing.mjs. Pattern matching and webhook wiring. Moderate complexity.

**Steps:**
1. Update `apis/briefing.mjs`: replace default tiers with FLASH/PRIORITY/ROUTINE constants
2. Add n8n webhook emitter: fires POST to N8N_WEBHOOK_URL when FLASH event finalised
3. Add Nigeria context to any LLM prompt in briefing.mjs
4. Update alert-templates.json with RAVENCRY message formats

**Definition of Done:** Manual FLASH test event triggers n8n webhook (check n8n execution log)

---

### T-024 · ~~Huginn: OSINT agents setup~~ `[CUT — Opus optimization]`
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** ~~45 min~~ 0 min
**Status:** [x] CUT

**Reason:** Huginn adds ~2GB RAM for RSS polling that Crucix handles natively via its source modules (gdelt-nigeria, nigeria-news-rss, naptip-rss). Cutting saves RAM on the t3.large and 45 min of setup time. OSINT polling is handled by Crucix sweep intervals.

---

### T-025 · n8n: WF-03 OSINT ingestion workflow
**Phase:** [HACKATHON] Phase 2
**Layer:** BACKEND
**Estimate:** 60 min
**Depends on:** T-022, T-030
**Status:** [x] DONE (2026-06-22)
**LLM:** `["Sonnet 4.5", "Human"]` — Sonnet designs the workflow logic + generates the JSON export. Human builds it in n8n visual editor (drag-and-drop nodes cannot be automated).

**Steps:**
1. Create n8n workflow: Crucix OSINT webhook trigger → Qwen QW-03 classify → IF actionable → dedup check via pg_trgm → INSERT draft case
2. Test: manually trigger with sample Punch News kidnapping headline
3. Export as `n8n-workflows/wf-03-osint-ingestion.json`

**Definition of Done:** Webhook test fires successfully. All 10 nodes execute green. Sample headline creates `pending_review` case in DB. Dedup gate correctly blocks duplicate inserts on re-run. Full guide in `steps3.md`. Local Docker Postgres setup in `steps3_db_docker.md`.

**Key files:**
- `steps3.md` — full node-by-node build guide
- `steps3_db_docker.md` — local Postgres + PostGIS setup for Node 6-8 testing
- `pending_fix.md` — production fixes required for Aurora (enum + env)

---

## PHASE 3 — AI TRIAGE LAYER
*Day 1, evening. ~4 hours.*

---

### T-030 · Qwen service: scaffold + QW-01 extraction
**Phase:** [HACKATHON] Phase 3
**Layer:** AI
**Estimate:** 60 min
**Depends on:** T-005, T-013
**Status:** [X] DONE
**LLM:** `["Opus 4.6", "Sonnet 4.5", "Qwen"]` — Complex multilingual prompt engineering with Nigerian language edge cases. Opus excels at safety-critical prompt design. Qwen useful for testing its own behavior.

**Steps:**
1. ~~Create `services/qwen/index.mjs`, `client.mjs`, `prompts/extract.mjs`~~ → Enhanced existing `services/llm/` (LLM-agnostic design)
2. ~~Implement POST /extract endpoint~~ → Already existed at `/extract`
3. Wire QW-01 prompt template per prompt-06 spec → Added `language_detected` + `missing_critical_fields` to schema
4. Added output validation in `validation/schema.ts` with defaults fallback
5. Run test suite → 5 language tests (hausa, yoruba, igbo, pidgin, mixed) all pass

**Definition of Done:** All 5 language test cases pass. Hausa report correctly extracts name, location, circumstance.
**Done:** 2026-06-22. 6 test files / 8 tests / 0 errors.

---

### T-031 · Qwen service: QW-02 severity classification
**Phase:** [HACKATHON] Phase 3
**Layer:** AI
**Estimate:** 45 min
**Depends on:** T-030
**Status:** [X] DONE
**LLM:** `["Opus 4.6", "Sonnet 4.5"]` — Safety-critical classification logic. FLASH rules must never miss a child abduction. Opus for the rule design, Sonnet for implementation speed.

**Steps:**
1. ~~Create `prompts/classify.mjs`~~ → Already existed at `services/llm/src/prompts/classify.ts`
2. ~~Implement POST /classify endpoint~~ → Already existed at `/classify`
3. Added `escalating_factors`, `de_escalating_factors`, `recommended_action`, `operator_note` to prompt schema
4. Synced `ClassificationResult` type, added `validateClassifyOutput()`, wired safe defaults
5. Test: child abduction Zamfara → FLASH. Adult missing Lagos → ROUTINE. Weapons → FLASH. Abuja-Kaduna → PRIORITY.

**Definition of Done:** All classification rules from FR-006 produce correct output. 6 classification tests pass.
**Done:** 2026-06-22. 6 test files / 14 tests / 0 errors.

---

### T-032 · Qwen service: QW-03 OSINT + QW-04 anti-fake
**Phase:** [HACKATHON] Phase 3
**Layer:** AI
**Estimate:** 45 min
**Depends on:** T-031
**Status:** [X] DONE
**LLM:** `["Sonnet 4.5", "Opus 4.6", "DeepSeek"]` — Two additional prompt templates (OSINT + anti-fake). Moderate complexity. Sonnet handles well at speed.

**Steps:**
1. ~~Create `prompts/osint.mjs` and `prompts/antifake.mjs`~~ → Populated empty stubs at `services/llm/src/prompts/osint.ts` + `antifake.ts`
2. ~~Implement POST /classify-osint and POST /check-authenticity~~ → Already existed; replaced inline prompts, added validation + safe defaults
3. Test QW-03: Punch headline → `actionable: true`, `create_draft_case` ✅
4. Test QW-04: recycled image metadata → `hold_for_review` ✅
5. **Anti-fake design:** Trust-by-default — defaults to `legitimate` (0.7 score). Requires 3+ red flags before `hold_for_review`. False positives harm victims.

**Definition of Done:** Both endpoints return correct JSON for test inputs. 9 new tests pass.
**Done:** 2026-06-22. 8 test files / 23 tests / 0 errors.

---

### T-035 · Whisper service: Docker build and transcription
**Phase:** [HACKATHON] Phase 3
**Layer:** AI
**Estimate:** 45 min
**Depends on:** T-013
**Status:** [X] DONE
**LLM:** `["Sonnet 4.5", "DeepSeek", "GL5"]` — Dockerfile + Python Flask wrapper for Whisper model. Standard ML serving pattern.

**Steps:**
1. ~~Create `services/whisper/Dockerfile` and `whisper_server.py`~~ → Already existed from T-013
2. ~~`docker build` and add to docker-compose.yml~~ → Already in docker-compose.yml as `whisper` service (port 8000)
3. Fixed bugs: `start_time` undefined under gunicorn, model cache downloaded as wrong user
4. Added `test_transcribe.py` verification script
5. **Human action required:** `docker compose build whisper && docker compose up -d whisper`, then test with `curl -X POST http://localhost:8000/transcribe -F 'audio=@test_hausa.ogg'`

**Definition of Done:** Voice note in Hausa produces readable transcript. Language detected as Hausa.
**Done:** 2026-06-22. Service ready; Docker build + real audio test pending human execution (requires model download ~1.5GB).

---

### T-036 · n8n: WF-01 WhatsApp intake workflow
**Phase:** [HACKATHON] Phase 3
**Layer:** BACKEND
**Estimate:** 90 min
**Depends on:** T-030, T-035, T-011, T-006B
**Status:** [X] DONE
**LLM:** `["Opus 4.6", "Sonnet 4.5", "Human"]` — 11-node n8n workflow with 3 service integrations. Opus for architecture design. Human required for n8n visual editor.

**Steps:**
1. ~~Create n8n workflow with 11 nodes per prompt-05 spec~~ → `steps5.md` guide created (8-node WF-01 build guide)
2. ~~Wire: Meta WhatsApp webhook → message type branch → Whisper (audio) or S3 (image) → Qwen → RDS INSERT → Meta reply~~ → Architecture documented; WhatsApp handler (`services/whatsapp/src/handler.ts`) forwards structured payloads to n8n
3. ~~Test: send text WhatsApp message → case created in RDS~~ → curl test commands in steps5.md
4. ~~Test: send audio message → transcribed → case created~~ → Audio branch documented
5. Export as `n8n-workflows/wf-01-whatsapp-intake.json` → Export from n8n UI after building

**Definition of Done:** WhatsApp text + audio report both create cases in RDS. Confirmation message received back via Meta API.
**Done:** 2026-06-22. Code + guide ready; n8n build + real WhatsApp test pending human execution (requires T-006B Meta setup + n8n visual editor).

---

## PHASE 4 — ALERT DELIVERY
*Day 2, morning. ~4 hours.*

---

### T-040 · Telegram bot: commands + broadcast
**Phase:** [HACKATHON] Phase 4
**Layer:** BACKEND
**Estimate:** 45 min
**Depends on:** T-006, T-013
**Status:** [X] DONE (2026-06-23)
**LLM:** `["Sonnet 4.5", "DeepSeek", "GL5"]` — Telegram Bot API integration. Well-documented API, moderate complexity.

**What was done:**
1. Created `services/telegram/` — full Express + TypeScript service on port 3005
2. Bot commands: /start, /report, /sighting, /status (with API gateway lookup), /help
3. FLASH broadcast: sendPhoto with MarkdownV2 caption → fallback to plain text on photo/parse failure
4. PRIORITY broadcast: text-only to alert channel
5. Ops notifications: private ops channel for broadcast status + errors
6. Webhook handler: POST /telegram/webhook (async processing, 200 ack)
7. Broadcast endpoint: POST /telegram/broadcast (service-to-service auth)
8. Dockerized: multi-stage Dockerfile, added to docker-compose.yml
9. Caddy: direct reverse proxy route `api.ravencry.cv/telegram/* → telegram:3005`
10. API gateway: http-proxy-middleware pass-through for dev/testing
11. Tests: 21 tests (templates, bot commands, broadcast) — all passing
12. Templates: MarkdownV2 escaping, plain text fallback, FLASH/PRIORITY/OPS formats

**Human action required:**
- Run `docker compose build telegram && docker compose up -d telegram`
- Set webhook: `curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://api.ravencry.cv/telegram/webhook`
- Test /start on Telegram

**Definition of Done:** /start responds. Test FLASH broadcast delivers formatted message with photo to alert channel.
**Done:** 2026-06-23. Code, tests, and infra complete. Webhook set + real test pending human execution.

---

### T-041 · Africa's Talking SMS service
**Phase:** [HACKATHON] Phase 4
**Layer:** BACKEND
**Estimate:** 30 min
**Depends on:** T-004, T-013
**Status:** [x] DONE (2026-06-26)
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Africa's Talking SDK integration. Standard REST API wrapper.

**What was done:**
1. Created `services/sms/` — full Express + TypeScript service on port 3006
2. `sender.ts`: AT SDK wrapper with batch sending (100 recipients/batch), chunkArray, graceful failure-per-batch
3. `templates.ts`: FLASH (multi-segment) and PRIORITY (single-segment ≤160 chars) SMS formats with reporting CTAs
4. `index.ts`: Express server with `/health`, `/sms/broadcast` (batch), `/sms/send` (single test) endpoints
5. Service-to-service auth via `X-Service-Auth` header with `SERVICE_AUTH_TOKEN` env
6. Dockerized: multi-stage Dockerfile, added to `docker-compose.yml`, `docker-compose.dev.yml`
7. Caddy: `api.ravencry.cv/sms/* → sms:3006` route with rate limiting (100 req/min/IP)
8. Type declaration: `africastalking.d.ts` for the untyped CommonJS SDK
9. Tests: 15 tests (templates, SMS length constraints) — all passing

**Human action required:**
- Run `docker compose build sms && docker compose up -d sms`
- Test single SMS: `curl -X POST http://localhost:3006/sms/send -H 'Content-Type: application/json' -H 'X-Service-Auth: {SERVICE_AUTH_TOKEN}' -d '{"to":"+2348012345678","message":"RAVENCRY test SMS from T-041"}'`
- Test batch broadcast: `curl -X POST http://localhost:3006/sms/broadcast -H 'Content-Type: application/json' -H 'X-Service-Auth: {SERVICE_AUTH_TOKEN}' -d '{"phones":["+2348012345678","+2348012345679","+2348012345680"],"case":{"case_id":"test-2","person_name":"Test Alert","alert_tier":"PRIORITY","last_seen_lga":"Ikeja","last_seen_state":"Lagos"}}'`
- Verify delivery in AT Sandbox dashboard

**Definition of Done:** Batch of 3 test SMS sent and delivered in AT sandbox
**Done:** 2026-06-26. Code, tests, Docker, and Caddy config complete. Docker build + real AT sandbox test pending human execution.

---

### T-042 · USSD handler
**Phase:** [HACKATHON] Phase 4
**Layer:** BACKEND
**Estimate:** 60 min
**Depends on:** T-004, T-011, T-010
**Status:** [x] DONE (2026-06-27)
**LLM:** `["Opus 4.6", "Sonnet 4.5"]` — Complex stateful USSD menu tree with DynamoDB session management. Multi-level branching + state machine. Opus for the state design.

**What was done:**
1. Created `services/ussd/` — full Express + TypeScript service on port 3007
2. State machine: 4 branches (report, sighting, alert lookup, subscribe/unsubscribe) using AT text accumulation
3. Aurora PostgreSQL: transactional case creation (persons + cases), sightings, subscriber management
4. DynamoDB rate limiting: `ravencry-sessions` table, key `ussd-rl:{hash}`, 3 reports/phone/24h, fail-open design
5. Menu text: CON/END prefixed, USSD character limits (~182 chars), alert formatting with truncation
6. Dockerized: multi-stage Dockerfile, added to docker-compose.yml + docker-compose.dev.yml
7. Caddy: `/ussd/*` → `ussd:3007` route for AT callbacks
8. Tests: 38 tests (25 handler + 13 menus) — all passing

**Human action required:**
- Run `docker compose build ussd && docker compose up -d ussd`
- AT Dashboard: create USSD service `*384*72836#`, callback URL: `https://api.ravencry.cv/ussd/callback`
- Test with AT USSD Simulator: dial `*384*72836#` → complete report flow → verify case in Aurora

**Definition of Done:** Complete USSD report flow works in AT simulator. Case appears in Aurora.

---

### T-043 · n8n: WF-02 FLASH broadcast workflow
**Phase:** [HACKATHON] Phase 4
**Layer:** BACKEND
**Estimate:** 90 min
**Depends on:** T-040, T-041, T-023
**Status:** [X] DONE (2026-06-27 — code + guide ready; n8n build + real test pending human)
**LLM:** `["Opus 4.6", "Sonnet 4.5", "Human"]` — Complex multi-channel broadcast orchestration (4 parallel delivery channels + geofence + error handling). Human builds in n8n editor.

**What was done:**
1. Created `steps8.md` — full node-by-node build guide (13 nodes) for n8n visual editor
2. Added n8n webhook call to API gateway approve route (`services/api/src/routes/ops.ts`) — fire-and-forget POST to n8n WF-02
3. Created `services/api/src/routes/internal.ts` — push broadcast endpoint (`POST /api/internal/push-broadcast`) + delivery log endpoint (`POST /api/internal/delivery-log`)
4. Created `services/naptip/` — mock NAPTIP webhook server (port 3008, `POST /naptip/webhook`)
5. Registered internal router in API gateway (`services/api/src/index.ts`)
6. Created `steps9.md` — human verification checklist, quick-start commands, file reference, next steps

**Human action required:** See `steps9.md` for full verification checklist. Summary:
- Start NAPTIP mock + API gateway + Telegram + SMS + n8n
- Build WF-02 in n8n editor following `steps8.md`
- Test via curl: `curl -X POST http://localhost:5678/webhook/flash-broadcast ...`
- Export workflow as `n8n-workflows/wf-02-flash-broadcast.json`

**Definition of Done:** Approving a FLASH case triggers all 4 channels within 90 seconds. Alerts table shows delivery counts.

---

### T-044 · NAPTIP bridge implementation
**Phase:** [HACKATHON] Phase 4
**Layer:** INTEGRATION
**Estimate:** 30 min
**Depends on:** T-043
**Status:** [X] DONE (2026-06-27)
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Simple webhook + CAP XML serializer. Low complexity.

**What was done:**
1. Created `services/naptip/src/index.ts` — Express server (port 3008) with `POST /naptip/webhook`, `GET /health`, `GET /naptip/alerts`, `POST /naptip/alerts/clear`
2. Created `services/naptip/package.json` — dependencies (express, dotenv, typescript)
3. WF-02 Node 9 wired as non-blocking (Continue on Fail = true) per steps8.md
4. CAP-JSON payload format matches WF-02 Node 9 body
5. Verified: TypeScript errors resolved, service starts on port 3008, curl test passes

**Human action required:** See `steps9.md` Section 1. Already tested:
- `cd services/naptip && npm install && npx tsx src/index.ts` ✅
- `curl http://localhost:3008/health` ✅
- `curl -X POST http://localhost:3008/naptip/webhook ...` ✅

**Definition of Done:** NAPTIP webhook fires for child cases. Failure of mock endpoint logs warning, broadcast continues.

---

## PHASE 5 — FRONTEND PWA
*Day 2, afternoon. ~5 hours.*

---

### T-045 · Next.js: project scaffold + PWA config
**Phase:** [HACKATHON] Phase 5
**Layer:** FRONTEND
**Estimate:** 30 min
**Depends on:** T-003
**Status:** [X] DONE (2026-07-03)
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Next.js project scaffolding, PWA config. Standard boilerplate. Any good coding LLM handles this.

**Steps:**
1. `npx create-next-app@latest apps/web --typescript --tailwind --app`
2. Install: `npm i next-pwa web-push swr idb leaflet react-leaflet i18next react-i18next`
3. Configure next-pwa in next.config.js per prompt-08 spec
4. Add manifest.json and PWA icons (192px + 512px)

**Definition of Done:** `npm run dev` starts. Lighthouse PWA check shows manifest detected.

---

### T-046 · Alert feed: SSE connection + AlertCard
**Phase:** [HACKATHON] Phase 5
**Layer:** FRONTEND
**Estimate:** 60 min
**Depends on:** T-045, T-043
**Status:** [X] DONE (2026-07-03)
**LLM:** `["Sonnet 4.5", "DeepSeek", "GL5"]` — SSE hook + React components. Standard frontend patterns.

**Steps:**
1. Build `useAlertFeed.ts` hook with SSE connection, reconnect logic
2. Build `AlertCard.tsx`: photo, name, LGA, tier badge, sighting CTA
3. Build `AlertFeed.tsx`: render list from SSE events
4. Wire to home page
5. Test: open PWA → active seeded FLASH cases appear

**Definition of Done:** Alert feed loads with seeded FLASH cases. New alert appears without refresh when WF-02 fires.

---

### T-047 · Report form: 4-step wizard
**Phase:** [HACKATHON] Phase 5
**Layer:** FRONTEND
**Estimate:** 90 min
**Depends on:** T-045
**Status:** [X] DONE (2026-07-03)
**LLM:** `["Opus 4.6", "Sonnet 4.5"]` — Complex multi-step form with photo upload, GPS, offline queue + background sync. Service worker logic. Opus for the offline/sync architecture.

**Steps:**
1. Build Step1–Step4 components per prompt-08 spec
2. Build multi-step shell with progress bar
3. Implement photo upload with 5MB limit
4. Implement GPS location button
5. Implement offline queue (idb) with background sync
6. POST to /api/reports → show case ID on success

**Definition of Done:** Full 4-step flow submits successfully. Offline queue works (disconnect wifi → submit → reconnect → syncs).

---

### T-048 · i18n: EN + HA translations
**Phase:** [HACKATHON] Phase 5
**Layer:** FRONTEND
**Estimate:** 45 min
**Depends on:** T-047
**Status:** [X] DONE (2026-07-03 — also includes Yoruba + Igbo bonus)
**LLM:** `["Qwen", "Gemini", "Sonnet 4.5", "Human"]` — Hausa UI translations require a native speaker to verify. Qwen has best Hausa coverage among LLMs. Gemini for cross-check. **Human (Hausa speaker) MUST review output.**

**Steps:**
1. Set up i18next with language detection
2. Create `public/locales/en/common.json` with all UI strings
3. Create `public/locales/ha/common.json` (Hausa translations)
4. Add LanguageSelector component to header
5. Test: switch to Hausa → all visible strings update

**Definition of Done:** All UI strings available in EN and HA. Language persists on refresh.

---

### T-049 · Alert detail page + map
**Phase:** [HACKATHON] Phase 5
**Layer:** FRONTEND
**Estimate:** 45 min
**Depends on:** T-046
**Status:** [X] DONE (2026-07-03)
**LLM:** `["Sonnet 4.5", "GL5", "DeepSeek"]` — Detail page + Leaflet map. Dynamic import pattern. Standard React.

**Steps:**
1. Build `/alert/[id]` page with full case details
2. Dynamic import Leaflet map (SSR disabled)
3. Show last seen pin on map
4. Add og:image meta tags for WhatsApp link preview
5. Test: share URL → WhatsApp preview shows photo + name

**Definition of Done:** Alert detail page loads. WhatsApp link preview shows correct image and title.

---

### T-050 · Vercel deployment: live URL
**Phase:** [HACKATHON] Phase 5
**Layer:** INFRA
**Estimate:** 20 min
**Depends on:** T-049, T-003
**Status:** [x] TODO
**LLM:** `["Human"]` — Vercel dashboard, env vars, deployment verification. Mobile testing requires human.

**Steps:**
1. Push to GitHub main branch
2. Vercel auto-deploys
3. Set NEXT_PUBLIC_API_URL to EC2 API URL in Vercel env vars
4. Verify live URL loads on mobile
5. Run Lighthouse on live URL

**Definition of Done:** Vercel URL is live. Lighthouse PWA ≥ 90. Lighthouse Performance ≥ 85 on mobile.

---

## PHASE 6 — OPS DASHBOARD
*Day 2, evening. ~3 hours.*

---

### T-055 · Appsmith: connect Aurora and build case table
**Phase:** [HACKATHON] Phase 6
**Layer:** OPS
**Estimate:** 60 min
**Depends on:** T-014, T-013
**Status:** [X] DONE (2026-07-04)
**LLM:** `["Human", "Sonnet 4.5"]` — Appsmith is a visual drag-and-drop builder — LLMs cannot interact with it. Sonnet can generate SQL queries to paste into Appsmith query editor.

**Steps:**
1. Access Appsmith: http://localhost:8080
2. Add datasource: PostgreSQL → connect to Aurora (use private endpoint)
3. Build Cases table page: query open cases, columns: id, name, tier badge, status, created_at, action buttons
4. Add tier filter and status filter

**Definition of Done:** Cases table shows seeded FLASH cases. Tier filter works.

---

### T-056 · Appsmith: approve/suppress flow
**Phase:** [HACKATHON] Phase 6
**Layer:** OPS
**Estimate:** 45 min
**Depends on:** T-055, T-043
**Status:** [X] DONE (2026-07-04)
**LLM:** `["Human", "Sonnet 4.5"]` — Appsmith visual builder. Sonnet can generate the API call code to wire buttons to endpoints.

**Steps:**
1. Add Approve button → POST /api/ops/alerts/:id/approve
2. Add Suppress button → modal for reason → POST /api/ops/alerts/:id/suppress
3. Test: approve seeded FLASH case → n8n WF-02 triggers → broadcast fires

**Definition of Done:** Approve button in Appsmith triggers full broadcast pipeline within 10 seconds.

---

### T-057 · Appsmith: sighting queue + case detail
**Phase:** [HACKATHON] Phase 6
**Layer:** OPS
**Estimate:** 45 min
**Depends on:** T-056
**Status:** [X] DONE (2026-07-04)
**LLM:** `["Human", "Sonnet 4.5"]` — Appsmith visual builder. Sonnet generates queries + map widget config.

**Steps:**
1. Build Sightings page: unprocessed sightings, approve/reject per sighting
2. Build Case detail page: timeline of sightings, Qwen extraction output, trust score
3. Add map widget showing sighting coordinates

**Definition of Done:** Case detail shows all sightings on a map. Timeline is chronologically ordered.

---

## PHASE 7 — INTEGRATION TESTING
*Day 3, morning. ~4 hours.*

---

### T-060 · End-to-end test: USSD → FLASH → SMS
**Phase:** [HACKATHON] Phase 7
**Layer:** TESTING
**Estimate:** 45 min
**Depends on:** T-042, T-043, T-041
**Status:** [X] DONE (2026-07-07)
**LLM:** `["Human"]` — End-to-end manual testing across AT simulator, Appsmith, Telegram, and psql. Requires human to operate multiple systems simultaneously.

**Steps:**
1. Simulate USSD: *384*72836# → 1 → "Fatima" → "9" → "Zamfara Central" → "today 10am"
2. Verify: case in Aurora with status `pending_triage`
3. Trigger Qwen triage: status changes to `pending_review` (child in Zamfara → FLASH)
4. Approve via curl
5. Verify: SMS sent in AT sandbox. Telegram alert posted. NAPTIP webhook received.

**Definition of Done:** Full flow completes. Case `NR-2026-000104` went through entire pipeline: USSD → pending_triage → Qwen FLASH → approve → n8n WF-02 → Telegram ✅, SMS ✅, NAPTIP ✅, Push (0 subs). All 4 channels. Test guide: `integration/test-060.md`. Context log: `integration/testing_context.md`.

---

### T-061 · End-to-end test: WhatsApp voice note → Hausa
**Phase:** [HACKATHON] Phase 7
**Layer:** TESTING
**Estimate:** 30 min
**Depends on:** T-036
**Status:** [x] DONE (2026-07-07 — text path verified E2E; Whisper audio deferred)
**LLM:** `["Human"]` — Requires sending a real voice note via Meta WhatsApp test number + inspecting n8n execution logs and RDS rows.

**Verified:** Hausa text → n8n WF-01 → Qwen extract (`language_detected: "hausa"`) → Qwen classify (`FLASH`) → Aurora (`language='ha'`, `input_channel='whatsapp'`) → Meta reply. Full pipeline works except Whisper transcription (model struggles with Hausa audio — deferred to post-hackathon).

---

### T-062 · Test: geofence enforcement
**Phase:** [HACKATHON] Phase 7
**Layer:** TESTING
**Estimate:** 20 min
**Depends on:** T-043
**Status:** [x] DONE (2026-07-24 — test guide created; human execution pending)
**LLM:** `["Sonnet 4.5", "Human"]` — Sonnet can generate the SQL seed + verification queries. Human runs the test and checks AT delivery logs.

**Steps:**
1. Seed: 1 subscriber in Lagos, 1 in Kano
2. Fire FLASH broadcast for Kano case
3. Verify: Kano subscriber receives SMS. Lagos subscriber does NOT.

**Definition of Done:** Geofence enforced. Lagos subscriber's phone shows no SMS in AT log.
**Done:** 2026-07-24. Full test guide at `integration/test-062.md` (SQL seed, pre-verify geofence query, broadcast trigger, negative test, no-GPS fallback, cleanup). Human execution pending — requires EC2/psql access + AT sandbox + n8n.

---

### T-063 · Test: offline PWA + sync
**Phase:** [HACKATHON] Phase 7
**Layer:** TESTING
**Estimate:** 20 min
**Depends on:** T-047
**Status:** [x] DONE (2026-07-28 — test guide created; human execution pending)
**LLM:** `["Human"]` — Requires Chrome DevTools Network panel, manual offline toggle, physical observation of sync behavior.

**Steps:**
1. Load PWA in Chrome on 3G throttle
2. DevTools → Network → Offline
3. Complete report form → submit
4. Verify: "Saved, will send when online" message shown
5. DevTools → Network → Online
6. Verify: report syncs → case created in Aurora

**Definition of Done:** Offline queue works end-to-end.
**Done:** 2026-07-28. Full test guide at `integration/test-063.md` (7 steps: offline submission → IndexedDB queue → online auto-sync → case in DB → API-down resilience → 4xx drop → alert cache offline). Human execution pending — requires local PWA + API running + Chrome DevTools.

---

### T-064 · Test: anti-fake detection
**Phase:** [HACKATHON] Phase 7
**Layer:** TESTING
**Estimate:** 20 min
**Depends on:** T-032
**Status:** [x] DONE (2026-07-28 — test guide created; human execution pending)
**LLM:** `["Sonnet 4.5", "Human"]` — Sonnet generates the test payloads (fake alert patterns). Human runs and verifies the routing.

**Steps:**
1. POST /api/reports with: known recycled image URL + no specific location + generic description
2. Verify: QW-04 returns `verdict: hold_for_review`
3. Verify: case created with status `pending_review` (not pending_triage)
4. Verify: case does NOT appear in active alerts feed

**Definition of Done:** Anti-fake flag correctly routes to ops review queue, not broadcast.
**Done:** 2026-07-28. Full test guide at `integration/test-064.md` (7 steps: 5 curl test payloads covering legitimate→suspicious→hold_for_review→likely_fake + trust-by-default infra failure test + DB integration check). Human execution pending — requires LLM service running + Qwen API key.

---

## PHASE 8 — HACKATHON SUBMISSION
*Day 3, afternoon. ~3 hours.*

---

### T-070 · Architecture diagram
**Phase:** [HACKATHON] Phase 8
**Layer:** OPS
**Estimate:** 30 min
**Depends on:** T-060
**Status:** [x] DONE (2026-07-24 — submitted, awaiting judges)
**LLM:** `["Gemini", "Sonnet 4.5", "Opus 4.6"]` — Mermaid diagram generation and rendering. Gemini strongest at visual/diagram tasks. Opus for architectural accuracy.

**Steps:**
1. Export Mermaid diagram from design.md as architecture.mermaid
2. Render to PNG: use mermaid CLI or mermaid.live
3. Add to README.md as embedded image
4. Second diagram: Alert Lifecycle Flow

**Definition of Done:** Both diagrams render correctly in GitHub README preview

---

### T-071 · README.md completion
**Phase:** [HACKATHON] Phase 8
**Layer:** OPS
**Estimate:** 45 min
**Depends on:** T-070
**Status:** [x] DONE (2026-07-24 — submitted, awaiting judges)
**LLM:** `["Opus 4.6", "Sonnet 4.5", "Gemini"]` — Comprehensive README with 13 sections. Opus for long-form technical writing with architectural depth. Gemini for polishing.

**Steps:**
Per prompt-10 Part D, complete all 13 README sections including:
- Live Vercel URL
- Screen recording link
- Quick start (10 steps)
- Full API table
- Architecture diagram embedded

**Definition of Done:** README renders correctly on GitHub. All links work.

---

### T-072 · Screen recording
**Phase:** [HACKATHON] Phase 8
**Layer:** OPS
**Estimate:** 30 min
**Depends on:** T-071
**Status:** [x] DONE (2026-07-24 — submitted, awaiting judges)
**LLM:** `["Human"]` — Screen recording with OBS/Loom. No LLM can record a screen or operate the demo flow.

**Steps:**
Follow demo script in prompt-10 Part A exactly. Record with OBS or Loom.
- 5 minutes total
- Show: USSD → Qwen extract → ops approve → Telegram alert → SMS → PWA sighting
- Upload to YouTube (unlisted) or Loom

**Definition of Done:** Recording is 4:30–5:30 minutes. All 5 demo flows visible.

---

### T-073 · Devpost submission
**Phase:** [HACKATHON] Phase 8
**Layer:** OPS
**Estimate:** 45 min
**Depends on:** T-072
**Status:** [x] DONE (2026-07-24 — submitted, awaiting judges)
**LLM:** `["Opus 4.6", "Sonnet 4.5", "Gemini", "Human"]` — Opus/Sonnet write the Devpost project description + pitch text. Gemini for SEO polish. Human submits via Devpost web form.

**Steps:**
Per prompt-10 Part B, complete Devpost submission:
1. Fill all fields from writeup
2. Add video link
3. Add GitHub repo URL
4. Add Vercel URL
5. Add AWS Aurora screenshot (proof of database use)
6. Add tech stack tags
7. Submit both H01 and Qwen Cloud hackathon entries

**Definition of Done:** Both submissions show "Submitted" status on Devpost.

---

## V2 BACKLOG (Post-Hackathon)

- [ ] V2-001 · Facial recognition: InsightFace embeddings on citizen sightings
- [ ] V2-002 · Opt-in private camera network (filling stations, banks)
- [ ] V2-003 · Predictive hotspot model (historical incident heatmap)
- [ ] V2-004 · Offline solar edge nodes (Raspberry Pi + Node-RED)
- [ ] V2-005 · Radio/TV broadcast integration (NTA, Channels API)
- [ ] V2-006 · Yoruba + Igbo full translation coverage
- [ ] V2-007 · Licence plate recognition on toll gate feeds
- [ ] V2-008 · Highway monitoring (Abuja-Kaduna corridor)
- [ ] V2-009 · Banking app alert partnership (GTBank pilot)
- [ ] V2-010 · Community vigilante integration (Amotekun Telegram channel)
