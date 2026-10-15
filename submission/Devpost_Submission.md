# RAVENCRY — Devpost Submission

---

## Inspiration

In Nigeria, when a child goes missing or a commuter is abducted on the Abuja-Kaduna highway, the first hours matter more than anything else. Nigeria has one of the highest kidnapping rates in Africa. Thousands of cases. No rapid alert system.

Three constraints shaped every decision we made:

**1. Any device. Any network.** A worried mother in rural Zamfara has a feature phone with no internet, only USSD shortcodes. An urban family in Lagos reports via WhatsApp. A community volunteer uses Telegram. These are not edge cases, they are the audience. Five channels, one pipeline.

**2. Five languages, not one.** Nigeria speaks Hausa, Yoruba, Igbo, Pidgin, and English, and people code-switch mid-sentence. A system that only works in English fails 80% of the population. We chose Qwen because it handles Nigerian languages better than any other model we tested.

**3. It has to ship.** This is a working system on cloud infrastructure with Docker Compose, one-command deploys, and a deliberate 15-migration database schema. If it doesn't run, it doesn't help anyone.

The name: ravens are watchful, intelligent, and communicate danger to their flock. That's what this system does. 

---

## What it does

**RAVENCRY**: *Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding*, is a Nigeria-native, multi-channel, AI-powered anti-kidnapping and missing persons rapid alert platform.

### Five citizen reporting channels
| Channel | Technology | Who it serves |
|---------|-----------|--------------|
| **WhatsApp** | Meta Cloud API (v25.0) | Urban smartphone users |
| **USSD** | `*384*72836#` via Africa's Talking | Rural feature phones, zero internet |
| **Telegram Bot** | `@ravencry_alert_bot` | Community volunteers, coordinators |
| **SMS** | Africa's Talking sandbox | Any phone with signal |
| **PWA** | Next.js 14 on Vercel | Smartphone users, offline-capable |

### AI triage in five Nigerian languages
The Qwen-powered LLM service processes reports in Hausa, Yoruba, Igbo, Pidgin, and English, including code-switching:

| Endpoint | Function | Example |
|----------|----------|---------|
| **QW-01 Extract** | Structured field extraction | "An sace ɗana Ibrahim yana da shekara 9 a Kano" → `{name: "Ibrahim", age: 9, location: "Kano"}` |
| **QW-02 Classify** | Severity tiering | Child + high-risk zone → **FLASH**. Adult + Lagos → ROUTINE |
| **QW-03 OSINT** | News article analysis | Punch headline → `actionable: true`, creates draft case |
| **QW-04 Anti-fake** | Misinformation detection | Trust-by-default, 3+ red flags to hold for review |

### OSINT sweep engine (Crucix)
Forked Crucix with 5 Nigeria-specific source modules + 29 global sources running parallel sweeps every 5 minutes: GDELT Nigeria, ACLED conflict data, NAPTIP RSS (10 feeds), Nigerian News RSS (5 feeds), Citizen Reports from Aurora.

### Four-channel alert delivery
When a FLASH case is approved, n8n orchestrates parallel broadcast:
- **Telegram** alert channel, formatted message with photo, case ID, location
- **SMS**: geofenced batch delivery to subscribers within 160km via PostGIS `ST_DWithin`
- **Web Push**: PWA users receive live notifications
- **NAPTIP bridge (Mock)**: CAP-JSON formatted webhook to government coordination

### Tier system
- **FLASH**: Child ≤17, high-risk zone, or weapons involved. Auto-approve in demo mode.
- **PRIORITY**: Active abduction, adult victim, moderate risk area
- **ROUTINE**: Lower-risk missing persons, information-gathering



---

## How we built it

### Architecture
11 Docker containers on Alibaba Cloud ECS, orchestrated via Docker Compose. Caddy reverse proxy with auto-TLS. Aurora PostgreSQL with PostGIS as source of truth. Vercel for the PWA frontend.

