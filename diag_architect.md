# RAVENCRY — Architecture Diagram Context
## `diag_architect.md` · v1.0 · 2026-06-29

> [!NOTE] **Agent Prompt — Generate the Architecture Diagram**
>
> You are generating the submission architecture diagram for **RAVENCRY**, a
> Nigeria-native anti-kidnapping & missing persons alert platform built for the
> **Devpost Hackathon**. The system is **substantially built**:
> 8 Docker services on EC2/ECS, Express API Gateway, Crucix OSINT sweep engine with
> 5 Nigeria source modules, Qwen multilingual triage (Hausa/Yoruba/Igbo/Pidgin/English),
> WhatsApp/Telegram/USSD/SMS intake, Whisper transcription, Telegram broadcast,
> n8n workflow orchestration, Appsmith ops dashboard — all Dockerized and deployed.
>
> **Your task:** Write THREE Mermaid diagrams into these files:
> 1. `docs/architecture.mermaid` — **Full system architecture** (flowchart, left-to-right).
   MUST show: Vercel PWA→ECS, all 5 citizen channels, 8 Docker containers,
   Caddy routing, AI pipeline, Aurora PostgreSQL + PostgreSQL rate limiting + S3 with role labels,
>    PostGIS geofencing step, 5-language annotation, two-way report→alert→sighting loop.
> 2. `docs/alert-lifecycle.mermaid` — **Alert lifecycle** (sequence diagram).
>    Trace a WhatsApp Hausa voice-note report through Whisper→Qwen→Aurora→
>    Crucix→n8n→Appsmith approval→SMS+Telegram+Push delivery. Include timing.
> 3. A **data model ERD** (inline in this file or as a separate diagram) showing
>    9 PostgreSQL tables with relationships, enum types, and PostGIS columns.
>
> **Judges are scoring on 4 dimensions** (see §2 for full detail):
- **Technological Implementation** — Aurora + PostgreSQL rate limiting deliberate data model
- **Design** — Frontend (Vercel PWA + 5 channels) ↔ Backend (ECS + APIs) cohesion
> - **Impact** — USSD for feature phones, 160km geofencing, shippable via Docker
> - **Originality** — Two-way intelligence loop, multilingual AI, Nigeria-native stack
>
> **The full reference context follows below.** Use the JUDGE CHECKLIST (§13.1)
> as your verification pass before writing the final Mermaid output.

> **Purpose:** Single source of truth for anyone tasked with creating or updating
> the RAVENCRY architectural diagram. Gathers all context from across the monorepo
> so you don't have to hunt through 20 files.
>
> **Output expected:** A Mermaid diagram in `docs/architecture.mermaid` covering:
> - User-facing channels → Ingress
> - Containerized services (ECS Docker Compose)
> - LLM/AI processing pipeline
> - Data layer (AWS/Alibaba Aurora + PostgreSQL rate limiting + S3)
> - Alert delivery outbound
> - External integrations
>
> **Render with:** VS Code Mermaid extension, mermaid.live, or `npx mmdc`.

---

## 1. PROJECT ELEVATOR PITCH

**RAVENCRY** — Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding.

A Nigeria-native, multi-channel, AI-powered anti-kidnapping and missing persons
rapid alert platform. Citizens report via WhatsApp, USSD (`*384*72836#`),
Telegram, or PWA. Qwen AI triages in Hausa/Yoruba/Igbo/Pidgin/English. Crucix
sweeps OSINT sources. FLASH alerts broadcast via SMS, Telegram, and push to
subscribers within 160km. Operators manage cases via Appsmith ops dashboard.

**Hackathons:** Qwen Cloud Hackathon + H01 Devpost (Vercel + AWS).

---

## 2. HACKATHON JUDGING CRITERIA — WHAT JUDGES LOOK FOR

> **Source:** H01 Devpost hackathon page — 4 judging dimensions.
> Every diagram and architecture explanation must speak to these.

### 2.1 Technological Implementation (Weight: High)

**What judges ask:**
- Does the project show real software craftsmanship?
- Is the AWS Database (**Aurora**, **Aurora DSQL**, or **DynamoDB**) integrated with a deliberate data model and architecture?
- Does the Vercel deployment go beyond basics?
- Is the app clean, purposeful, and intentional?

