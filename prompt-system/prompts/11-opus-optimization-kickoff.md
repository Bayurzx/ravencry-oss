# RAVENCRY — Opus Optimization Kickoff Prompt
## Paste this entire file into a fresh Claude Opus session

---

You are a principal engineer, AI systems architect, and product strategist.
You are being handed a fully scoped project called **RAVENCRY** — Real-time AI for Vigilance, Event Notification, and Crisis Response Yielding — a Nigeria-native, multi-channel, AI-powered anti-kidnapping and missing persons rapid alert platform.

Your job in this session is to **systematically optimize the entire project** across specs, architecture, data layer, LLM task allocation, tooling, algorithms, and team coordination. Work through every section below in order. Be rigorous. Challenge weak decisions. Propose better ones with justification. Do not pad — every line you write must earn its place.

The project targets two concurrent hackathons:
- **Qwen Cloud Hackathon** — Qwen API must be the core LLM
- **H01 Devpost Hackathon** — Vercel frontend + AWS database required

---

## CONTEXT FILES (load these before optimizing)

The following files exist and contain the full project context. Read the content index first, then pull relevant sections as needed per task.

```
ravencry/
├── CONTENT_INDEX.md              ← Start here. Full file map.
├── prompts/
│   ├── 00-master-context.md      ← Full project brief, stack, constraints
│   ├── 01-generate-requirements.md
│   ├── 02-generate-design.md
│   ├── 03-generate-todo.md
│   ├── 04-crucix-setup.md
│   ├── 05-ingest-pipeline.md
│   ├── 06-qwen-triage.md
│   ├── 07-alert-delivery.md
│   ├── 08-frontend-pwa.md
│   ├── 09-database.md
│   └── 10-hackathon-submission.md
├── specs/
│   ├── requirements.md           ← 18 FR + 10 NFR with acceptance criteria
│   ├── design.md                 ← Architecture, data models, API contracts
│   └── todo.md                   ← 73 ordered tasks, ~35h hackathon scope
└── skills/
    ├── nigeria-context.md        ← Security landscape, infrastructure, language
    ├── qwen-multilingual.md      ← Tested Qwen prompt patterns
    └── crucix-patterns.md        ← Crucix extension guide
```

---

## KNOWN CORRECTIONS (apply these before optimizing)

Before touching any spec, apply these two corrections everywhere they appear:

1. **REMOVE** any claim that "Nigeria accounts for ~50% of missing persons in Africa."
   This statistic is unsubstantiated. Africa lacks a standardised continent-wide missing persons database. Remove the claim entirely or replace with: *"Nigeria is among the countries with the highest rates of kidnapping incidents in Africa, with thousands of cases recorded annually."*

2. **REPLACE** any statement that "The North and rural regions have feature phones only."
   Correct version: *"Smartphone ownership is significantly lower in rural and northern communities, making app-only alert systems insufficient — but millions of people in northern Nigeria do use smartphones. RAVENCRY must serve both."*

---

## TASK 1 — SPEC OPTIMIZATION (Priority)

### 1A. Requirements Review (`specs/requirements.md`)

Go through every FR and NFR. For each one:
- Is the acceptance criteria testable by a developer alone, or does it require infrastructure?
- Are MUST requirements actually achievable within a 3-day hackathon?
- Are any requirements contradictory or duplicating each other?
- Are there missing requirements that the design implies but the spec doesn't capture?

Produce: a revised requirements summary with changes flagged as `[ADDED]`, `[MODIFIED]`, `[REMOVED]`, `[DOWNGRADED to V2]`.

### 1B. Design Review (`specs/design.md`)

Audit every architectural decision:
- Is the Docker Compose stack on a single EC2 t3.medium realistic for the hackathon demo load?
- Is Aurora PostgreSQL justified over RDS PostgreSQL standard given the hackathon timeline and budget?
- Is n8n the right orchestration layer, or is there a lighter alternative for a 3-day build?
- Are the API endpoints complete, correctly typed, and consistent with the data models?
- Does the alert lifecycle flow have any race conditions or missing error boundaries?

Produce: a list of design risks with recommended mitigations.

### 1C. Todo Review (`specs/todo.md`)

Audit the task breakdown:
- Are any tasks underestimated given the tools involved?
- Are there dependency cycles or sequencing errors?
- What is the actual minimum critical path to a working demo (not full feature set)?
- Which tasks can be safely cut for the hackathon without breaking the demo?
- Which tasks are highest-risk and need buffer time?

Produce: an optimised critical path with revised time estimates and a list of cut candidates.

---

## TASK 2 — TECH STACK DECISION AND DOCUMENTATION

Review the current stack in `prompts/00-master-context.md`. For each tool, confirm or challenge the choice by answering:
- Is this the right tool for this specific job at hackathon scale?
- What is the setup time cost vs the capability gain?
- Is there a simpler drop-in that gets 80% of the value in 20% of the time?

Produce a **finalised tech stack decision table** in this format:

```markdown
| Layer | Chosen Tool | Version | Justification | Alternative Considered | Why Alternative Rejected |
| ----- | ----------- | ------- | ------------- | ---------------------- | ------------------------ |
```

Pay particular attention to:
- **n8n vs alternatives** (Temporal, BullMQ, simple Express queues) — is n8n setup overhead worth it for a hackathon?
- **Appsmith vs alternatives** (Retool, custom Next.js admin, Grafana) — is self-hosted Appsmith too slow to set up?
- **Huginn vs alternatives** (simple cron scripts, n8n polling nodes) — does Huginn add enough to justify its own container?
- **Aurora vs RDS PostgreSQL** — Aurora has a higher cold-start and cost; is it justified?
- **Crucix fork vs building a custom sweep engine** — given the modifications needed, is forking Crucix actually faster than a minimal custom implementation?
- **Whatsapp vs Telegram** — given that telegram can allow us to test the MVP easier but whatsapp is more adopted for real world use case, we should make provision for both if possible.

---

## TASK 3 — DATA LAYER AND DB SCHEMA OPTIMIZATION

Load `prompts/09-database.md` and `specs/design.md` Section 3.

Perform a full schema review:
- Are indexes sufficient for the query patterns described (geofence, case status, sweep polling)?
- Is the PostGIS usage correct — specifically the `GEOGRAPHY` vs `GEOMETRY` type choice and SRID?
- Is the DynamoDB table design optimised — are GSIs correct for the access patterns?
- Is the S3 folder structure and lifecycle policy complete and correctly scoped?
- Are there missing tables? (e.g. push_subscriptions as separate from subscribers, media_assets tracking table)
- Is the case ID format (`NR-YYYY-NNNNNN`) collision-safe under concurrent inserts?
- Is the `face_embedding VECTOR(512)` column viable on Aurora PostgreSQL, or does it require pgvector extension?

Produce:
- A list of schema corrections with revised SQL where applicable
- A confirmed index strategy per query pattern
- DynamoDB access pattern validation
- S3 architecture confirmation or revision

---

## TASK 4 — LLM TASK ALLOCATION

This is a resource and accuracy optimisation problem. RAVENCRY uses multiple AI operations. For each operation, decide the optimal executor.

### Operations to allocate:

| Operation                     | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| QW-01 Field extraction        | Extract structured fields from raw multilingual report text |
| QW-02 Severity classification | FLASH / PRIORITY / ROUTINE classification                   |
| QW-03 OSINT classification    | Is this news article relevant to RAVENCRY?                  |
| QW-04 Anti-fake detection     | Is this report suspicious or recycled?                      |
| Voice transcription           | Convert audio report to text                                |
| Trust scoring                 | Rate citizen report credibility                             |
| Case deduplication            | Is this the same incident as an existing case?              |
| Sighting correlation          | Does this sighting match the right case?                    |
| Alert copy generation         | Generate the broadcast SMS and Telegram message text        |
| Face embedding extraction     | Extract face vector from uploaded photo                     |
| Operator case summary         | Summarise a case for the investigator dashboard             |

### For each operation, decide:

```markdown
**Operation:** [name]
**Executor:** Qwen-turbo | Qwen-plus | Qwen-max | Rule-based | Human operator | Edge model | Hybrid
**Trigger:** On-demand | Batch | Scheduled | Human-initiated
**Latency budget:** [ms]
**Cost per 1000 ops:** [estimate]
**Fallback:** What happens if this executor fails?
**Human escalation trigger:** When does a human need to review this?
```

### Optimization goals:
- FLASH cases: prioritise accuracy over cost — use the most capable model
- OSINT (high volume): prioritise cost over perfection — qwen-turbo or rule-based pre-filter
- Voice transcription: offline-capable local model preferred (Whisper) over API call
- Trust scoring: rule-based first pass, LLM only for ambiguous cases (hybrid)

---

## TASK 5 — USER TESTING MILESTONES

The developer (solo or small team) needs to know exactly when to stop building and test. Define testing gates.

For each milestone below, produce a **test gate specification**:
- What to test (exact user action)
- What the expected result is
- What tool or method to use for verification
- What failure means (is it a blocker or a warning?)

### Milestones requiring test gates:

```
MILESTONE 1: Infrastructure live
  After: T-013 (Docker Compose running on EC2)

MILESTONE 2: Database ready
  After: T-011 + T-014 (Aurora schema + seed data)

MILESTONE 3: First AI call
  After: T-030 (Qwen extraction service)

MILESTONE 4: First intake working
  After: T-036 (WhatsApp → case in Aurora)

MILESTONE 5: First alert fired
  After: T-043 (FLASH broadcast pipeline)

MILESTONE 6: Frontend live
  After: T-050 (Vercel deployment)

MILESTONE 7: Full end-to-end
  After: T-060 (USSD → FLASH → SMS → sighting)

MILESTONE 8: Hackathon-ready
  After: T-072 (screen recording complete)
```

For each milestone also specify: **who can test it** (solo developer vs needs a second person vs needs a real phone).

---

## TASK 6 — ADDITIONAL TOOLS AND RESOURCES

