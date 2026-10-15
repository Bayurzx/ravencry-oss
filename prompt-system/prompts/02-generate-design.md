# Prompt 02 — Generate specs/design.md
## Run this AFTER specs/requirements.md is complete

---

## INSTRUCTION TO AI

Using the project context (00-master-context.md) and the requirements (specs/requirements.md), generate a complete `specs/design.md` for RAVENCRY.

This is the technical blueprint. Every engineering decision must be justified. No hand-waving.

---

## SECTIONS TO INCLUDE

---

### Section 1: System Architecture

Produce a full ASCII architecture diagram showing:
- All services and their responsibilities
- All data flows with direction arrows
- All external integrations
- Network boundaries (public internet vs private VPC)
- Hackathon deployment mapping (what runs on Vercel, what runs on EC2, what is managed AWS)

Also produce a second diagram: **Alert Lifecycle Flow**
- From: citizen submits a WhatsApp report
- Through: n8n → Qwen → Crucix → Aurora → geofence → Africa's Talking
- To: subscriber receives SMS alert

---

### Section 2: Component Specifications

For each service, document:
- **Purpose:** one sentence
- **Technology:** exact package/version
- **Inputs:** what data it receives and from where
- **Outputs:** what data it emits and to where
- **Failure mode:** what happens if this service goes down
- **Hackathon scope:** included in MVP yes/no