**How RAVENCRY answers this:**
- **TWO AWS databases used, not just one:** Aurora PostgreSQL (primary relational store + PostGIS) complemented by a **PostgreSQL rate limiting table** (USSD sessions, 24h rate limit — replaces DynamoDB `ravencry-sessions`). Two distinct workload types (relational + geospatial vs. session/rate management) shows architectural intentionality.
- **Aurora PostgreSQL with PostGIS:** 14 deliberate migrations (`db/migrations/001–014`). Geospatial queries (`ST_DWithin`) for subscriber geofencing. Full referential integrity with foreign keys. Trigger-based `updated_at`. Enum types for state machines.
- **PostgreSQL rate limiting table:** Replaces DynamoDB `ravencry-sessions`. Handles USSD sessions (24h rate limit per phone), sweep audit log (immutable), and alert delivery tracking — all within the same Aurora cluster for simplified ops.
- **Vercel PWA:** Next.js 14 App Router, TypeScript, Tailwind. Offline-capable with service worker + IndexedDB queue. SSE live alert feed. Deployed on Vercel with environment variables.
- **Clean separation:** Express API Gateway with consistent error format (`{ error, code, details? }`), rate limiting, CORS, JWT auth, service-to-service secret auth.

**What the architecture diagram MUST show:**
1. Both Aurora PostgreSQL (PostGIS) and PostgreSQL rate limiting table with their specific roles labeled
2. Arrow annotations explaining WHY each database was chosen for its workload
3. The 14-migration schema as a deliberate design, not an afterthought
4. Vercel PWA connecting back to ECS-hosted API Gateway over HTTPS/SSE

---

### 2.2 Design (Weight: High)

**What judges ask:**
- Is the user experience intuitive and well-considered?
- Does the front-end feel designed in relation to the back-end?
- Is there a cohesive, intentional balance between the two layers that reflects full-stack thinking?

**How RAVENCRY answers this:**
- **Multi-channel by design, not as an afterthought:** WhatsApp (smartphone), USSD (feature phone, no internet), Telegram, SMS, PWA — each channel feeds the SAME backend pipeline. The front-end IS the channels.
- **4-step PWA report form:** Name → Description → Location → Review. Deliberately minimal. Works on 3G. Offline queue with IndexedDB.
- **Backend shapes frontend:** The PWA alert card shows ONLY what the backend's trust-scored, anti-fake-verified pipeline has approved. No raw data exposure.
- **Operator dashboard (Appsmith) mirrors the same data model:** Operators see the same cases, alerts, and sightings that flow through the citizen channels — just with approval controls added.
- **SSE live feed:** The frontend alert feed is a real-time window into the backend's broadcast pipeline. Not polling. Not stale.

**What the architecture diagram MUST show:**
1. Frontend channels (left) → Backend services (center) → Data stores (right) as a clear left-to-right flow
2. The PWA on Vercel explicitly connected to the API Gateway on ECS
3. SSE arrow from API → PWA (real-time, not polling)
4. All 5 citizen channels converging into the same ingestion pipeline

---

### 2.3 Impact & Real-world Applicability (Weight: High)

**What judges ask:**
- Does the project solve a meaningful problem for a real audience?
- Does the use of scalable database infrastructure and frontend deployment make the solution more viable — not just functional, but potentially shippable?

**How RAVENCRY answers this:**
- **Nigeria's kidnapping crisis is real:** Thousands of cases annually. RAVENCRY targets the exact gap — no rapid, multi-channel, multilingual alert system exists.
- **Aurora PostgreSQL scales:** Provisioned → Serverless v2 → Aurora Global Database for cross-region. PostGIS means geofencing works at any scale.
- **PostgreSQL rate limiting scales simply:** USSD sessions and 24h rate limits live in the same Aurora cluster. No separate DynamoDB table to manage. Session cleanup via PostgreSQL `expires_at` column + periodic vacuum.
- **Vercel means instant global CDN:** The PWA loads fast anywhere in Nigeria, even on 3G. Edge functions could handle geofence pre-filtering (V2).
- **USSD (`*384#`) means it works on a $10 feature phone with zero internet.** This is the channel that actually reaches northern Nigeria. Not hypothetical — Africa's Talking sandbox is live.
- **Shippable today:** Docker Compose means one-command deploy. The `.env` pattern means configurable for any Nigerian state. Multi-language support (5 languages) means it works across the entire country.

**What the architecture diagram MUST show:**
1. USSD/SMS path explicitly labeled "Feature phones — no internet required"
2. The geofencing step: PostGIS `ST_DWithin` query to Aurora → subscriber list → SMS
3. The 160km radius annotation on the subscriber query
4. Multi-language annotation on the Qwen triage step (Hausa/Yoruba/Igbo/Pidgin/English)

---

### 2.4 Originality (Weight: Medium)

**What judges ask:**
- How creative and original is the concept?
- Does the project demonstrate a genuine insight about what's possible with this stack?
- If the idea isn't new, how significantly does this implementation push it forward?