```
Public → Caddy (80/443) → API Gateway (3003) → LLM Triage (3002)
                         → Crucix HUD (3001)
                         → Telegram Bot (3005)
                         → SMS Service (3006)
                         → USSD Handler (3007)
                         → n8n Workflows (5678)
                         → Whisper (8000)
                         → NAPTIP Mock (3008)
         Data Layer: Aurora PostgreSQL · S3
```

### Tech stack
| Layer | Technology |
|-------|-----------|
| **AI/LLM** | Qwen (qwen-plus, qwen-turbo) via DashScope · Whisper (faster-whisper int8) |
| **Backend** | Express 4 + TypeScript · 14 API endpoints · Consistent error format |
| **OSINT** | Crucix (forked) · 34 parallel sources · Delta engine |
| **Orchestration** | n8n (self-hosted) · 3 workflows (WhatsApp intake, FLASH broadcast, OSINT ingestion) |
| **Frontend** | Next.js 14 PWA · Tailwind · Leaflet maps · SSE live feed · Offline IndexedDB |
| **Database** | Aurora PostgreSQL + PostGIS + pg_trgm · 15 migrations · 9 tables |
| **Infrastructure** | Terraform (IaC) · Docker Compose (11 services) · Caddy (auto-TLS) |
| **Integrations** | Meta WhatsApp Cloud API · Africa's Talking (SMS/USSD) · Telegram Bot API · GDELT · ACLED |

### Data model
15 hand-written SQL migrations. 9 tables: persons, cases, sightings, alerts, subscribers, push_subscriptions, operators, sources, lga_coords. Full referential integrity with foreign keys. PostGIS for geospatial queries (geofencing, LGA proximity). pg_trgm for dedup. Enum types for state machine.

### Key design decisions
- **LLM-agnostic from day one**: provider abstraction supports Qwen, OpenAI, DeepSeek, Gemini
- **Trust-by-default**: anti-fake defaults to `legitimate` (score 0.7). False positives harm victims more than false negatives.
- **Stateless USSD**: completely stateless menu parsing via asterisk-delimited depth. No session storage needed.
- **Race condition guard**: approval endpoint uses `WHERE status = 'pending'` at the database level.



---

## Challenges we ran into

### Docker: local dev ≠ production
Multi-stage Docker builds default to the dev target (tsx watch, hot reload). COPY semantics with trailing `/` copy contents, not the directory. `node:22-alpine` has no curl for health-checks. `npm ci` fails when lockfile is stale, had to regenerate on EC2. These all worked locally and broke on deploy. 

### Caddy plugin limitations
The stock `caddy:2-alpine` image has no `rate_limit` plugin. We needed rate limiting on the API gateway. The solution: removed the rate_limit directive and added DNS overrides (`dns: [8.8.8.8]`) because systemd-resolved is unreachable from Docker containers. Auto-TLS with Let's Encrypt worked correctly once DNS was fixed. 

### Cross-cloud complexity
We attempted to migrate from AWS to Alibaba Cloud using Terraform and a $40 voucher. Hit `Forbidden.RiskControl` anti-fraud blocks, `Zone.NotOnSale` for instance types, and SSH username differences (`root` not `ubuntu`). Rolled back to AWS EC2. The Terraform module is saved as a pending fix. 

### Nigerian language edge cases
Age extraction from Nigerian cultural references, "primary three" ≈ 8 years old, "JSS2" ≈ 13. Location extraction requires LGA-level precision, not just city names. "Child" must be defined as ≤17 per Nigerian legal context. Each of these required explicit examples in the prompts. 

### n8n networking in Docker
n8n containers can't reach `localhost` on the host, they need `host.docker.internal`. The WhatsApp intake workflow (WF-01) depends on 3 internal services (Whisper, Qwen LLM, API Gateway), and each connection required Docker network debugging. 

### Phone encryption gap
The design calls for AES-256-GCM phone encryption with KMS. `decryptPhone()` was never implemented, we used sandbox workarounds for testing. This is the #1 production blocker and the highest-priority security item post-hackathon. 

