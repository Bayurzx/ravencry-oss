# RAVENCRY — Design Specification
## Kiro Spec · v1.1 · June 2026 (Opus-optimized)

> This document is the technical blueprint for RAVENCRY.
> Every engineering decision is documented here.
> Do not change architecture without updating this file.

---

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────── PUBLIC INTERNET ───────────────────────────────┐
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ WhatsApp │  │ Telegram │  │   USSD   │  │   SMS    │  │  PWA/Web    │ │
│  │  Bot     │  │   Bot    │  │  *384#   │  │ Shortcode│  │  (Vercel)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │              │              │               │         │
│       └──────────────┴──────────────┴──────────────┴───────────────┘        │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────── ┘
                                     │ HTTPS (Caddy Reverse Proxy)
                          ┌──────────▼─────────────────────────────────────┐
                          │           AWS EC2 (t3.large, Ubuntu 24)        │
                          │           Docker Compose Network               │
                          │                                                │
                          │  ┌─────────────────────────────────────────┐  │
                          │  │     n8n Workflow Engine  :5678          │  │
                          │  │  WF-01 WF-02 WF-03 WF-04 WF-05        │  │
                          │  └──────────────┬──────────────────────────┘  │
                          │                 │                              │
                          │  ┌──────────────▼──────────────┐              │
                          │  │   Qwen Triage Service :3002 │              │
                          │  │   Whisper Service     :8000 │              │
                          │  └──────────────┬──────────────┘              │
                          │                 │                              │
                          │  ┌──────────────▼──────────────┐              │
                          │  │   Crucix Alert Engine :3001 │              │
                          │  │   5 Nigeria source modules  │              │
                          │  │   FLASH webhook emitter     │              │
                          │  └──────────────┬──────────────┘              │
                          │                 │                              │
                          │  ┌─────────────────────────────┐              │
                          │  │   Appsmith Ops Dashboard    │              │
                          │  │   :8080                     │              │
                          │  └─────────────────────────────┘              │
                          │                                                │
                          └──────────────────────┬─────────────────────── ┘
                                                 │ Private subnet
                          ┌──────────────────────▼────────────────────────┐
                          │               AWS DATA LAYER                  │
                          │                                               │
                          │  RDS PostgreSQL      DynamoDB     S3          │
                          │  (PostGIS)           (3 tables)  (media)      │
                          └───────────────────────────────────────────────┘
                                                 │
                          ┌──────────────────────▼────────────────────────┐
                          │            ALERT DELIVERY LAYER               │
                          │                                               │
                          │  Telegram API  Africa's Talking  Web Push     │
                          │  NAPTIP Bridge  SSE → Vercel PWA              │
                          └───────────────────────────────────────────────┘
```

---

## 2. ALERT LIFECYCLE FLOW

```
[Reporter sends WhatsApp voice note in Hausa]
         │
         ▼
[Meta WhatsApp Cloud API webhook → n8n WF-01]
         │
         ├─► [S3 upload: audio/{case_id}/voice.ogg]
         │
         ▼
[Whisper API: transcribe → "An sace ɗana..."]
         │
         ▼
[Qwen QW-01: extract → {name: Ibrahim, age: 9, location: Kano...}]
         │
         ▼
[Qwen QW-02: classify → FLASH (child abduction, Kano)]
         │
         ▼
[Aurora INSERT: cases table, status: pending_review]
         │
         ▼
[Crucix sweep: citizen-reports.mjs picks up new case]
         │
         ▼
[Crucix delta engine: new event detected]
         │
         ▼
[Crucix tier: FLASH → emit webhook to n8n]
         │
         ▼
[Appsmith ops dashboard: operator sees FLASH case]
         │
         ▼
[Operator clicks ✅ Approve Broadcast]
         │
         ▼
