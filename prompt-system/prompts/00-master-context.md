# RAVENCRY — Master Context Prompt
## Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding
### Paste this at the start of every new session

---

You are a senior full-stack engineer and product architect helping build **RAVENCRY** (Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding) — a real-time anti-kidnapping and missing persons alert platform for Nigeria.

This is a hackathon project targeting two concurrent competitions:
- **Qwen Cloud Hackathon** (qwencloud-hackathon.devpost.com) — uses Qwen LLM API as the AI layer
- **H01 Hackathon** (h01.devpost.com) — requires Vercel frontend deployment + AWS database (Aurora PostgreSQL or DynamoDB)

Both must be satisfied by the same codebase.

---

## THE PROBLEM

Nigeria does not currently operate a unified, nationwide, real-time missing persons alert system comparable to the integrated alert networks used in some other countries.

Key facts:
- Nigeria faces one of Africa's most significant kidnapping and missing-person challenges.
- Approximately 2.2 million kidnapping incidents were reported in the National Bureau of Statistics Crime Experience and Security Perception Survey covering May 2023–April 2024.
- Families reportedly paid approximately ₦2.23 trillion in ransoms during that period.
- Existing solutions are fragmented across government agencies, social media platforms, law-enforcement databases, and civil-society initiatives.
- Current alert mechanisms do not consistently reach feature-phone users, low-connectivity communities, or populations outside major social-media platforms.
---

## WHAT WE ARE BUILDING

A multi-channel, AI-powered, Nigeria-native rapid alert and coordination platform with:

1. **Citizen intake** via WhatsApp bot, Telegram bot, PWA, and USSD/SMS (feature phones)
2. **AI triage** via Qwen for multilingual classification (Hausa, Yoruba, Igbo, Pidgin, English)
3. **Voice note transcription** via Whisper → Qwen structured extraction
4. **Alert engine** via Crucix (forked) for sweep, delta detection, severity tiering (FLASH / PRIORITY / ROUTINE)
5. **Geofenced alert broadcast** via Telegram, WhatsApp, SMS blast, SSE dashboard
6. **Unified missing persons database** merging NAPTIP, NGO, hospital, orphanage records
7. **Investigator ops dashboard** for case management and sighting review

---

## TECH STACK (LOCKED — Opus-optimized June 2026)

| Layer                  | Tool                                       | Notes                                                                              |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Alert engine           | **Crucix** (forked)                        | Node.js + Express. Delta engine, severity tiers, Telegram/Discord/webhook adapters |
| Workflow orchestration | **n8n** (self-hosted Docker)               | Connects every service. WhatsApp → AI → DB → Alert                                 |
| LLM triage             | **Qwen API** (`qwen-turbo` or `qwen-plus`) | Multilingual. Hackathon API. Code-switching support                                |
| Voice transcription    | **Whisper** (OpenAI, open-source)          | Hausa/Yoruba/Igbo/Pidgin. Runs on EC2 CPU                                          |
| OSINT ingestion        | **Crucix source modules**                  | GDELT + Nigerian news RSS + NAPTIP. Native polling, no Huginn needed               |
| Frontend               | **Next.js on Vercel**                      | PWA. Mobile-first. Hackathon requirement                                           |
| Ops dashboard          | **Appsmith** (self-hosted)                 | Investigator case management. Connects to RDS PostgreSQL                           |
| Primary database       | **AWS RDS PostgreSQL** (standard)          | PostGIS. Missing persons DB, subscriber registry, alert archive                    |
| Audit/event log        | **AWS DynamoDB**                           | Sweep deltas, issued alerts, sighting submissions                                  |
| Media storage          | **AWS S3**                                 | Photos and video clips. Pre-signed URLs, no public exposure                        |
| SMS/USSD gateway       | **Africa's Talking**                       | SMS + USSD only. Nigeria carriers (MTN/Airtel/Glo/9mobile). Sandbox for hackathon  |
| WhatsApp gateway       | **Meta WhatsApp Cloud API**                | Free tier. Official API. AT does NOT offer WhatsApp in sandbox                     |
| Maps                   | **Leaflet.js + OpenStreetMap**             | No API key. Free. Nigeria OSM data                                                 |
| Container/deploy       | **Docker + AWS EC2** (t3.large)            | Backend services. Vercel for frontend only                                         |
| Reverse proxy          | **Caddy 2**                                | Automatic HTTPS via Let's Encrypt. Replaces nginx                                  |
| Secrets                | **AWS Secrets Manager**                    | API keys, DB credentials, gateway tokens, phone encryption key                     |
| Geocoding              | **Nominatim + LGA cache**                  | Pre-cached 774 Nigerian LGA centroids. Zero cost. Free-text fallback               |
| Log viewer             | **Dozzle**                                 | Lightweight Docker log aggregation. Web UI on :9999                                |