Services to cover:
1. Crucix fork (alert engine)
2. n8n (workflow orchestration)
3. Huginn (OSINT agents)
4. Qwen triage service (LLM wrapper)
5. Whisper transcription service
6. WhatsApp intake bot (via Africa's Talking or Twilio sandbox)
7. Telegram bot
8. USSD handler (Africa's Talking)
9. PWA frontend (Next.js)
10. Appsmith ops dashboard
11. Aurora PostgreSQL
12. DynamoDB
13. S3 media store
14. Africa's Talking gateway

---

### Section 3: Database Schema

For Aurora PostgreSQL, provide full CREATE TABLE statements (PostgreSQL syntax) for:

```sql
-- Tables required:
persons          -- missing persons profiles
cases            -- each incident/report
sightings        -- community tip submissions
alerts           -- every alert issued
subscribers      -- people opted in to receive alerts by LGA
operators        -- ops staff accounts
audit_log        -- mirror of DynamoDB for SQL queries
sources          -- Crucix source health registry
```

For each table include:
- All columns with types and constraints
- Primary keys, foreign keys
- Indexes (especially geospatial — PostGIS point columns for location)
- Enums for: case_status, alert_tier, input_channel, language

For DynamoDB, specify:
- Table name, partition key, sort key
- GSI definitions
- Use cases (sweep log, event stream, audit trail)

For S3, specify:
- Bucket structure (`ravencry-media/cases/{case_id}/{file_type}/`)
- Lifecycle policies (auto-delete source photos after 72h post-embedding)
- Access pattern (pre-signed PUT URLs for upload, pre-signed GET for display)

---

### Section 4: API Contract

Document every HTTP endpoint the system exposes.

Format:
```
POST /api/reports
Description: Submit a new missing person report
Auth: Optional (phone OTP token if verified)
Rate limit: 3 per phone per hour
Request body: { channel, reporter_phone?, person_name, person_age?, gender?, last_seen_location, last_seen_time, description, media_urls?: [] }
Response 202: { case_id, status: "received", estimated_processing_time_seconds: 30 }
Response 429: { error: "rate_limit_exceeded" }
```

Endpoints to document:
- POST /api/reports (submit report)
- POST /api/sightings (submit sighting tip)
- GET /api/alerts/active (get active alerts, geofenced by lat/lng query params)
- GET /api/cases/:id (get case details — limited public view)
- POST /api/subscribe (opt in to LGA alerts by phone)
- DELETE /api/subscribe (opt out)
- GET /api/health (system health — all source module statuses)
- POST /api/webhook/naptip (receive NAPTIP webhook events)
- GET /events (SSE stream for ops dashboard)
- POST /api/ops/alerts/:id/approve (operator approves FLASH broadcast)
- POST /api/ops/alerts/:id/suppress (operator suppresses false positive)

---

### Section 5: n8n Workflow Specifications

Document each workflow as a node graph with:
- Trigger type
- Each node name, type, and transformation
- Decision branches
- Error handling nodes

Workflows to specify:

**WF-01: WhatsApp Report Intake**
Trigger: WhatsApp webhook → extract message type (text/image/audio/location) → branch by type → [audio: Whisper transcription → Qwen extraction] / [image: S3 upload → embedding] / [text: Qwen extraction] → write to Aurora cases table → create Crucix sweep trigger → send acknowledgement reply

**WF-02: Crucix FLASH Alert Broadcast**
Trigger: Crucix emits FLASH tier event → n8n receives via webhook → fetch case details from Aurora → calculate geofence (PostGIS 160km radius) → get LGA subscribers from Aurora → batch SMS via Africa's Talking → Telegram channel post → SSE push to dashboard → log to DynamoDB

**WF-03: OSINT Ingestion**
Trigger: Cron every 5 minutes → Huginn RSS agents → n8n receives events → Qwen classifies (is this a kidnapping/missing person report?) → if yes: extract structured fields → dedup check against Aurora → if new: create case draft → route to ops dashboard for human review before publishing

**WF-04: Sighting Processing**
Trigger: POST /api/sightings → validate input → trust score calculation → if score > 0.6: add to case timeline → if score > 0.8 + FLASH case: trigger location update alert → notify investigator via Telegram

**WF-05: NAPTIP Bridge**
Trigger: FLASH case confirmed by operator → format NAPTIP Amber Alert payload → POST to NAPTIP webhook → log result → if NAPTIP fails: log warning, do not block broadcast

---

### Section 6: Qwen Integration Spec

Document the exact prompt templates used for each Qwen call.

**QW-01: Report Field Extraction**
```
System: You are a structured data extraction assistant for a Nigerian missing persons alert system. Extract information from reports submitted in Hausa, Yoruba, Igbo, Nigerian Pidgin, or English. Always respond with valid JSON only. No preamble.

User: [raw report text or Whisper transcript]

Response schema: {
  "person_name": string | null,
  "age_estimate": number | null,
  "gender": "male" | "female" | "unknown",
  "clothing_description": string | null,
  "last_seen_location": string | null,
  "last_seen_time": string | null,
  "distinguishing_features": string | null,
  "circumstance": "abduction" | "missing" | "unknown",
  "reporter_relationship": string | null,
  "language_detected": string,
  "confidence": number
}
```

**QW-02: Severity Classification**
Document the prompt template that takes a structured case and outputs FLASH / PRIORITY / ROUTINE with reasoning.

**QW-03: OSINT Classification**
Document the prompt that takes a news headline/snippet and outputs: is_kidnapping_related: boolean, is_missing_person_related: boolean, location_mentioned: string | null, urgency: high | medium | low

**QW-04: Anti-fake Detection**
Document the prompt that takes a report and flags: is_suspicious: boolean, reasons: string[], recommendation: "proceed" | "hold_for_review" | "reject"

---

### Section 7: Crucix Fork Modifications

Document exactly what changes to make to the Crucix codebase:

1. **New source modules** (`apis/sources/`) to create:
   - `naptip-rss.mjs` — polls NAPTIP press release feed
   - `gdelt-nigeria.mjs` — GDELT API filtered to Nigeria + kidnapping keywords
   - `citizen-reports.mjs` — polls internal Aurora DB for new unprocessed reports
   - `sighting-feed.mjs` — polls Aurora for new sightings on active FLASH cases

2. **Alert tier mapping** — modify `briefing.mjs` to use FLASH/PRIORITY/ROUTINE instead of default Crucix tiers

3. **Webhook emitter** — add n8n webhook trigger when FLASH tier fires

4. **Nigeria keyword config** — add `config/nigeria-keywords.json` with kidnapping/missing terms in Hausa, Yoruba, Igbo, English

---

### Section 8: Security Design

Document:
- Authentication flow for operators (JWT, stored in Aurora)
- Rate limiting implementation (Redis or in-memory for hackathon)
- Input sanitisation for all public endpoints
- S3 pre-signed URL flow (upload → process → delete source → store embedding only)
- RBAC roles and permission matrix
- What data is never logged (phone numbers in plain text, face images, location of safe houses)

---

### Section 9: Deployment Architecture

Document the exact deployment for hackathon submission:

```
Vercel:
  - Next.js PWA frontend
  - Environment variables: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN (or OSM)

AWS EC2 (t3.medium, Ubuntu 24):
  Docker Compose services:
  - crucix (port 3001)
  - n8n (port 5678)
  - huginn (port 3000)
  - whisper-api (port 8000)
  - appsmith (port 8080)
  Security groups: 443 public, 5678/3001/8080 private VPC only

AWS Aurora PostgreSQL:
  - Instance: db.t3.medium
  - Extensions: PostGIS, uuid-ossp
  - Subnet: private (no public endpoint)
  - Access: EC2 security group only

AWS DynamoDB:
  - On-demand billing
  - Tables: ravencry-sweep-log, ravencry-alerts, ravencry-audit

AWS S3:
  - Bucket: ravencry-media-{env}
  - Lifecycle: source photos deleted after 72h
  - Access: pre-signed URLs only (no public bucket policy)

AWS Secrets Manager:
  - ravencry/prod/db-url
  - ravencry/prod/qwen-api-key
  - ravencry/prod/africastalking-key
  - ravencry/prod/telegram-bot-token
```

Provide the full `docker-compose.yml` for the EC2 deployment.

---

### Section 10: Frontend Component Map

Document the Next.js PWA structure:

```
pages/
  index.tsx           — Home: report form + recent alerts feed
  report.tsx          — Multi-step report submission flow
  alert/[id].tsx      — Single alert detail page (shareable URL)
  ops/                — Protected: operator dashboard (redirects to Appsmith)

components/
  ReportForm/         — Multi-step: type → details → media → confirm
  AlertCard/          — Minimal: photo, name, area, case ID, sighting button
  AlertFeed/          — SSE-connected live feed of active alerts
  LGAMap/             — Leaflet map with incident pins
  OfflineBanner/      — Shows when PWA is in offline mode
  LanguageSelector/   — Switches UI language (EN / HA / YO / IG)

hooks/
  useAlertFeed.ts     — SSE connection with reconnect logic
  useOfflineCache.ts  — Cache last 10 alerts in IndexedDB
  useGeolocation.ts   — Browser location for geofenced alert filtering
```

---

Save output as: `specs/design.md`
