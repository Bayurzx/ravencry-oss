# RAVENCRY — Content Index
## Master file reference for all LLMs and contributors
### Last updated: June 2026 (Opus optimization applied)

> **Purpose:** Any LLM or contributor starting work on RAVENCRY reads this file first.
> It tells you what exists, what each file contains, and where to go for any given task.
> Keep this updated. A stale index is worse than no index.

---

## PROJECT SUMMARY

**RAVENCRY** — Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding

A Nigeria-native, multi-channel, AI-powered anti-kidnapping and missing persons rapid alert platform. Citizens report via WhatsApp, USSD (*384*72836#), Telegram, or PWA. Qwen AI triages in Hausa/Yoruba/Igbo/Pidgin/English. Crucix sweeps OSINT sources. FLASH alerts broadcast via SMS, Telegram, and push to subscribers within 160km. Investigators manage cases via Appsmith ops dashboard.

**Two concurrent hackathons:**
- Qwen Cloud Hackathon — Qwen API as core LLM layer
- H01 Devpost — Vercel frontend + AWS database

**Status:** [x] Spec phase · [ ] Build phase · [ ] Testing · [ ] Submitted

---

## KNOWN CORRECTIONS (apply everywhere)

1. **REMOVE** "Nigeria accounts for ~50% of missing persons in Africa" — unsubstantiated, no continental database exists. Replace with: *"Nigeria is among the countries with the highest rates of kidnapping incidents in Africa, with thousands of cases recorded annually."*

2. **REPLACE** "The North and rural regions have feature phones only" with: *"Smartphone ownership is significantly lower in rural and northern communities, making app-only alert systems insufficient — but millions of people in northern Nigeria do use smartphones. RAVENCRY must serve both."*

---

## FILE INDEX

---

### `/prompts/` — AI Session Prompts
*Run these in order in a new session. Each is self-contained but assumes prior outputs exist.*

---

#### `00-master-context.md`
**What it contains:** The complete project brief. Stack decisions. Nigeria-specific constraints. Hackathon requirements checklist. File map. How to use all prompts.
**Use when:** Starting any new AI session. Always paste this first.
**Key sections:** Problem statement · Tech stack table · Architecture overview · Nigeria constraints · Hackathon checklist
**Last optimized:** [x] Opus reviewed (Task 1) — June 2026

---

#### `01-generate-requirements.md`
**What it contains:** Instructions for an AI to generate `specs/requirements.md`. Defines all requirement domains, roles, format conventions, and output expectations.
**Use when:** Requirements need to be regenerated or significantly expanded.
**Key sections:** 7 requirement domains · Role definitions · FR format template · NFR areas · Success metrics spec
**Note:** `specs/requirements.md` is the output — edit that file directly for small changes. Use this prompt only for full regeneration.

---

#### `02-generate-design.md`
**What it contains:** Instructions for an AI to generate `specs/design.md`. Covers 10 design sections including architecture diagram, component specs, DB schema, API contracts, n8n workflows, Qwen prompts, Crucix modifications, security design, deployment, and frontend map.
**Use when:** Design needs to be regenerated or a new section needs to be added from scratch.
**Note:** `specs/design.md` is the output — edit that file directly for small changes.

---

#### `03-generate-todo.md`
**What it contains:** Instructions for an AI to generate `specs/todo.md`. Defines 8 build phases, task format conventions, critical path methodology, and parallel track structure.
**Use when:** Todo needs to be regenerated after major spec changes.
**Note:** `specs/todo.md` is the living task file — check boxes there as you build.

---

#### `04-crucix-setup.md`
**What it contains:** Complete implementation guide for forking and modifying Crucix. Covers `.env.example`, `nigeria-keywords.json`, all 4 RAVENCRY source modules (full code), `briefing.mjs` modifications, alert message templates, dashboard extensions, and Docker integration.
**Use when:** Setting up Crucix for the first time, or debugging source modules.
**Key sections:** Source module code (naptip-rss, gdelt-nigeria, nigeria-news-rss, citizen-reports, sighting-feed) · Tier mapping · FLASH webhook emitter · Verification checklist

---

#### `05-ingest-pipeline.md`
**What it contains:** Complete implementation for all citizen intake channels. Full WhatsApp conversation state machine, Telegram bot commands, USSD menu tree and state machine, PWA report form component spec, and n8n WF-01 workflow node spec.
**Use when:** Building or debugging any citizen intake channel.
**Key sections:** WhatsApp states 0–4 + SIGHTING + SUBSCRIBE · USSD menu tree · Africa's Talking request/response format · n8n WF-01 node list · Shared intake utilities

---

#### `06-qwen-triage.md`
**What it contains:** Complete Qwen AI triage service. Service file structure, all 4 prompt templates with full system prompts (QW-01 extraction, QW-02 classification, QW-03 OSINT, QW-04 anti-fake), Qwen client with retry logic, Whisper Docker setup, test cases in 5 languages, Docker Compose additions.
**Use when:** Building or tuning the AI triage layer, writing new prompt templates, debugging Qwen output.
**Key sections:** QW-01 system prompt + response schema + 5 language test cases · QW-02 FLASH/PRIORITY/ROUTINE rules · QW-03 OSINT classification · QW-04 Nigerian fake alert signatures · Qwen client.mjs · Whisper Flask server

---

#### `07-alert-delivery.md`
**What it contains:** Complete alert delivery layer. Delivery matrix by channel and tier, n8n WF-02 FLASH broadcast workflow (full 13-node spec), geofence service code, SMS batch service, NAPTIP bridge, SSE endpoint, Web Push service, operator approval endpoint, auto-approve mode for demo.
**Use when:** Building or debugging the broadcast pipeline, adding a new delivery channel.
**Key sections:** Delivery matrix table · WF-02 node-by-node spec · PostGIS geofence query · Africa's Talking SMS batch · NAPTIP payload format · SSE clients Set · Operator approve flow

---

#### `08-frontend-pwa.md`
**What it contains:** Complete Next.js PWA frontend spec. Project structure, home page layout, 4-step report wizard, alert detail page, i18n translation keys (EN + HA + YO + IG), PWA manifest, service worker config, Vercel deployment config, component and hook map.
**Use when:** Building or debugging the frontend. Implementing offline support. Setting up Vercel.
**Key sections:** Full directory tree · Home page layout diagram · Step 1–4 report form · i18n keys for 4 languages · manifest.json · next.config.js PWA setup · vercel.json

---

#### `09-database.md`
**What it contains:** Complete data layer specification. Full Aurora PostgreSQL schema (CREATE TABLE, indexes, enums, functions), DynamoDB table definitions with GSIs, S3 bucket structure and lifecycle policy, pre-signed URL patterns, migration runner spec, seed data.
**Use when:** Setting up the database, debugging schema issues, adding new tables or indexes.
**Key sections:** Full SQL schema (9 tables) · PostGIS geofence function · DynamoDB 3-table spec · S3 lifecycle JSON · Pre-signed URL patterns · Seed data template

---

#### `10-hackathon-submission.md`
**What it contains:** Everything needed to submit to both hackathons. 5-minute demo script with timestamps, Devpost writeup (all fields), architecture diagram Mermaid spec, README.md section list, pre-submission checklist.
**Use when:** Preparing the demo. Writing the Devpost submission. Creating the README. Recording the screen demo.
**Key sections:** Demo script 0:00–5:00 · Devpost writeup (Inspiration, What it does, How we built it, Challenges, Accomplishments, What's next) · Architecture Mermaid diagram · Pre-submission checklist

---

#### `11-opus-optimization-kickoff.md`
**What it contains:** A single comprehensive prompt for Claude Opus to review and optimise the entire project. Covers spec review, tech stack decisions, schema optimisation, LLM task allocation, user testing milestones, additional tools, collaboration map, and algorithm optimisation.
**Use when:** Starting a dedicated optimisation session in Claude Opus. Run this once after all other prompts have produced their initial outputs.
**Key sections:** 8 optimization tasks · LLM task allocation framework · Trust scoring formula spec · Case deduplication algorithm spec · Collaboration roles and where to find contributors

---

### `/specs/` — Kiro Specification Files
*These are living documents. Edit them directly as the project evolves. They are the source of truth.*

---

#### `specs/requirements.md`
**What it contains:** Formal functional and non-functional requirements with acceptance criteria. 18 FRs + 10 NFRs. Roles, constraints, out-of-scope items, success metrics.
**Use when:** Checking if a feature is in scope. Writing acceptance tests. Onboarding a contributor. Resolving ambiguity about what the system must do.
**Key sections:** 6 roles · 18 FRs with Given/When/Then criteria · 10 NFRs with targets · Out of scope list · Constraints table · Success metrics table
**Optimization status:** [x] Opus Task 1A applied — 20 FRs + 12 NFRs, phone encryption fix, latency metrics split

---

#### `specs/design.md`
**What it contains:** Full technical architecture. ASCII system diagram, alert lifecycle flow, component specs for all 13 services, API contract (all endpoints), TypeScript data models, n8n workflow dependency map, security design (auth, RBAC, data retention), deployment spec, monorepo structure.
**Use when:** Understanding how any part of the system works. Making architecture decisions. Debugging integration issues. Onboarding an engineer.
**Key sections:** System architecture ASCII diagram · Alert lifecycle flow · 8 component specs · Full API contract (public + operator) · TypeScript interfaces · RBAC matrix · Docker Compose spec · Monorepo structure
**Optimization status:** [x] Opus Task 1B applied — EC2 t3.large, RDS PostgreSQL, Huginn cut, Caddy, API gateway added

---

#### `specs/todo.md`
**What it contains:** 73 ordered build tasks across 8 phases. Each task has: ID, phase, layer, time estimate, dependencies, step-by-step instructions, definition of done. Also includes critical path, parallel tracks, and V2 backlog.
**Use when:** Deciding what to build next. Estimating remaining time. Checking task dependencies. Tracking progress (check boxes).
**Key sections:** Phase summary table (~35h total) · Critical path sequence · Parallel tracks table · Phase 0–8 tasks (T-001 to T-073) · V2 backlog (10 items)
**Current status:** [ ] All tasks TODO — update as you build
**Optimization status:** [x] Opus Task 1C applied — 39h revised, T-015 added, T-024 cut, time estimates corrected

---

### `/skills/` — Reusable Reference Skills
*Paste relevant skills into any session where that domain is in play.*

---

#### `skills/nigeria-context.md`
**What it contains:** Ground-truth Nigeria reference. Active conflict zones and high-risk LGAs/routes. Infrastructure constraints (connectivity, devices, power). Language distribution and dialect notes. Hausa/Pidgin keyword tables. Existing systems to integrate with (NAPTIP, N-Alerts, FRSC, vigilante groups). Regulatory context. Realistic test coordinates and seed data.
**Use when:** Any session touching Nigerian geography, language, infrastructure, or integrations. Writing Qwen prompts with Nigerian context. Designing alert geofences. Writing test cases.
**Key sections:** 7 conflict zone LGAs · High-risk routes list · Device landscape · Hausa transliteration variants · Pidgin kidnapping vocabulary · NAPTIP/N-Alerts/FRSC details · Vigilante groups table · Test coordinates for 7 cities

---

#### `skills/qwen-multilingual.md`
**What it contains:** Tested Qwen prompt engineering patterns for Nigerian languages. API setup, model selection guide, 5 language-specific prompt patterns (with examples of what breaks), field extraction edge cases (age, location, time), severity classification edge cases, anti-fake Nigerian-specific signatures, schema validation code, fallback patterns, cost optimisation (batching strategy).
**Use when:** Writing or debugging any Qwen prompt. Handling unexpected Qwen output. Optimising cost. Adding a new language.
**Key sections:** Model selection guide (turbo vs plus vs max) · 5 prompt patterns with correct/wrong examples · Age/location/time edge cases · ALWAYS_FLASH triggers · Nigerian fake alert signatures · AJV schema validator · Batching strategy for OSINT

---

#### `skills/crucix-patterns.md`
**What it contains:** Crucix codebase conventions and extension guide. Runtime loop explanation, source module contract and template, CrucixEvent schema, all 4 RAVENCRY source modules (full code), briefing.mjs modification guide, how to add new alert channels, keyword matching utility, debugging checklist.
**Use when:** Writing a new Crucix source module. Modifying the sweep engine. Debugging source health issues. Adding a delivery channel.
**Key sections:** Runtime loop diagram · Source module template · CrucixEvent schema · 4 RAVENCRY source modules · 3 briefing.mjs changes · Alert channel convention · Keyword utility · 7-item debugging checklist

---

## QUICK DECISION REFERENCE

| I need to...                   | Go to                                      |
| ------------------------------ | ------------------------------------------ |
| Start a new AI session         | `prompts/00-master-context.md`             |
| Run Opus full optimisation     | `prompts/11-opus-optimization-kickoff.md`  |
| Check what to build next       | `specs/todo.md`                            |
| Check if something is in scope | `specs/requirements.md`                    |
| Understand system architecture | `specs/design.md`                          |
| Write a Qwen prompt            | `skills/qwen-multilingual.md`              |
| Add a Crucix source module     | `skills/crucix-patterns.md`                |
| Understand Nigerian context    | `skills/nigeria-context.md`                |
| Build WhatsApp or USSD intake  | `prompts/05-ingest-pipeline.md`            |
| Build Qwen triage service      | `prompts/06-qwen-triage.md`                |
| Build alert broadcast pipeline | `prompts/07-alert-delivery.md`             |
| Build the PWA frontend         | `prompts/08-frontend-pwa.md`               |
| Set up the database            | `prompts/09-database.md`                   |
| Set up Crucix fork             | `prompts/04-crucix-setup.md`               |
| Prepare hackathon submission   | `prompts/10-hackathon-submission.md`       |
| Build the Evidence Briefing Desk live panel | `prompts/12-evidence-briefing-desk-live-panel.md` |
| Onboard a new contributor      | `CONTENT_INDEX.md` → relevant spec + skill |

---

## CONTRIBUTOR ONBOARDING

If you are joining this project for the first time:

1. Read this file fully
2. Read `specs/requirements.md` — understand what the system must do
3. Read `specs/design.md` — understand how it is built
4. Read `skills/nigeria-context.md` — understand the operational environment
5. Check `specs/todo.md` for open tasks
6. Ask the project lead which task to pick up

**For LLM contributors:** always paste `prompts/00-master-context.md` first, then the relevant skill(s), then your task-specific prompt.

---

## CHANGELOG

| Date         | Changed by          | What changed                                                                                   |
| ------------ | ------------------- | ---------------------------------------------------------------------------------------------- |
| [initial]    | Claude (Sonnet 4.6) | Created all 17 files. Named project RAVENCRY.                                                  |
| [correction] | Smtp (human)        | Renamed project to RAVENCRY. Applied corrections to smartphone and missing persons statistics. |
| June 2026    | Opus (Antigravity)  | Full 8-task optimization: schema fixes, Aurora→RDS, Huginn cut, Caddy, trust scoring algo, dedup algo, LLM allocation, 8 decisions resolved. |

---

## TODO FOR THIS FILE

- [x] Add Opus optimisation output summary once Task 11 is complete — see ravencry_opus_optimization.md artifact
- [x] Add final confirmed tech stack table (post Opus Task 2) — applied to 00-master-context.md
- [x] Add trust scoring formula (post Opus Task 8C) — see optimization artifact Task 8C
- [x] Add confirmed LLM task allocation table (post Opus Task 4) — see optimization artifact Task 4
- [ ] Update status fields as specs are finalised
- [ ] Add source code file index once repo is initialised