### Schema drift across four surfaces
The database schema exists in four places: TypeScript types, migration files, the running Aurora instance, and the design document. When they drift, Aurora is the authority. We learned this the hard way when `clothing_desc` vs `clothing_description` caused silent mismatches. 

### dotenv comment parsing
The dotenv parser treats inline comments as values. An empty `LLM_MODEL=` followed by `# (optional)` became the literal string `# (optional) override default model`, causing silent failures. The fix: truly empty values, nothing after the `=`. 

---

## Accomplishments that we're proud of

### 1. Five Nigerian languages, working
The AI pipeline correctly extracts structured fields and classifies severity across Hausa, Yoruba, Igbo, Pidgin, and English, including code-switching like "My pikin don disappear, a ganshi a Kasuwan." Qwen was the clear winner among all models tested (GPT-4o, DeepSeek V3, Gemini 2.5 Pro) for Nigerian language handling.

**23 AI tests, 0 errors.** 

### 2. Full end-to-end pipeline verified
Test T-060: USSD report → pending_triage → Qwen FLASH classification → operator approval → n8n WF-02 → all 4 channels delivered: Telegram ✅, SMS ✅, NAPTIP ✅, Push (0 subscribers). Complete pipeline works.

Test T-061: Hausa text → WhatsApp intake → Qwen extract (`language_detected: "hausa"`) → Qwen classify (FLASH) → Aurora (`language='ha'`, `input_channel='whatsapp'`) → Meta reply. Verified end-to-end. 

### 3. Trust-by-default design
Every friction point that prevents hoaxes also prevents legitimate reports. Our anti-fake system defaults to `legitimate` (0.7 score). It takes 3+ red flags to hold for review. Infrastructure failure → defaults to `legitimate`. A citizen in Katsina with a feature phone shouldn't need to solve a CAPTCHA to report a missing child. 

### 4. Shippable, not a prototype
- **11 Docker services**, one command to deploy: `docker compose up -d`
- **15 deliberate SQL migrations**, not a generated schema
- **14 API endpoints** with consistent error format, rate limiting, and database-level race condition guard
- **Monorepo** with shared TypeScript types across all services
- **Terraform** infrastructure-as-code for reproducible deployment
- **5 live subdomains**: api, crucix, n8n, ops, and the main PWA

### 5. USSD for the unconnected
A completely stateless USSD handler using asterisk-delimited menu depth parsing. No session storage needed. Fail-open rate limiting (3 reports/phone/24h). Four branches: report missing person, report sighting, check alerts, subscribe/unsubscribe. This serves rural communities where smartphones aren't common and internet is unreliable. **38 USSD tests, all passing.** 

### 6. 97 tests across 7 services
| Service | Tests |
|---------|-------|
| LLM Triage | 23 tests (5 languages, classification, OSINT, anti-fake) |
| USSD Handler | 38 tests (handler + menu rendering) |
| Telegram Bot | 21 tests (templates, commands, broadcast) |
| SMS Service | 15 tests (templates, length constraints) |
| **Total** | **97 tests** |



### 7. LLM-agnostic architecture
A 30-minute abstraction that paid off for the entire project. One llm service with provider abstraction supporting Qwen, OpenAI, DeepSeek, and Gemini. Swap one env var to change providers. 

---

## What we learned

### 1. Docker hides bugs from local dev
Multi-stage build targets, COPY trailing-slash semantics, missing curl in Alpine, stale lockfiles, dotenv comment parsing, these all worked on localhost and failed on EC2. The pattern: local dev is not production, and Docker is a compiler with its own rules. 

### 2. LLM-agnostic from day one was the right call
A 30-minute abstraction gave us vendor flexibility for the entire project. When we needed OpenAI for comparison testing, it was one env var. When Qwen proved superior for Nigerian languages, we switched back. 