[n8n WF-02: FLASH broadcast pipeline]
         │
         ├──► [PostGIS query: subscribers within 160km of Kano coords]
         │
         ├──► [Telegram API: post to alert channel with photo]
         │
         ├──► [Africa's Talking: SMS batch to ~N subscribers]
         │
         ├──► [Web Push: push notification to PWA subscribers]
         │
         ├──► [NAPTIP bridge: webhook (child case)]
         │
         └──► [SSE: broadcast to all connected dashboard clients]
                    │
                    ▼
         [Vercel PWA: alert card appears in feed]
         [Subscriber's Android: push notification]
         [Feature phone user: SMS received]
         
Total time from report to SMS delivery: ≤ 90 seconds
```

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 Crucix Alert Engine
- **Purpose:** Sweep ingestion sources, detect new events, classify severity, emit alerts
- **Technology:** Node.js 20, Express 4, forked from CrucixAI/crucix
- **Port:** 3001
- **Inputs:** 5 source modules (naptip-rss, gdelt-nigeria, nigeria-news-rss, citizen-reports, sighting-feed)
- **Outputs:** Telegram alerts, n8n FLASH webhook, SSE events, Discord (ops backup)
- **Failure mode:** Individual source failure → logged, other sources continue. Full crash → Docker restart:unless-stopped
- **Hackathon:** ✅ MVP

### 3.2 n8n Workflow Engine
- **Purpose:** Orchestrate all multi-step pipelines and cross-service coordination
- **Technology:** n8n 1.x, self-hosted Docker, PostgreSQL as queue backend
- **Port:** 5678
- **Inputs:** Webhooks from WhatsApp AT, Telegram, USSD AT, Crucix FLASH emitter, cron triggers
- **Outputs:** Qwen service, Whisper service, RDS DB, Africa's Talking (SMS/USSD), Meta WhatsApp, Telegram API, S3
- **Failure mode:** Workflow execution fails → error logged, ops Telegram notified. n8n crash → Docker restart
- **Hackathon:** ✅ MVP

### 3.3 Qwen Triage Service
- **Purpose:** Multilingual AI extraction and classification
- **Technology:** Node.js 20, Express, OpenAI SDK (Qwen-compatible endpoint)
- **Port:** 3002
- **Models:** qwen-plus (FLASH + anti-fake), qwen-turbo (OSINT volume)
- **Inputs:** POST /extract, POST /classify, POST /classify-osint, POST /check-authenticity
- **Outputs:** Structured JSON for all 4 endpoints
- **Failure mode:** Qwen API timeout → retry x2 with backoff → if still fails, case flagged for manual review
- **Hackathon:** ✅ MVP

### 3.4 Whisper Service
- **Purpose:** Voice note transcription for audio reports
- **Technology:** Python 3.11, faster-whisper (CPU-optimised), Flask
- **Port:** 8000
- **Model:** whisper-small (balance of speed and accuracy for African languages)
- **Inputs:** POST /transcribe (multipart/form-data: audio file)
- **Outputs:** { transcript, language_detected, language_confidence }
- **Failure mode:** Transcription fails → case created with raw_report: "[audio - transcription failed]", flagged for manual
- **Hackathon:** ✅ MVP

### 3.5 WhatsApp Bot
- **Purpose:** Primary citizen intake for smartphone users
- **Technology:** Node.js, Meta WhatsApp Cloud API (free tier)
- **State store:** DynamoDB ravencry-sessions (TTL 30 min)
- **Inputs:** Meta webhook (text, image, audio, location)
- **Outputs:** n8n WF-01 webhook, WhatsApp reply messages via Cloud API
- **Failure mode:** Meta API timeout → log, send fallback "Try again or dial *384#"
- **Hackathon:** ✅ MVP (test phone number via Meta Business dashboard)
- **Note:** Africa's Talking does NOT provide WhatsApp access in sandbox. Meta Cloud API is free to set up.

### 3.6 USSD Handler
- **Purpose:** Feature phone intake — no internet required
- **Technology:** Node.js, Africa's Talking USSD API
- **State store:** DynamoDB ravencry-sessions (TTL 5 min)
- **Inputs:** AT USSD POST requests
- **Outputs:** CON/END USSD responses, Aurora cases INSERT
- **Failure mode:** DB write fails → return session error, do not lose input (retry on reconnect)
- **Hackathon:** ✅ MVP (sandbox)

### 3.7 Next.js PWA
- **Purpose:** Web-based citizen-facing interface
- **Technology:** Next.js 14 (App Router), TypeScript, Tailwind, next-pwa
- **Deployment:** Vercel
- **Inputs:** User form data, browser geolocation, SSE stream
- **Outputs:** POST /api/reports, POST /api/sightings, GET /api/alerts/active
- **Failure mode:** API unreachable → queue in IndexedDB, retry on reconnect
- **Hackathon:** ✅ MVP

### 3.8 Appsmith Ops Dashboard
- **Purpose:** Internal case management and alert approval for operators
- **Technology:** Appsmith (self-hosted), connected to RDS PostgreSQL
- **Port:** 8080
- **Inputs:** RDS DB queries, n8n webhooks
- **Outputs:** PUT /api/ops/alerts/:id/approve, PUT /api/ops/alerts/:id/suppress
- **Access:** Internal only (EC2 security group, VPN for remote operators)
- **Auto-approve:** `AUTO_APPROVE_FLASH=true` ENV flag skips operator approval for FLASH cases (demo mode)
- **Hackathon:** ✅ MVP

---

## 4. API CONTRACT

### Public Endpoints

```
POST /api/reports
  Auth:       Optional Bearer token (phone OTP)
  Rate limit: 3 per phone/hr, 100 per IP/hr
  Body:       { channel, reporter_phone?, person_name, age?, gender?, last_seen_location, last_seen_time?, description?, media_urls? }
  202:        { case_id, status: "received", eta_seconds: 30 }
  400:        { error: "missing_required_fields", fields: [] }
  429:        { error: "rate_limit_exceeded", reset_at: ISO }

POST /api/sightings
  Auth:       None required
  Body:       { case_id, description, sighting_location, sighting_time?, reporter_phone?, photo_url? }
  202:        { sighting_id, status: "received" }
  404:        { error: "case_not_found" }

GET /api/alerts/active
  Auth:       None
  Query:      lat?, lng?, radius_km? (default 160), limit? (default 10)
  200:        { alerts: AlertCard[], total: number, geofenced: boolean }

GET /api/cases/:id
  Auth:       None (public safe view only)
  200:        { case_id, person_name, age, gender, last_seen_location, last_seen_time, photo_url, status, sightings_count }
  404:        { error: "not_found" }

POST /api/subscribe
  Auth:       Phone OTP token required
  Body:       { lga, state, coords?: { lat, lng }, whatsapp?: boolean, push_token?: string }
  201:        { subscriber_id, confirmation: "subscribed" }

DELETE /api/subscribe
  Auth:       Phone OTP token required
  204:        (no content)

GET /api/health
  Auth:       None
  200:        { status: "ok"|"degraded", sources: { [name]: { status, last_event_at } }, uptime_seconds }

GET /events
  Auth:       None (rate limited by IP)
  Content-Type: text/event-stream
  Events:     { type: "initial"|"new_alert"|"case_update"|"sighting", payload }
```

### Operator Endpoints (JWT Required)

```
POST /api/ops/alerts/:id/approve
  Auth:       operator JWT
  Body:       { notes? }
  200:        { status: "broadcast_initiated", broadcast_eta_seconds: 10 }

POST /api/ops/alerts/:id/suppress
  Auth:       operator JWT
  Body:       { reason }
  200:        { status: "suppressed" }

PATCH /api/ops/cases/:id
  Auth:       operator JWT
  Body:       { status?, resolution_notes? }
  200:        { updated: true }

GET /api/ops/queue
  Auth:       operator JWT
  Query:      tier?, status?, page?
  200:        { cases: CaseDetail[], total, page }

POST /api/auth/login
  Body:       { email, password }
  200:        { token, operator: { id, name, role } }
  401:        { error: "invalid_credentials" }
```

---

## 5. DATA MODELS (TypeScript)

```typescript
interface Person {
  id: string             // UUID
  full_name: string
  age_estimate: number | null
  gender: 'male' | 'female' | 'unknown'
  clothing_desc: string | null
  distinguishing: string | null
  photo_s3_key: string | null
  created_at: string
  updated_at: string
}

interface Case {
  id: string             // NR-YYYY-NNNNNN
  person_id: string
  status: CaseStatus
  alert_tier: 'FLASH' | 'PRIORITY' | 'ROUTINE' | null
  circumstance: 'abduction' | 'missing' | 'witnessed_kidnapping' | 'unknown'
  last_seen_location: string | null
  last_seen_lga: string | null
  last_seen_state: string | null
  last_seen_coords: { lat: number; lng: number } | null
  last_seen_time: string | null
  input_channel: InputChannel
  reporter_phone: string | null   // SHA-256 hash
  language: LanguageCode
  raw_report: string | null
  qwen_confidence: number | null
  trust_score: number | null
  antifake_verdict: string | null
  broadcast_at: string | null
  sms_recipients_count: number
  created_at: string
  updated_at: string
}

interface Sighting {
  id: string
  case_id: string
  status: 'unprocessed' | 'under_review' | 'confirmed' | 'rejected'
  description: string
  sighting_time: string | null
  sighting_location: string | null
  sighting_coords: { lat: number; lng: number } | null
  photo_s3_key: string | null
  trust_score: number | null
  created_at: string
}

interface Alert {
  id: string
  case_id: string
  tier: 'FLASH' | 'PRIORITY' | 'ROUTINE'
  status: 'pending' | 'approved' | 'suppressed' | 'broadcast'
  approved_by: string | null
  channels: string[]
  sms_count: number
  telegram_sent: boolean
  naptip_sent: boolean
  created_at: string
  broadcast_at: string | null
}

interface Subscriber {
  id: string
  phone_hash: string
  lga: string | null
  state: string | null
  location: { lat: number; lng: number } | null
  whatsapp_opted_in: boolean
  push_token: string | null
  active: boolean
  subscribed_at: string
}

// Alert card (public API response — minimal PII)
interface AlertCard {
  case_id: string
  person_name: string
  age_estimate: number | null
  gender: string
  last_seen_location: string
  last_seen_time: string
  alert_tier: 'FLASH' | 'PRIORITY'
  photo_url: string | null   // pre-signed S3 URL, 1hr expiry
  sightings_count: number
}
```

---

## 6. N8N WORKFLOW DEPENDENCY MAP

```
WF-01 (WhatsApp Intake)
  triggers: Meta WhatsApp Cloud API webhook
  calls: Whisper, Qwen QW-01+QW-02+QW-04, Aurora INSERT, AT Reply
  outputs to: Aurora cases table

WF-02 (FLASH Broadcast)
  triggers: Crucix FLASH webhook → n8n
  calls: Aurora SELECT (case + geofence), S3 presigned URL, Telegram API, AT SMS, Web Push, NAPTIP, DynamoDB PUT
  outputs to: All delivery channels + Aurora UPDATE

WF-03 (OSINT Ingestion)
  triggers: Cron every 5 minutes
  calls: Huginn SSE/webhook, Qwen QW-03, Aurora SELECT (dedup), Aurora INSERT
  outputs to: Aurora cases table (status: pending_review)

WF-04 (Sighting Processing)
  triggers: POST /api/sightings
  calls: Trust score calculation, Aurora INSERT sightings, Aurora SELECT (case tier)
  conditional: IF score>0.8 AND FLASH → Telegram ops notify

WF-05 (USSD Report)
  triggers: Africa's Talking USSD POST
  calls: DynamoDB session GET/PUT, Aurora INSERT (on completion)
  outputs to: AT USSD CON/END response
```

---

## 7. SECURITY DESIGN

### Authentication
- Operators: JWT (RS256, 8hr expiry). Stored in httpOnly cookie. Refresh via /api/auth/refresh.
- Citizens: Optional phone OTP. 6-digit code via AT SMS. Token valid 24h.
- Service-to-service: shared secret header (X-RAVENCRY-Secret) for n8n/Crucix webhooks.

### Data Protection
| Data type       | Storage                       | Retention                          |
| --------------- | ----------------------------- | ---------------------------------- |
| Phone numbers   | SHA-256 hash in Aurora        | 12 months inactive then TTL delete |
| Face images     | S3 original/                  | Deleted via lifecycle after 72h    |
| Face embeddings | Aurora persons.face_embedding | Retained for case duration         |
| Voice notes     | S3 audio/                     | Deleted after 24h                  |
| Case records    | Aurora cases                  | 7 years (legal compliance)         |
| Audit log       | DynamoDB                      | 7 years                            |
| USSD sessions   | DynamoDB                      | 5 minutes (TTL)                    |

### RBAC Permissions Matrix
| Action                   | moderator | senior_moderator | admin | investigator |
| ------------------------ | --------- | ---------------- | ----- | ------------ |
| View cases               | ✅         | ✅                | ✅     | ✅            |
| Approve FLASH            | ✅         | ✅                | ✅     | ❌            |
| Suppress alert           | ❌         | ✅                | ✅     | ❌            |
| Resolve case             | ❌         | ✅                | ✅     | ✅            |
| View raw report          | ✅         | ✅                | ✅     | ✅            |
| View reporter phone hash | ❌         | ❌                | ✅     | ❌            |
| Manage sources           | ❌         | ❌                | ✅     | ❌            |
| Create operators         | ❌         | ❌                | ✅     | ❌            |

---

## 8. DEPLOYMENT SPECIFICATION

### Vercel (Frontend)
```
Project:       ravencry-web
Framework:     Next.js
Root dir:      apps/web
Build command: npm run build
Output dir:    .next
Env vars:      NEXT_PUBLIC_API_URL, NEXT_PUBLIC_VAPID_KEY, NEXT_PUBLIC_AT_WHATSAPP
```

### EC2 Docker Compose
```yaml
version: '3.9'
services:
  crucix:        image: ravencry/crucix    ports: ["3001:3001"]
  n8n:           image: n8nio/n8n        ports: ["5678:5678"]
  qwen-service:  image: ravencry/qwen      ports: ["3002:3002"]
  whisper:       image: ravencry/whisper   ports: ["8000:8000"]
  appsmith:      image: appsmith/appsmith ports: ["8080:8080"]
  caddy:         image: caddy:2-alpine   ports: ["443:443", "80:80"]
  dozzle:        image: amir20/dozzle    ports: ["9999:8080"]  # log viewer
```

> **Note:** Huginn removed (Crucix handles OSINT natively). nginx replaced with Caddy (auto-HTTPS). Dozzle added for log aggregation.

### Caddy Routing (automatic HTTPS via Let's Encrypt)
```
api.ravencry.ng   → EC2 :3001 (Crucix + Express API)
n8n.ravencry.ng   → EC2 :5678 (internal only via VPN)
ops.ravencry.ng   → EC2 :8080 (Appsmith, internal only)
ravencry.ng       → Vercel (Next.js PWA)
```

---

## 9. MONOREPO STRUCTURE

```
ravencry/
├── apps/
│   ├── web/                  ← Next.js PWA (Vercel)
│   └── ops/                  ← Appsmith export (JSON)
├── services/
│   ├── api/                  ← Express REST API gateway (public + operator endpoints)
│   ├── crucix/               ← Forked + modified Crucix (OSINT sweep only)
│   ├── qwen/                 ← Qwen triage service
│   ├── whisper/              ← Whisper Flask service
│   ├── whatsapp/             ← AT WhatsApp bot handler
│   ├── telegram/             ← Telegram bot handler (intake + broadcast)
│   └── ussd/                 ← AT USSD handler
├── n8n-workflows/            ← Exported n8n workflow JSONs
├── db/
│   ├── migrations/           ← Numbered SQL files (001–014)
│   └── seed.sql
├── specs/                    ← Kiro spec files (this folder)
├── prompts/                  ← AI session prompts
├── skills/                   ← Reusable AI skills
├── Caddyfile                 ← Caddy reverse proxy config (replaces nginx)
├── docker-compose.yml
├── docker-compose.dev.yml    ← Local dev (PostGIS + DynamoDB local + MinIO)
├── .env.example
└── README.md
```
