# Prompt 03 — Generate specs/todo.md
## Run this AFTER specs/design.md is complete

---

## INSTRUCTION TO AI

Using the project context, requirements, and design documents, generate a complete `specs/todo.md` — the master build task list for RAVENCRY.

This is the single source of truth for what to build and in what order. Every task must be atomic (completable in one focused session), testable (you know when it is done), and ordered by dependency.

---

## STRUCTURE RULES

Every task must have:
- Unique ID: `T-001`, `T-002` ...
- Phase label: `[HACKATHON]` or `[V2]` or `[V3]`
- Time estimate: realistic, not optimistic
- Dependency list: which tasks must be done first
- Definition of Done: exactly how you verify it is complete
- Assigned layer: INFRA / BACKEND / AI / FRONTEND / INTEGRATION / OPS

---

## PHASES TO COVER

### PHASE 0 — Environment Setup (Day 0, ~3 hours)
Tasks:
- AWS account setup + IAM roles
- Vercel project creation
- Africa's Talking sandbox registration
- Qwen API key provisioning
- Telegram bot creation (@BotFather)
- WhatsApp Business sandbox (Africa's Talking or Twilio)
- GitHub repo initialisation (monorepo structure)
- Docker Desktop / EC2 instance provisioned
- AWS Secrets Manager: create all secret slots (empty is fine)
- `.env.example` committed with all required keys documented

### PHASE 1 — Core Infrastructure (Day 1 morning, ~4 hours)
Tasks:
- Aurora PostgreSQL: provision instance, enable PostGIS extension
- Run schema migrations (all tables from design.md Section 3)
- DynamoDB: create all three tables
- S3 bucket: create with lifecycle policy
- EC2: provision t3.medium, install Docker + Docker Compose
- Docker Compose: base file with crucix, n8n, placeholder services
- Crucix: fork repo, run locally, confirm sweep works
- n8n: spin up, access UI, create first workflow placeholder

### PHASE 2 — Ingest Pipeline (Day 1 afternoon, ~5 hours)
Tasks:
- Crucix: add `config/nigeria-keywords.json`
- Crucix: add `apis/sources/naptip-rss.mjs`
- Crucix: add `apis/sources/gdelt-nigeria.mjs`
- Crucix: add `apis/sources/citizen-reports.mjs`
- Huginn: spin up, configure NAPTIP RSS agent
- Huginn: configure local news RSS agents (Vanguard, Punch, Daily Trust)
- n8n: WF-03 OSINT ingestion workflow (Huginn → Qwen → Aurora)
- Verify: OSINT event appears in Aurora `cases` table as draft

### PHASE 3 — AI Triage Layer (Day 1 evening, ~4 hours)
Tasks:
- Qwen wrapper service: create `/services/qwen/` module (Node.js)
- Implement QW-01: report field extraction prompt + response parser
- Implement QW-02: severity classification prompt + response parser
- Implement QW-03: OSINT classification prompt
- Implement QW-04: anti-fake detection prompt
- Whisper: Dockerise and expose as local API (POST /transcribe)
- Unit test: submit Hausa voice note → Whisper → Qwen → structured JSON
- Unit test: submit Pidgin text → Qwen → severity FLASH
- n8n: integrate Qwen service into WF-01 (WhatsApp intake node)

### PHASE 4 — Alert Delivery (Day 2 morning, ~4 hours)
Tasks:
- Telegram bot: register, set webhook to n8n
- Telegram: implement alert broadcast message template (photo + name + area + case ID + sighting CTA)
- Africa's Talking: integrate SMS API in n8n WF-02
- Africa's Talking: implement USSD handler (WF-05 equivalent) — /report, /subscribe, /sighting flows
- Crucix: modify tier mapping to FLASH/PRIORITY/ROUTINE
- Crucix: add n8n webhook emitter on FLASH events
- n8n: WF-02 FLASH broadcast workflow (Crucix → geofence → SMS batch → Telegram)
- Verify: submit FLASH report → Telegram receives alert within 60 seconds

### PHASE 5 — Frontend PWA (Day 2 afternoon, ~5 hours)
Tasks:
- Next.js: initialise project with TypeScript + Tailwind
- `next.config.js`: configure as PWA (next-pwa)
- `manifest.json`: RAVENCRY branding, icons
- `AlertFeed` component: SSE connection to `/events`, renders AlertCards
- `AlertCard` component: photo, name, LGA, case ID, Report Sighting button
- `ReportForm` component: 4-step form (what → who → where → confirm)
- `LGAMap` component: Leaflet + OSM, pins for active FLASH cases
- `OfflineBanner`: detect offline, show cached alerts from IndexedDB
- `LanguageSelector`: EN / HA / YO / IG (i18n strings for all UI copy)
- `useOfflineCache` hook: cache last 10 alerts in IndexedDB on SSE event
- Deploy to Vercel: confirm PWA installs on Android Chrome
- Lighthouse audit: target ≥ 90 performance, ≥ 90 PWA score

### PHASE 6 — Ops Dashboard (Day 2 evening, ~3 hours)
Tasks:
- Appsmith: spin up, connect to Aurora PostgreSQL
- Build: Cases table view (all open cases, sortable by tier, last update)
- Build: Sighting review queue (approve/reject with one click)
- Build: Alert approval modal (FLASH cases require operator confirm before broadcast)
- Build: Case detail page (timeline, sightings map, Qwen extraction output)
- Wire: approve button → POST /api/ops/alerts/:id/approve → n8n WF-02 trigger
- Crucix HUD: confirm source health visible for all modules

### PHASE 7 — Integration & Testing (Day 3 morning, ~4 hours)
Tasks:
- End-to-end test: WhatsApp text report → Qwen → Aurora → FLASH → Telegram alert
- End-to-end test: Voice note (Hausa) → Whisper → Qwen → PRIORITY → SMS subscriber
- End-to-end test: USSD *384# → report flow → case created → subscriber notified
- End-to-end test: OSINT article → Huginn → n8n → Qwen → ops dashboard draft
- Test: anti-fake detection rejects known recycled image
- Test: geofence — subscriber in Lagos does NOT receive Kano alert
- Test: PWA offline mode — last 10 alerts visible without internet
- Test: rate limiting — 4th report from same phone returns 429
- NAPTIP bridge: test webhook delivery (mock endpoint)
- Load test: 100 concurrent report submissions (k6 or Artillery)

### PHASE 8 — Hackathon Submission (Day 3 afternoon, ~3 hours)
Tasks:
- Architecture diagram: draw in Excalidraw or Mermaid (front/back/db/AI/integrations labelled)
- README.md: project overview, setup instructions, live demo URL, architecture diagram embedded
- Demo script: 5-minute walkthrough (see prompt 10-hackathon-submission.md)
- Screen recording: capture full demo flow (OBS or Loom)
- Vercel URL: confirm frontend is live and publicly accessible
- AWS proof: screenshot of Aurora console + DynamoDB tables
- Devpost submission: fill all fields, attach recording, link GitHub + Vercel
- Qwen submission: confirm API calls visible in Qwen console logs

---

## ADDITIONAL INSTRUCTIONS

- Format each task exactly as:

```
### T-001 · AWS Aurora: Provision instance
**Phase:** [HACKATHON] — Phase 1: Core Infrastructure
**Layer:** INFRA
**Estimate:** 30 minutes
**Depends on:** T-000 (AWS account setup)
**Status:** [ ] TODO

**Steps:**
1. Open AWS RDS console → Create database → Aurora PostgreSQL
2. Instance class: db.t3.medium
3. Enable PostGIS: run `CREATE EXTENSION postgis;` post-provision
4. Place in private subnet, no public endpoint
5. Add EC2 security group to inbound rules

**Definition of Done:**
- Aurora endpoint accessible from EC2 instance
- `\dx` in psql shows postgis extension active
- All tables from design.md Section 3 created without errors
```

- Include a **Phase Summary** at the top showing total estimated hours per phase
- Include a **Critical Path** section: the minimum sequence of tasks to get a working demo
- Include a **Parallel Tracks** section: tasks that can run simultaneously
- Total tasks expected: ~60–70 for hackathon phases, ~30 more for V2

Save output as: `specs/todo.md`