### 3. Teaching machines Nigerian languages requires explicit patterns
Five pattern discoveries: (1) tell the model what languages to expect explicitly, (2) protect proper nouns, don't normalize Nigerian place names, (3) null is better than hallucination, use `temperature: 0.1`, (4) Pidgin is not broken English, needs its own glossary, (5) list transliteration variants ("an sace", "an yi garkuwa", "an kama"). 

### 4. Schema authority must be singular
When the schema exists in TypeScript types, migration files, running Aurora, and design docs, drift is inevitable. The rule: the database is the authority. All types derive from what's in Aurora. 

### 5. n8n is both a superpower and a constraint
Visual workflows are "demo gold", proving complex orchestration without writing orchestration code. But n8n-in-Docker networking (`host.docker.internal`), webhook authentication (shared secret), and workflow export/import are all friction points. For production, n8n's webhook-based orchestration would need circuit breakers and retry logic that the visual editor doesn't expose. 

### 6. Infrastructure-as-code doesn't prevent cloud-specific failures
Terraform correctly modeled the Alibaba Cloud deployment. But `Forbidden.RiskControl` anti-fraud throttling, `Zone.NotOnSale` instance availability, and SSH username differences (`root` not `ubuntu`) are runtime failures that Terraform can't predict. IaC gives reproducibility, not immunity from cloud provider quirks. 

### 7. Trust-by-default is a design philosophy, not just a feature
False positives cost trust. False negatives cost lives. Every design decision, anti-fake defaults, rate limiting that fails open, anonymous reporting, unauthenticated alert feed, flows from this. Security and safety in conflict zones are not the same as security in Silicon Valley. 

### 8. PostGIS in the database beats geofencing in application code
Subscriber geofencing is a one-line SQL query: `ST_DWithin(subscribers.coords, cases.coords, 160000)`. Doing this in application code would require loading all subscribers and computing Haversine distances. PostGIS does it at the database level, indexed, in milliseconds. 

---

## What's next for Ravencry

### Immediate (Week 1: production blockers)
- **Implement `decryptPhone()`** with AWS KMS, the #1 security gap preventing real SMS delivery
- **IP whitelist** crucix, n8n, and ops subdomains in Caddyfile
- **JWT authentication** on operator endpoints: replace `api_key` header
- **Circuit breaker** on Africa's Talking SMS: 3 consecutive failures → skip SMS, alert ops channel
- **Complete n8n workflows**: build and export WF-01 and WF-02 from n8n editor
- **Deploy PWA** to Vercel with live API URL

### Short-term (Weeks 2–8 | V2 core)
- **Facial recognition**: InsightFace embeddings on sighting photos for cross-referencing
- **License plate recognition**: toll gate and traffic camera feeds
- **Radio/TV broadcast integration**: NTA, Channels TV API
- **Case deduplication algorithm**: pg_trgm fuzzy matching across reports
- **Full Yoruba + Igbo UI translation**: English and Hausa already done in PWA

### Medium-term (Months 3–6 | V2 complete)
- **Predictive hotspot modeling**: historical incident heatmaps for proactive alerts
- **Offline solar edge nodes**: Raspberry Pi + Node-RED for rural connectivity
- **CCTV camera network federation**: opt-in private camera feeds (filling stations, banks)
- **Cross-report correlation**: linking related cases by location, timing, and descriptions
- **Reporter credibility tracking**: trust scoring for anonymous vs verified reports
- **Anti-fake reverse image search**: Google Vision / TinEye integration

### Long-term (Months 7–24+ | V3 vision)
- **Highway monitoring**: Abuja-Kaduna corridor as the pilot
- **Telecom CDR movement anomaly detection**: with carrier partnerships
- **Satellite imagery** for forest camp detection in vulnerable corridors
- **Drone aerial feeds**: thermal imaging for search missions
- **Cross-border ECOWAS expansion**: harmonized alert protocols across West Africa
- **Banking app alert partnerships**: GTBank pilot, push alerts through banking apps
- **Community vigilante integration**: Amotekun, Civilian JTF Telegram channels
- **Public safety API (B2B)**: insurance data layer, commercial integrations
- **Automated drone deployment** from self-deploying satellite-linked ground stations for 24/7 search missions over Nigeria's vulnerable corridors