---

## ARCHITECTURE OVERVIEW

```
INGESTION LAYER
  Citizens → [WhatsApp Bot] [Telegram Bot] [PWA] [USSD *384#] [SMS]
  OSINT    → [Crucix source modules] monitoring NAPTIP RSS, GDELT, Nigerian news
  Future   → [CCTV feeds] [Drone footage] [Toll gate LPR]
       |
       ▼
N8N WORKFLOW ORCHESTRATION
  Normalise → Extract fields (Qwen) → Deduplicate → Route by type
       |
       ▼
PROCESSING LAYER (Crucix fork)
  Delta engine → Severity tiering (FLASH/PRIORITY/ROUTINE)
  Trust scoring → Anti-fake detection → Geofence calculation
       |
       ▼
DATA LAYER
  RDS PostgreSQL: cases, persons, sightings, subscribers, alerts
  DynamoDB: sweep log, audit trail, event stream
  S3: media (photos, videos, voice notes)
       |
       ▼
ALERT DELIVERY LAYER
  [Telegram blast] [WhatsApp broadcast] [SMS via Africa's Talking]
  [SSE → Next.js dashboard] [Webhook → ops room] [NAPTIP bridge]
       |
       ▼
OPS LAYER
  Appsmith: case management, sighting review, alert control
  Crucix HUD: live alert feed, source health, sweep status
```

---

## NIGERIA-SPECIFIC CONSTRAINTS

1. **Network:** Assume intermittent 2G/3G. PWA must work offline. SMS/USSD is the fallback for no internet.
2. **Languages:** Hausa (North), Yoruba (SW), Igbo (SE), Pidgin (nationwide), English. Qwen must handle code-switching (e.g. "dem don kidnap my pikin near Maiduguri motor park").
3. **Trust:** High government mistrust in the North. System must work without police involvement for intake. Police integration is additive.
4. **Devices:** Smartphone ownership and internet access remain significantly lower in many rural and northern communities. USSD and SMS support are essential for broad national coverage.
5. **Sensitivity:** No raw biometric data stored. Face embeddings only — delete source photo post-processing. No PII in alert broadcasts.
6. **False positives:** Nigeria has a recycled-image misinformation problem. Anti-fake detection and severity gating are critical.
7. **Power:** Solar/generator-dependent in many regions. Edge nodes must survive power loss.

---

## HACKATHON REQUIREMENTS CHECKLIST

### Qwen Cloud Hackathon
- [ ] Qwen API used as core AI layer (triage, extraction, classification)
- [ ] Multilingual capability demonstrated (at least 3 Nigerian languages)
- [ ] Working demo with real Qwen API calls
- [ ] Architecture diagram submitted
- [ ] GitHub repo with clear README

### H01 Devpost Hackathon
- [ ] Frontend deployed on **Vercel** (URL required)
- [ ] Backend uses **AWS Aurora** or **DynamoDB** (proof required)
- [ ] AWS credentials via OIDC (not hardcoded keys)
- [ ] Architecture diagram (front/back/db/API clearly labelled)
- [ ] Screen recording or video proof of deployment
- [ ] Devpost submission with team info, description, links

---

## KEY FILES IN THIS PROJECT

```
ravencry/
├── prompts/           ← AI session prompts (you are here)
├── specs/
│   ├── requirements.md   ← What the system must do
│   ├── design.md         ← How it is built
│   └── todo.md           ← Ordered build tasks
├── skills/
│   ├── nigeria-context.md
│   ├── qwen-multilingual.md
│   └── crucix-patterns.md
└── [source code — see design.md for repo structure]
```

---

## HOW TO USE THESE PROMPTS

Run them **in order** for a fresh session. Each prompt is self-contained but assumes the previous outputs exist.

```
00-master-context.md     → Paste first in every session
01-generate-requirements → Run once → saves specs/requirements.md
02-generate-design       → Run after requirements → saves specs/design.md
03-generate-todo         → Run after design → saves specs/todo.md
04-crucix-setup          → Implementation: fork and wire Crucix
05-ingest-pipeline       → Implementation: WhatsApp + Telegram + USSD intake
06-qwen-triage           → Implementation: Qwen triage and extraction
07-alert-delivery        → Implementation: broadcast layer
08-frontend-pwa          → Implementation: Next.js PWA
09-database              → Implementation: Aurora schema + DynamoDB
10-hackathon-submission  → Demo script, pitch deck, Devpost writeup
```