Review the current tool stack and identify gaps. For each gap, recommend the best available tool.

Areas to investigate:

**Monitoring and observability:**
- What monitors the EC2 Docker services in production?
- What alerts the developer if Crucix stops sweeping at 3am during the hackathon?
- Recommend: lightweight uptime monitor, log aggregation, error alerting

**Load testing:**
- What tool verifies the system handles 100 concurrent report submissions?
- Recommend a specific tool and a minimal test script

**API documentation:**
- Should the API be self-documenting for hackathon judges?
- Recommend: Swagger/OpenAPI auto-generation approach for the Express backend

**Local development:**
- Is there a local development setup that doesn't require EC2 (for fast iteration)?
- Recommend: a dev docker-compose.dev.yml approach

**CI/CD:**
- Is there a GitHub Actions workflow for automated Vercel deploy + basic test run?
- Produce a minimal `.github/workflows/deploy.yml`

**Geocoding:**
- The system needs to convert text location ("Kasuwan Shanu, Kano") to coordinates for geofencing
- Recommend: best free/low-cost geocoding option for Nigerian place names
- OSM Nominatim vs Google Maps Geocoding API vs what else?

**WhatsApp testing:**
- Africa's Talking sandbox limitations for WhatsApp — what is the workaround for demo?

---

## TASK 7 — COLLABORATION AND CONTRIBUTION MAP

Identify where external help would have the highest leverage. For each role, specify:
- What skill is needed
- What they would work on
- What files/prompts to hand them
- How long the engagement needs to be (hours, not weeks — this is a hackathon)

Roles to evaluate:
- **Hausa language reviewer** — validate Hausa prompt templates and UI copy
- **Nigeria security domain expert** — validate high-risk LGA list, route list, community group details
- **Mobile QA tester** — test PWA on real Nigerian Android device, real Africa's Talking SIM
- **Database reviewer** — validate Aurora schema and PostGIS queries
- **UI/UX reviewer** — validate PWA form flows for low-literacy users

For each role also note: where to find this person (Upwork, local universities, Twitter/X Nigerian tech community, specific Slack/Discord communities).

---

## TASK 8 — ALGORITHM OPTIMIZATION

Review and optimise the four core algorithms:

### 8A. Data Ingestion Pipeline
Current: Crucix sweeps every 5 minutes across 4 sources in parallel.
Questions:
- Is 5 minutes the right interval for each source, or should sources have different intervals?
- How should ingestion priority be weighted? (citizen report > NAPTIP RSS > GDELT)
- What is the deduplication strategy when the same incident appears in multiple sources?
- How should source failures affect the overall sweep health score?

### 8B. Geofence and Subscriber Query
Current: PostGIS `ST_DWithin` with 160km radius.
Questions:
- Is 160km always the right radius? Should FLASH cases use a larger radius?
- Should the radius be dynamic based on incident density or state-level risk?
- What is the query performance at 100,000 subscribers? Is the spatial index sufficient?
- Should Nigeria's state boundaries be used as a hard geofence fallback when coordinates are unavailable?

### 8C. Trust Scoring Algorithm
Current: described qualitatively in prompts but no concrete formula defined.
Produce: a concrete trust scoring formula with weighted inputs:
```
trust_score = weighted_sum(
  phone_verified,           // boolean → weight
  prior_accurate_reports,   // count → weight + cap
  report_specificity,       // 0-1 from Qwen → weight
  media_authenticity,       // 0-1 from QW-04 → weight
  corroboration_count,      // number of matching reports → weight
  reporter_proximity        // distance from incident → weight
)
```
Define: the weights, the cap values, the threshold scores that trigger different actions (auto-proceed, ops review, reject).

### 8D. Case Deduplication
Current: mentioned as a feature but no algorithm defined.
Produce: a concrete deduplication strategy:
- At what point in the pipeline does deduplication run?
- What fields are compared? (name similarity, location proximity, time window, circumstance)
- What similarity threshold merges two reports into one case vs creates a linked case?
- How are OSINT-sourced cases matched against citizen-reported cases of the same incident?
- Recommend: fuzzy string matching library for Nigerian names (pg_trgm, Levenshtein, or other)

---

## OUTPUT FORMAT

Produce your output as a structured markdown document with clearly labelled sections matching Tasks 1–8. Each section should end with a **Decision Summary** — a 3–5 bullet list of the key decisions made, suitable for pasting into the CONTENT_INDEX.md file.

At the very end, produce a **Priority Action List** — the top 10 things the developer should do differently or additionally based on your full review, ranked by impact.

Flag anything that should be discussed with the developer before proceeding with a `⚠️ DECISION NEEDED:` marker.

---

## TONE AND APPROACH

- Be direct. This is a safety-critical system for a real crisis. Weak architecture costs lives eventually.
- Do not hedge on recommendations. Make a call.
- Flag genuine risks clearly. Do not bury them.
- Respect the hackathon constraint — perfect is the enemy of submitted.
- The developer is technically capable. Do not over-explain basics.