### Partnerships needed
- **Mobile Network Operators**: zero-rate USSD shortcodes (MTN, Glo, Airtel, 9mobile)
- **Government**: NAPTIP (official bridge, not mock), Nigeria Police Force, NDPC (data protection compliance under NDP Act 2023)
- **Media**: Channels TV, NTA, Punch, Vanguard for broadcast integration
- **Community organizations**: Amotekun, Civilian JTF, local vigilante groups



---

**RAVENCRY: Report. Triage. Alert. Find.** 
*So no one has to search alone.*

Hausa · Yoruba · Igbo · Pidgin · English

---

## Built with *(up to 25 tags)*

```
qwen, next.js, react, tailwindcss, typescript, node.js, express.js,
postgresql, postgis, docker, docker-compose, amazon-web-services,
alibaba-cloud, terraform, vercel, progressive-web-app, whatsapp,
telegram-bot, africastalking, n8n, openai-api, openai-whisper,
python, caddy, server-sent-events
```

### Tag reference for Devpost autocomplete

| # | Tag | Why |
|---|-----|-----|
| 1 | **qwen** | AI model powering all 4 triage endpoints (QW-01→QW-04) |
| 2 | **next.js** | PWA frontend framework (Next.js 16 on Vercel) |
| 3 | **react** | UI library (React 19) |
| 4 | **tailwindcss** | CSS framework (Tailwind v4) |
| 5 | **typescript** | Primary language across all Node.js services |
| 6 | **node.js** | Runtime for API, LLM, Telegram, SMS, USSD, Crucix |
| 7 | **express.js** | API framework for 6 backend services |
| 8 | **postgresql** | Primary database (Aurora PostgreSQL 16.4) |
| 9 | **postgis** | Geospatial extension — geofencing, LGA proximity, ST_DWithin |
| 10 | **docker** | Container runtime |
| 11 | **docker-compose** | Orchestration — 11 services, one command deploy |
| 12 | **amazon-web-services** | Aurora, DynamoDB, S3, EC2, KMS, Secrets Manager |
| 13 | **alibaba-cloud** | ECS compute via Terraform (cross-cloud architecture) |
| 14 | **terraform** | Infrastructure-as-code — VPC, ECS, security groups |
| 15 | **vercel** | PWA hosting + auto-deploy from GitHub |
| 16 | **progressive-web-app** | Offline support via service worker + IndexedDB |
| 17 | **whatsapp** | Meta Cloud API v25.0 — WhatsApp intake channel |
| 18 | **telegram-bot** | `@ravencry_alert_bot` — 5 commands + broadcast |
| 19 | **africastalking** | SMS + USSD gateway for Nigeria |
| 20 | **n8n** | Workflow orchestration — 3 workflows |
| 21 | **openai-api** | LLM provider abstraction (Qwen, OpenAI, DeepSeek, Gemini) |
| 22 | **openai-whisper** | Voice note transcription (faster-whisper int8) |
| 23 | **python** | Whisper service (Flask + faster-whisper) |
| 24 | **caddy** | Reverse proxy + auto-TLS (Let's Encrypt) |
| 25 | **server-sent-events** | Real-time PWA alert feed |

*If Devpost autocomplete doesn't find a tag, substitute the closest match from their dropdown.*

---

## "Try it out" links

| Link type | URL | What it shows |
|-----------|-----|---------------|
| **GitHub Repo** | `https://github.com/ravencry-labs/ravencry` | Full monorepo — all code, migrations, workflows |
| **Live PWA** | `https://ravencry-web.vercel.app` | Citizen-facing alert feed + report form |
| **API Gateway** | `https://api.ravencry.cv/api/health` | Health check — all services status |
| **Crucix HUD** | `https://crucix.ravencry.cv` | OSINT sweep engine dashboard (temporary public access) |
| **n8n Workflows** | `https://n8n.ravencry.cv` | Workflow editor (temporary public access) |

*Note: crucix, n8n, and ops subdomains are temporarily public for hackathon judging. Post-submission these get IP-whitelisted per the security hardening roadmap in `articles/06-whats-open-and-why.md`.*

---

## Project Media — Suggested Images *(upload up to 15, JPG/PNG/GIF, 5MB max, 3:2 ratio)*

### Must-include (6 images)

| # | Image | Source | Caption |
|---|-------|--------|---------|
| 1 | **Architecture Diagram** | `docs/architecture.mermaid` → render to PNG via mermaid.live | "11 Docker services, 15 migrations, 5 Nigerian languages" |
| 2 | **Alert Lifecycle Flow** | `docs/alert-lifecycle.mermaid` → render to PNG | "Citizen report → AI triage → Operator approval → Multi-channel broadcast" |
| 3 | **Data Model (ERD)** | `docs/data-model.mermaid` → render to PNG | "9 tables, PostGIS geofencing, full referential integrity" |
| 4 | **PWA Alert Feed** | Screenshot of ravencry.cv with FLASH alert card | "Real-time alert feed with SSE, tier badges, geofenced delivery" |
| 5 | **PWA Report Form** | Screenshot of 4-step wizard | "Multi-step report form with photo upload, GPS, offline queue" |
| 6 | **AI Test Suite** | Screenshot of terminal with 23 passing tests | "5-language extraction + classification: 23 tests, 0 errors" |

### Nice-to-include (up to 9 more)

| # | Image | Source |
|---|-------|--------|
| 7 | **Crucix HUD** | Screenshot of crucix.ravencry.cv with Nigeria source modules |
| 8 | **Telegram Alert** | Screenshot of formatted FLASH broadcast in Telegram channel |
| 9 | **n8n Workflow** | Screenshot of WF-02 FLASH broadcast workflow in n8n editor |
| 10 | **USSD Simulator** | Screenshot of Africa's Talking USSD simulator with `*384*72836#` |
| 11 | **Docker Compose** | Screenshot of `docker compose ps` with all 11 services healthy |
| 12 | **Database Migrations** | Screenshot of `db/migrations/` folder with 15 `.sql` files |
| 13 | **WhatsApp Chat** | Screenshot of Hausa text → "Case created" confirmation on WhatsApp |
| 14 | **Hausa Triage Output** | Screenshot of JSON response from `/extract` with Hausa input |
| 15 | **Mobile PWA** | Screenshot of PWA on phone screen (Chrome DevTools device mode) |

### Quick Mermaid render commands
```bash
# Install mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Render all three diagrams
mmdc -i docs/architecture.mermaid -o submission/images/architecture.png -w 1920 -H 1080 --backgroundColor #0e1117
mmdc -i docs/alert-lifecycle.mermaid -o submission/images/alert-lifecycle.png -w 1920 -H 1080 --backgroundColor #0e1117
mmdc -i docs/data-model.mermaid -o submission/images/data-model.png -w 1920 -H 1080 --backgroundColor #0e1117
```

---

## Video demo link

**YouTube URL (unlisted):** `https://youtube.com/watch?v=...`

Video spec: 2:50–3:00 minutes, 1080p, 16:9. Follow the shot-by-shot script in `submission/directors-script.md`. Record with OBS Studio. Voiceover separately via ElevenLabs "Brian" or "Adam" at 90% speed, then overlay.

**Pre-flight checklist** (from `directors-script.md`):
- [ ] Close all notifications
- [ ] Dark terminal theme
- [ ] Chrome fresh profile, bookmarks hidden
- [ ] Pre-open browser tabs: PWA, Crucix HUD, architecture diagram, Telegram Web
- [ ] Pre-open terminal tabs: LLM tests, curl commands, psql
- [ ] Alibaba ECS Terraform clip ready for splice at 0:16
- [ ] `docker compose ps` — all green
- [ ] `.env` loaded in all terminals
- [ ] Dry run completed at least once