**How RAVENCRY answers this:**
- **Not another Amber Alert clone:** Amber Alerts are broadcast-only (TV, highway signs). RAVENCRY is a two-way intelligence loop: citizens report → AI triages → OSINT cross-validates → alerts go out → citizens send sightings back.
- **Multilingual AI triage is the differentiator:** Qwen processes Hausa, Yoruba, Igbo, Pidgin, and English — including code-switching. No other alert platform does this. Nigeria's linguistic diversity is treated as a feature, not a barrier.
- **OSINT sweep + citizen reports merged:** Crucix polls GDELT, ACLED, and Nigerian news RSS on a schedule. The same delta engine that detects new conflict events also picks up citizen-submitted reports. Two data streams, one severity model.
- **The stack itself is the insight:** Aurora (relational + geospatial + rate limiting) + Vercel (PWA edge delivery) + ECS (compute) + Qwen (multilingual AI) + Africa's Talking (USSD/SMS). Each piece chosen for a specific Nigerian constraint — not just "use what's popular."
- **PostGIS geofencing, not a third-party geo API:** `ST_DWithin` on Aurora means no external dependency for "find subscribers within 160km." The LGA coordinate table (`lga_coords`) is seeded from Nigerian government data. Self-contained.

**What the architecture diagram MUST show:**
1. The two-way data flow: reports IN → alerts OUT → sightings BACK IN (the loop)
2. Crucix polling external sources (GDELT, ACLED, RSS) alongside citizen reports
3. The 5-language annotation prominently displayed
4. Nigeria-specific integrations (Africa's Talking, NAPTIP bridge, LGA coordinates)

---

## 3. SYSTEM BOUNDARIES — WHAT'S IN SCOPE

### 3.1 IN SCOPE (Hackathon / MVP)

| Layer | Components |
|-------|-----------|
| **Ingress Channels** | WhatsApp (Meta Cloud API), Telegram Bot, USSD (`*384#`), SMS shortcode, PWA (Next.js on Vercel) |
| **Reverse Proxy** | Caddy (ports 80/443, TLS via Let's Encrypt, subdomain routing) |
| **Core Services** | API Gateway (Express, :3003), Crucix Alert Engine (Express, :3001), LLM Triage (Express, :3002), Whisper (Flask, :8000), Telegram Bot (Express, :3005) |
| **Workflow Engine** | n8n (self-hosted, :5678) — WF-01 WhatsApp, WF-02 FLASH broadcast, WF-03 OSINT ingestion |
| **Ops Dashboard** | Appsmith (self-hosted, :8080) — case review, alert approval, source monitoring |
| **Database** | AWS Aurora PostgreSQL (PostGIS), PostgreSQL rate limiting table (USSD sessions, 24h rate limit — replaces DynamoDB `ravencry-sessions`) |
| **Object Storage** | AWS S3 (audio, photos, media) |
| **Alert Delivery** | Telegram API, Africa's Talking (SMS/USSD), Web Push (VAPID), NAPTIP bridge (mocked) |
| **Deployment** | AWS/Alibaba ECS (8GB RAM), Ubuntu 24.04, Docker Compose |

### 3.2 OUT OF SCOPE (V2/V3)

- CCTV/private camera feeds
- Satellite/geospatial (Planet Labs, Sentinel-2)
- Telecom CDR data (MTN/Airtel)
- Facial recognition / LPR
- Predictive kidnapping hotspot models
- Cross-border ECOWAS expansion
- Public safety B2B API
- Insurance data layer

---

## 4. COMPLETE SERVICE INVENTORY

### 4.1 Docker Compose Services (ECS Host)

| Service | Container Name | Port | Technology | Purpose |
|---------|---------------|------|------------|---------|
| **caddy** | `ravencry-caddy-1` | 80, 443 | Caddy 2 (Alpine) | Reverse proxy, TLS termination, subdomain routing |
| **api** | `ravencry-api-1` | 3003 | Express 4 + TypeScript | Public API gateway, SSE, operator endpoints |
| **crucix** | `ravencry-crucix-1` | 3001 | Express + Node.js 20 | OSINT sweep engine, delta detection, FLASH webhook |
| **llm** | `ravencry-llm-1` | 3002 | Express + TypeScript | Qwen AI: extract, classify, OSINT, anti-fake |
| **telegram** | `ravencry-telegram-1` | 3005 | Express + TypeScript | Telegram bot commands, FLASH channel broadcast |
| **whisper** | `ravencry-whisper-1` | 8000 | Flask + faster-whisper | Audio transcription (voice notes → text) |
| **n8n** | `ravencry-n8n-1` | 5678 | n8n (Docker) | Workflow orchestration engine |
| **appsmith** | `ravencry-appsmith-1` | 8080 | Appsmith (Docker) | Ops dashboard for case management |

### 4.2 Services NOT in docker-compose.yml (run separately)

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **sms** | 3006 | Express + TypeScript | SMS broadcast via Africa's Talking |
| **ussd** | 3007 | Express + TypeScript | USSD menu handler for `*384#` |
| **whatsapp** | — | Express + TypeScript | WhatsApp Cloud API webhook handler |
| **naptip** | — | Express + TypeScript | NAPTIP bridge webhook handler |

### 4.3 External Hosted Services

| Service | Host | Purpose |
|---------|------|---------|
| **PWA (web)** | Vercel | Next.js 14 PWA — citizen report form, alert feed, sighting submission |
| **Aurora PostgreSQL** | AWS RDS | Primary database (PostGIS-enabled) |
| **PostgreSQL rate limiting** | AWS Aurora | USSD sessions, 24h rate limit — replaces DynamoDB `ravencry-sessions` |
| **S3** | AWS | Media storage (audio .ogg, photos, attachments) |

---

## 5. DNS & ROUTING (Caddy Reverse Proxy)

```
Public Domains (DNS: Pxxl → ECS IP):

api.ravencry.cv     → Caddy → routes:
  /telegram/*       → telegram:3005  (Telegram webhook)
  /sms/*            → sms:3006       (SMS broadcast, service-auth)
  /ussd/*           → ussd:3007      (Africa's Talking callback)
  /*                → api:3003       (API Gateway — default)

crucix.ravencry.cv  → crucix:3001    (Crucix HUD — internal ops)
n8n.ravencry.cv     → n8n:5678       (n8n editor — internal ops)
ops.ravencry.cv     → appsmith:8080  (Appsmith — internal ops)
```

**Note:** Caddy provisions Let's Encrypt certs automatically. `rate_limit`
plugin NOT available in `caddy:2-alpine`. DNS set to `8.8.8.8, 8.8.4.4` because
systemd-resolved (`127.0.0.53`) is unreachable from Docker containers.

---

## 6. API GATEWAY ENDPOINTS (`api:3003`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | None | Health check (with DB status) |
| `POST` | `/api/reports` | None | Submit missing person report |
| `POST` | `/api/sightings` | None | Submit sighting tip |
| `GET` | `/api/alerts/active` | None | Active alert feed (geofence) |
| `GET` | `/api/cases/:id` | None | Public case detail |
| `POST` | `/api/subscribe` | None | Opt in to geofenced alerts |
| `DELETE` | `/api/subscribe` | None | Unsubscribe |
| `GET` | `/events` | None | SSE stream (live alerts) |
| `POST` | `/api/ops/alerts/:id/approve` | JWT (or AUTO_APPROVE) | Approve FLASH broadcast |
| `POST` | `/api/ops/alerts/:id/suppress` | JWT | Suppress alert |
| `PATCH` | `/api/ops/cases/:id` | JWT | Update case details |
| `GET` | `/api/ops/queue` | JWT | Pending review queue |
| `POST` | `/api/auth/login` | None (returns JWT) | Operator login |
| `POST` | `/internal/*` | X-RAVENCRY-Secret | Service-to-service webhooks |

---

## 7. LLM TRIAGE SERVICE ENDPOINTS (`llm:3002`)

| Method | Path | Model | Purpose |
|--------|------|-------|---------|
| `POST` | `/extract` | qwen-plus | QW-01: Extract person details from raw report text |
| `POST` | `/classify` | qwen-plus | QW-02: Classify severity tier (FLASH/PRIORITY/ROUTINE) |
| `POST` | `/classify-osint` | qwen-turbo | QW-03: Classify OSINT-swept articles |
| `POST` | `/check-authenticity` | qwen-plus | QW-04: Anti-fake detection |
| `GET` | `/health` | — | Provider status + uptime |

**Output schemas:** Validated at `services/llm/src/validation/schema.ts` —
missing critical fields are flagged but do not block pipeline.

---

## 8. DATA LAYER SCHEMA

### 8.1 Aurora PostgreSQL Tables (with PostGIS)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `persons` | id (UUID), full_name, age_estimate, gender, clothing_desc, photo_s3_key | Core missing person profile |
| `cases` | id (NR-YYYY-NNNNNN), person_id, status, alert_tier, circumstance, last_seen_coords (GEOGRAPHY), input_channel, raw_report, qwen_confidence, trust_score, antifake_verdict | Central case entity |
| `sightings` | id (UUID), case_id (FK), status, description, sighting_coords (GEOGRAPHY), input_channel, trust_score | Community tips per case |
| `alerts` | id (UUID), case_id (FK), tier, status, channels[], sms_count, telegram_sent, whatsapp_sent, naptip_sent, push_sent | Every alert broadcast record |
| `subscribers` | id (UUID), phone_encrypted (AES-256-GCM), phone_hash (SHA-256), lga, state, location (GEOGRAPHY) | Opted-in alert recipients |
| `push_subscriptions` | id (UUID), subscriber_id (FK), endpoint, auth, p256dh | Web Push notification targets |
| `operators` | id (UUID), email, password_hash, role (moderator/senior/admin/investigator), active | Internal staff accounts |
| `sources` | id (UUID), name, type (rss/api/citizen), status, last_sweep_at, error_count | Source module health tracking |
| `lga_coords` | lga_name, state, center (GEOGRAPHY) | Nigeria LGA geofence reference |

### 8.2 Enum Types (PostgreSQL)

```
case_status:    pending_sweep → pending_triage → in_triage → pending_review →
                active → broadcast_complete → cold → resolved → false_report

alert_tier:     FLASH | PRIORITY | ROUTINE
alert_status:   pending | approved | suppressed | broadcast
input_channel:  whatsapp | telegram | ussd | sms | pwa | osint | manual
language_code:  en | ha | yo | ig | pcm | mixed
gender:         male | female | unknown
circumstance:   abduction | missing | witnessed_kidnapping | unknown
sighting_status: unprocessed | under_review | confirmed | rejected
operator_role:  moderator | senior_moderator | admin | investigator
```

### 8.3 PostgreSQL Rate Limiting Table (replaces DynamoDB `ravencry-sessions`)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `ussd_rate_limits` | phone_hash (SHA-256), session_id, last_request_at, expires_at | USSD session state + 24h rate limit per phone (migration 015) |

> **Note:** The old DynamoDB tables (`ravencry-sessions`, `ravencry-alerts`, `ravencry-sweep-log`) have been consolidated. USSD session management and rate limiting now use a PostgreSQL table within the same Aurora cluster. Sweep audit and alert delivery tracking remain in Aurora as well — eliminating the DynamoDB dependency for simpler ops.

### 8.4 S3 Bucket Structure

```
ravencry-media-prod/
├── audio/{case_id}/voice.ogg       ← WhatsApp voice notes
├── photos/{case_id}/display.jpg    ← Last known photos
├── sightings/{sighting_id}/        ← Sighting photo uploads
└── exports/                        ← Data exports (V2)
```

---

## 9. COMPLETE DATA FLOWS

### 9.1 FLOW A — Citizen Report (WhatsApp Voice Note in Hausa)

```
User (WhatsApp)
  │  Sends voice note in Hausa
  ▼
Meta WhatsApp Cloud API
  │  Webhook POST → /webhook/whatsapp
  ▼
n8n WF-01 (WhatsApp Intake)
  │
  ├──► S3: upload audio/{case_id}/voice.ogg
  │
  ▼
Whisper Service (:8000)
  │  POST /transcribe { audio_id }
  │  → { transcript, language_detected, language_confidence }
  ▼
Qwen Triage (:3002)
  │  POST /extract { text: transcript, language: "ha" }
  │  → { person_name, age_estimate, gender, location, ... }
  │
  ├──► POST /classify → { tier, reason }
  │
  ▼
Aurora PostgreSQL
  │  INSERT INTO cases (status='pending_review', alert_tier, ...)
  │
  ├──► IF confidence < 0.5 → status='pending_review', route to ops
  │
  ▼
Crucix Alert Engine (:3001)
  │  citizen-reports.mjs sweep polls Aurora
  │  Delta engine: detects new event
  │  IF tier=FLASH → emit n8n webhook
  ▼
n8n WF-02 (FLASH Broadcast)
  │  (or direct from API if AUTO_APPROVE_FLASH=true)
  ▼
Appsmith Ops Dashboard
  │  Operator sees FLASH case
  │  Clicks "Approve Broadcast"
  ▼
n8n WF-02 FLASH Broadcast Pipeline:
  │
  ├──► PostGIS query: subscribers within 160km of last_seen_coords
  ├──► Telegram API: post to alert channel with photo
  ├──► Africa's Talking: SMS batch to matched subscribers
  ├──► Web Push (VAPID): push to PWA subscribers
  ├──► NAPTIP bridge (mocked): webhook for child cases
  └──► SSE broadcast: all connected dashboard clients

Time: Report → SMS delivery ≤ 90 seconds (with AUTO_APPROVE)
```

### 9.2 FLOW B — OSINT Sweep (Crucix)

```
[Crucix schedule: every 5 min (configurable)]
  │
  ▼
5 Nigeria Source Modules (Tier 7, parallel via Promise.allSettled):
  │
  ├── naptip-rss.mjs       — 10 feeds (HumAngle, Premium Times, Daily Trust, The Cable)
  ├── gdelt-nigeria.mjs    — 3 GDELT API queries (kidnapping, child, school attacks)
  ├── nigeria-news-rss.mjs — 5 feeds (Punch, Vanguard, Guardian NG, Daily Trust, Premium Times)
  ├── citizen-reports.mjs  — Aurora pending_sweep queue query
  └── acled-nigeria.mjs    — ACLED API (structured conflict events with lat/lon)
  │
  ▼
Delta Engine (Crucix lib/delta/)
  │  Detects genuinely new events vs. prior sweeps
  │  Dedup: prevents recycled/duplicate articles
  ▼
Severity Tiering (Crucix lib/tiers.mjs):
  │  Nigeria keyword scoring (English/Hausa/Yoruba/Igbo/Pidgin)
  │  Escalators: child +5, school +5, multiple +5, bus +5, mass +5
  │  De-escalators: found -3, rescued -3, returned -3
  │  High-risk LGA mentions: +2
  │  score ≥ 8 → FLASH, ≥ 4 → PRIORITY, < 4 → ROUTINE
  ▼
Output:
  ├── Telegram alert channel (FLASH + PRIORITY)
  ├── n8n FLASH webhook (if flashAutoEmit=true)
  ├── SSE → Crucix HUD dashboard
  └── Discord (ops backup, if configured)

Optional LLM step (QW-03):
  │  For ambiguous OSINT articles, POST /classify-osint → tier
```

### 9.3 FLOW C — PWA Report Submission

```
User (PWA on Vercel)
  │  Opens report form (4 steps, <3s on 3G)
  │  Fills: name, age, gender, last seen location, circumstances
  │  Optional: photo upload, GPS sharing
  ▼
POST /api/reports (API Gateway :3003)
  │  Rate limited: 5/15min per IP
  │  Phone hash: SHA-256 if provided
  ▼
Aurora PostgreSQL
  │  INSERT INTO cases (input_channel='pwa', ...)
  ▼
Qwen Triage (:3002)
  │  POST /extract (if raw_report provided)
  │  POST /classify
  ▼
Same pipeline as Flow A from tier classification onward
```

### 9.4 FLOW D — USSD/SMS Intake

```
User (feature phone, no internet)
  │  Dials *384*72836#
  ▼
Mobile Network Operator (MTN/Airtel/Glo/9mobile)
  │  Routes USSD to Africa's Talking
  ▼
Africa's Talking USSD API
  │  POST /ussd { sessionId, phoneNumber, text }
  ▼
USSD Handler (:3007)
  │  State machine: PostgreSQL rate limiting table (24h rate limit)
  │  Menus: language select → name → age → location → confirm
  ▼
Aurora PostgreSQL
  │  INSERT INTO cases (input_channel='ussd', ...)
  ▼
Qwen Triage → classify → same pipeline as Flow A
```

---

## 10. NETWORK TOPOLOGY

```
┌──────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                           │
│                                                              │
│  Users: WhatsApp, Telegram, USSD, SMS, PWA, Browsers         │
│  APIs: Meta Cloud API, Telegram API, Africa's Talking        │
│  External Sources: GDELT, ACLED, RSS feeds                   │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS (TLS 1.3)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              AWS/Alibaba ECS (Ubuntu 24.04)                  │
│              Docker Network: ravencry-net (bridge)           │
│                                                              │
│  ┌─────────┐                                                │
│  │  Caddy  │ :80, :443 (reverse proxy + TLS)                │
│  └────┬────┘                                                │
│       │ routes by subdomain + path                          │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────┐        │
│  │              Application Containers              │        │
│  │                                                 │        │
│  │  api:3003    llm:3002    crucix:3001             │        │
│  │  telegram:3005   whisper:8000   sms:3006         │        │
│  │  ussd:3007   n8n:5678    appsmith:8080           │        │
│  └──────────────────────┬──────────────────────────┘        │
│                         │ Private subnet (AWS VPC)          │
└─────────────────────────┼──────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Aurora  │  │PostgreSQL│  │    S3    │
    │PostgreSQL│  │  rate    │  │ (media)  │
    │(PostGIS) │  │ limiting │  │          │
    └──────────┘  └──────────┘  └──────────┘
```

---

## 11. EXTERNAL INTEGRATIONS MAP

| Integration | Direction | Protocol | Service That Calls It |
|-------------|-----------|----------|----------------------|
| **Meta WhatsApp Cloud API** | Inbound (webhook) + Outbound (reply) | HTTPS | n8n WF-01 / whatsapp service |
| **Telegram Bot API** | Inbound (webhook) + Outbound (send) | HTTPS | telegram service + crucix |
| **Africa's Talking SMS** | Outbound (batch) | HTTPS | sms service / n8n WF-02 |
| **Africa's Talking USSD** | Inbound (callback) | HTTPS | ussd service |
| **Qwen/DashScope API** | Outbound | HTTPS | llm service (:3002) |
| **GDELT API v2** | Outbound (poll) | HTTPS | crucix gdelt-nigeria.mjs |
| **ACLED API** | Outbound (poll, OAuth2) | HTTPS | crucix acled-nigeria.mjs |
| **Nigerian News RSS** | Outbound (poll) | HTTP | crucix naptip-rss.mjs, nigeria-news-rss.mjs |
| **NAPTIP Bridge** | Outbound (webhook) | HTTPS | n8n WF-02 (mocked for hackathon) |
| **Web Push (VAPID)** | Outbound | HTTPS/WSS | api gateway → browser push service |
| **Vercel PWA** | Inbound (user) + SSE (outbound) | HTTPS | User browser ↔ Vercel ↔ API |

---

## 12. KEY ARCHITECTURAL DECISIONS

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Caddy not Nginx** | Simpler config, auto-TLS, subdomain routing. No `rate_limit` plugin available in stock image. |
| 2 | **n8n as orchestrator** | Visual workflow editing is strong demo material for judges. Adds ~1GB RAM overhead. |
| 3 | **Crucix handles OSINT only** | Crucix polls external sources on schedule. Citizen reports skip Crucix (already triaged by Qwen) to cut latency. |
| 4 | **Aurora PostgreSQL (not Serverless)** | Serverless v2 has 15-30s cold start. Provisioned db.t3.medium always-on for hackathon reliability. |
| 5 | **PostGIS for geofencing** | Native `GEOGRAPHY(POINT,4326)` type. `ST_DWithin` for 160km radius subscriber queries. No external geo service needed. |
| 6 | **Phone encryption, not hashing** | Subscriber phones: AES-256-GCM encrypted (reversible for SMS). Reporter phones: SHA-256 hash only (dedup, not reversible). |
| 7 | **AUTO_APPROVE_FLASH env flag** | Skips operator approval for demo. Production requires JWT + operator review. |
| 8 | **Whisper on CPU (small model)** | GPU would add cost. whisper-small on t3.large CPU: ~15s for 30s clip. Acceptable for hackathon. |
| 9 | **Single ECS instance for all containers** | 8GB RAM needed. 4GB will OOM with Whisper + n8n + Appsmith. |
| 10 | **5 languages, not just English** | Hausa/Yoruba/Igbo/Pidgin coverage is the key differentiator vs. generic alert platforms. Qwen handles code-switching well. |

---

## 13. DIAGRAM REQUIREMENTS

> **CRITICAL FOR JUDGES:** The architecture diagram is one of the first things judges see.
> It must instantly communicate: (1) which AWS databases are used and WHY,
> (2) how the Vercel frontend connects to the backend, and (3) that this is a
> real, shippable system — not a toy.

### 13.1 Primary Diagram: Full System Architecture

**Style:** Left-to-right data flow. Color-coded layers. Arrow annotations.

**JUDGE CHECKLIST — Every item below must be visible:**

- [ ] **AWS Aurora PostgreSQL** shown in the Data Layer with label: "Aurora PostgreSQL (PostGIS) — Cases, Persons, Subscribers, Alerts, Sightings, LGA coords"
- [ ] **PostgreSQL rate limiting table** shown in the Data Layer with label: "PostgreSQL rate limiting — USSD sessions, 24h rate limit (replaces DynamoDB `ravencry-sessions`)"
- [ ] **AWS S3** shown in the Data Layer with label: "S3 — Audio (.ogg), Photos, Attachments"
- [ ] **Vercel PWA** shown on the far left, with an explicit arrow to the API Gateway on ECS
- [ ] **SSE arrow** from API Gateway → Vercel PWA labeled "SSE — live alert feed"
- [ ] **All 5 citizen channels** (WhatsApp, Telegram, USSD, SMS, PWA) converging into the same ingestion pipeline
- [ ] **USSD/SMS path** annotated: "Feature phones — no internet required"
- [ ] **Qwen triage** annotated: "Hausa · Yoruba · Igbo · Pidgin · English — code-switching"
- [ ] **PostGIS geofencing** step annotated: "ST_DWithin — subscribers within 160km radius"
- [ ] **Two-way loop visible:** Reports → Triage → Broadcast → Sightings → back to Cases
- [ ] **Crucix OSINT sweep** shown polling GDELT, ACLED, RSS alongside citizen reports

**Standard Must-show elements:**
1. **User Channels** (far left): WhatsApp, Telegram, USSD, SMS, PWA — each with its protocol
2. **Ingress Layer**: Caddy reverse proxy with subdomain routing (`api.`, `crucix.`, `n8n.`, `ops.`)
3. **Application Layer** (center, grouped): All 8 Docker containers with ports
4. **AI Processing Pipeline** (highlighted sub-flow): Whisper → Qwen (extract → classify → anti-fake)
5. **Orchestration Layer**: n8n with 3 workflows (WF-01, WF-02, WF-03)
6. **Data Layer** (far right): Aurora PostgreSQL, PostgreSQL rate limiting, S3 — each with role annotation
7. **Outbound Delivery** (arrows out right): Telegram, SMS, Web Push, NAPTIP

**Layers to color distinctly:**
- 🟢 **Green** — Ingress (user-facing channels + Vercel PWA)
- 🔵 **Blue** — Application services (Docker containers on ECS)
- 🟣 **Purple** — AI/ML (Whisper, Qwen, Crucix delta engine)
- 🟠 **Orange** — Orchestration (n8n, Caddy routing)
- 🔴 **Red** — AWS/Alibaba Data stores (Aurora, PostgreSQL rate limiting, S3)
- 🟡 **Yellow** — External integrations (APIs, RSS, Africa's Talking)

### 13.2 Secondary Diagram: Alert Lifecycle (Sequence Diagram)

**Style:** Sequence diagram (Mermaid `sequenceDiagram`).

**Must show:** The end-to-end path of a citizen WhatsApp voice-note report
through every service, ending at SMS delivery. Include timing annotations.

### 13.3 Tertiary Diagram: Data Model (ERD)

**Style:** Entity-relationship diagram (Mermaid `erDiagram`).

**Must show:** 9 tables with relationships, key columns, and enum types.

---

## 14. FILE REFERENCES — WHERE EVERYTHING LIVES

| What | Where |
|------|-------|
| Project overview & features | `features.md` |
| Hackathon build log & decisions | `hackathon_context.md` |
| Requirements spec | `prompt-system/specs/requirements.md` |
| Design spec (component details) | `prompt-system/specs/design.md` |
| Build task list | `prompt-system/specs/todo.md` |
| Docker Compose (production) | `docker-compose.yml` |
| Docker Compose (dev overrides) | `docker-compose.dev.yml` |
| Caddy config | `Caddyfile` |
| DB migrations (all 14) | `db/migrations/001–014_*.sql` |
| Shared TypeScript types | `packages/shared/src/types.ts` |
| API Gateway source | `services/api/src/index.ts` |
| API routes | `services/api/src/routes/*.ts` |
| LLM service source | `services/llm/src/index.ts` |
| Crucix config | `services/crucix/crucix.config.mjs` |
| Crucix Nigeria modules | `services/crucix/apis/` |
| n8n workflows | `n8n-workflows/wf-*.json` |
| Opus optimization review | `ravencry_opus_optimization.md` |
| API Gateway memory | `/memories/repo/t-015-api-gateway.md` |
| Architecture diagram (OUTPUT) | `docs/architecture.mermaid` |
| Alert lifecycle diagram (OUTPUT) | `docs/alert-lifecycle.mermaid` |

---

## 15. KNOWN GAPS & WARNINGS

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No circuit breaker on Africa's Talking** | If AT is down, SMS sends timeout sequentially. 500 subscribers × 30s = 4+ hours. | Set AT timeout to 3s, batch SMS (100/call), circuit breaker after 3 failures. |
| **Race condition on approval** | Two operators could approve same FLASH case → double broadcast. | Fixed: `UPDATE ... WHERE status='pending' RETURNING *` — only one wins. |
| **Whisper CPU bottleneck** | whisper-small on CPU is ~15s/clip. Queue might build under load. | Single-worker queue. Flag >30s wait for ops. GPU is V2. |
| **No real NAPTIP integration** | NAPTIP Amber Alert API is undocumented. | Mock for hackathon: POST to webhook.site URL. Real integration is V2. |
| **Safari/iOS no Background Sync** | PWA background sync API not supported on iOS. | Manual retry button as fallback. |
| **Host Caddy conflicts** | Host machine had `apt`-installed Caddy on ports 80/443. | Fix: `sudo systemctl stop caddy && sudo systemctl disable caddy`. |
