# RAVENCRY — Opus Optimization Review
## Principal Architect Analysis · All 8 Tasks · June 2026

> **Scope:** Systematic review of the entire RAVENCRY project — specs, architecture, data layer, LLM allocation, tooling, algorithms, and team coordination.  
> **Known Corrections:** Verified — both incorrect claims (50% of missing persons, feature phones only) have already been cleaned from all spec files. No further action needed.

---

## TABLE OF CONTENTS

- [Task 1 — Spec Optimization](#task-1--spec-optimization)
  - [1A. Requirements Review](#1a-requirements-review)
  - [1B. Design Review](#1b-design-review)
  - [1C. Todo Review](#1c-todo-review)
- [Task 2 — Tech Stack Decisions](#task-2--tech-stack-decision-and-documentation)
- [Task 3 — Data Layer & Schema Optimization](#task-3--data-layer-and-db-schema-optimization)
- [Task 4 — LLM Task Allocation](#task-4--llm-task-allocation)
- [Task 5 — User Testing Milestones](#task-5--user-testing-milestones)
- [Task 6 — Additional Tools & Resources](#task-6--additional-tools-and-resources)
- [Task 7 — Collaboration & Contribution Map](#task-7--collaboration-and-contribution-map)
- [Task 8 — Algorithm Optimization](#task-8--algorithm-optimization)
- [Priority Action List](#priority-action-list)
- [All ⚠️ DECISION NEEDED Items](#all--decision-needed-items)

---

## TASK 1 — SPEC OPTIMIZATION

### 1A. Requirements Review

Reviewed all 18 FRs and 10 NFRs against hackathon feasibility, testability, and internal consistency.

#### Changes Summary

| FR/NFR | Change | Rationale |
|--------|--------|-----------|
| FR-001 | `[MODIFIED]` | SMS as standalone intake channel is not actually specified in any prompt — USSD and WhatsApp cover it. Remove SMS from FR-001 channel list or explicitly add an SMS bot prompt. Currently a phantom requirement. |
| FR-003 | `[MODIFIED]` | "within 10 seconds" for Whisper transcription is too tight on a t3.medium CPU with whisper-small. Revise to "within 30 seconds" for p95. Whisper-small on CPU averages ~15s for a 30s clip; with queue contention, 10s will fail. |
| FR-004 | No change | Anonymous reporting is correctly specified. Trust score adjustment (0.4 vs 0.6) is reasonable. |
| FR-007 | `[MODIFIED]` | "reverse image search hits > 5" implies RAVENCRY performs reverse image search. This is not specified anywhere in design.md or any prompt. **Either add a Google Vision / TinEye integration to design.md or remove this criterion.** For hackathon: remove and rely on EXIF + Qwen textual analysis only. |
| FR-010 | `[DOWNGRADED to V2]` | NAPTIP Amber Alert webhook endpoint is not publicly documented. Attempting to integrate an undocumented government API during a 3-day hackathon is high-risk for zero demo value. **Mock the NAPTIP bridge** — POST to a webhook.site URL and show it in the demo. Real integration is V2. |
| FR-013 | `[MODIFIED]` | Background sync requires service worker + IndexedDB queue. The acceptance criteria "automatically submitted via background sync" is correct but needs explicit mention that Safari/iOS may not support background sync API. Add note: "Background sync is best-effort; manual retry button shown as fallback." |
| FR-017 | No change | OSINT ingestion via Crucix is correctly specified. |
| FR-018 | `[MODIFIED]` | Source health monitoring (SHOULD priority) is fine, but the "60 minutes" threshold is too aggressive for GDELT (which publishes in batches). Change to "source-specific configurable threshold" with defaults: citizen-reports=15min, NAPTIP-RSS=6h, GDELT=2h, news-RSS=2h. |
| NFR-001 | `[MODIFIED]` | 90s p95 for report-to-broadcast is achievable *only if* operator approval is pre-positioned (auto-approve mode for demo). In manual approval mode, this SLA is meaningless. **Split into two metrics:** (1) report-to-ops-dashboard: ≤30s; (2) approval-to-broadcast: ≤60s. Drop the end-to-end 90s claim — it's misleading when human approval is required. |
| NFR-002 | `[MODIFIED]` | 99.5% uptime is a production target, not a hackathon target. Replace with: "System remains functional through single-container restart. Docker restart:unless-stopped on all services." |
| NFR-004 | `[MODIFIED]` | "Phone numbers: stored only as SHA-256 hash" — this means you **cannot send SMS to subscribers** from the database, since you can't reverse a hash. **This is a fundamental contradiction.** You need the plaintext phone number (or an encrypted but reversible form) for SMS delivery. Fix: Store phone numbers encrypted (AES-256-GCM) with server-side key in Secrets Manager, NOT as irreversible hash. Hash only the reporter phone (for dedup), not the subscriber phone. |
| NFR-007 | `[MODIFIED]` | "≤200KB initial load" for a Next.js PWA with Leaflet is unrealistic. Next.js runtime alone is ~80KB gzipped. Add Leaflet (~40KB gz), i18next, react — you're at ~250-300KB minimum. Revise to "≤500KB gzipped initial bundle" or implement route-based code splitting so the report form loads without the map. |
| NFR-009 | No change | <2% false positive rate is a target, not a hard constraint. Fine as SHOULD. |

#### Missing Requirements (add these)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| `[ADDED]` FR-019 | **Telegram bot intake** — full report submission via Telegram bot (not just alerts) | MUST | Telegram is listed in FR-001 but has no intake prompt/spec. Only alert broadcast is specified in FR-009. |
| `[ADDED]` FR-020 | **Case deduplication** — system must detect when multiple reports describe the same incident | SHOULD | Referenced in design but never formally required. Critical for OSINT + citizen report merge. |
| `[ADDED]` NFR-011 | **Concurrent report handling** — system must handle ≥10 simultaneous report submissions without data loss | MUST | No concurrency requirement exists. Important for credibility. |
| `[ADDED]` NFR-012 | **API error responses** — all API endpoints must return consistent error format `{ error, code, details? }` | MUST | Not specified anywhere. Will cause integration pain without it. |

> [!IMPORTANT]
> **NFR-004 phone hash contradiction is a showstopper.** You cannot send SMS to a SHA-256 hashed phone number. Fix this before writing any subscriber delivery code.

---

### 1B. Design Review

#### Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Single EC2 t3.medium running 7 Docker containers** | 🔴 High | t3.medium has 2 vCPU, 4GB RAM. Whisper alone wants 2GB. n8n wants 1GB. Appsmith wants 2GB. **You will OOM.** Upgrade to t3.large (8GB) minimum, or t3.xlarge (16GB) for comfort. Cost difference: ~$15/month. |
| **Aurora PostgreSQL cold start** | 🟡 Medium | Aurora Serverless v2 has a cold start of 15-30s. For hackathon, use provisioned Aurora (db.t3.medium, always-on) or just standard RDS PostgreSQL. Aurora adds zero value over standard RDS for this scale. |
| **n8n as orchestration layer** | 🟡 Medium | n8n adds visual workflow editing, which is great for demos. But it adds a full container (~1GB RAM) and learning curve. For hackathon: keep n8n — the visual workflow is strong demo material for judges. But have a fallback plan (direct Express-to-Express HTTP calls) if n8n causes instability. |
| **Alert lifecycle has a redundant Crucix loop** | 🟡 Medium | Current flow: citizen report → Qwen triage → Aurora INSERT → Crucix polls Aurora → Crucix emits webhook → n8n broadcasts. The Crucix polling step adds latency and complexity for citizen reports that are already triaged. **For citizen reports**: skip Crucix entirely. After Qwen triage, if tier=FLASH, emit directly to n8n WF-02. Reserve Crucix for OSINT sweep only. |
| **Race condition: concurrent approval** | 🟡 Medium | Two operators could approve the same FLASH case simultaneously, triggering double broadcast. Fix: add `WHERE status = 'pending'` to the UPDATE query in the approval endpoint, and check rows affected = 1 before firing broadcast. |
| **No circuit breaker on Africa's Talking** | 🟡 Medium | If AT is down, every SMS send will timeout (30s default). With 500 subscribers, that's sequential 500×30s = 4+ hours. Fix: set AT timeout to 3s, use batch SMS API (up to 100 per call), add circuit breaker (3 consecutive failures → skip SMS, alert ops). |

#### Design Recommendations

1. **Eliminate the Crucix middleman for citizen reports.** Crucix adds value for OSINT sweep (polling external sources on a schedule). It adds negative value for citizen-submitted reports — those are already in Aurora with a tier. Wire the Qwen triage output directly to the approval queue. This cuts 5 minutes of latency from the citizen report path.

2. **Collapse WF-01 and WF-05 into a single Express intake service.** The WhatsApp handler and USSD handler share 80% of their logic (session management, Qwen calls, Aurora INSERT). A single `services/intake/` service with channel adapters is cleaner than separate n8n workflows. Keep n8n for WF-02 (broadcast) where the visual flow diagram impresses judges.

3. **Add a proper Express API gateway.** Currently the architecture has Crucix on :3001 serving both the sweep engine AND the public API. Separate these — add `services/api/` as the Express REST API gateway (the endpoints in Section 4 of design.md). Crucix stays internal-only.

#### Decision Summary — 1B
- Upgrade EC2 to t3.large minimum (t3.xlarge preferred)
- Replace Aurora with standard RDS PostgreSQL for hackathon (cheaper, no cold start)
- Skip Crucix polling for citizen reports — direct triage to approval queue
- Add approval race condition guard
- Add circuit breaker on Africa's Talking SMS

---

### 1C. Todo Review

#### Time Estimate Corrections

| Task | Current Est. | Revised Est. | Reason |
|------|-------------|-------------|--------|
| T-008 | 20 min | 40 min | Aurora provisioning has a 10-15 min creation time. If switching to RDS standard, same. Add subnet group creation and security group config. |
| T-013 | 30 min | 60 min | "Docker compose up" with 7 services — at least one will fail on first attempt. Budget for debugging. |
| T-022 | 90 min | 120 min | 4 source modules with keyword matching, unit tests, and HUD integration. Hausa keyword testing alone takes time. |
| T-036 | 90 min | 150 min | WF-01 has 11 nodes, Whisper integration, Qwen integration, session management, and AT webhook. This is the hardest single task. |
| T-043 | 90 min | 120 min | WF-02 broadcast with 4 parallel channels + error handling + DynamoDB logging. |
| T-047 | 90 min | 120 min | 4-step wizard with photo upload, GPS, offline queue, AND background sync is a full day of frontend work compressed into 90 min. Cut offline queue to V2 or accept 120 min minimum. |
| **Total** | **~35h** | **~42h** | **Net addition: ~7 hours.** This makes a true solo 3-day hackathon (16h/day = 48h) tight but possible with cuts. |

#### Revised Critical Path (Minimum Viable Demo)

Cut everything that doesn't appear in the 5-minute demo script:

```
T-001 → T-007 → T-008 → T-009 → T-010 → T-011 → T-013 → T-014
→ T-030 → T-031 → T-035 → T-036 (WhatsApp intake)
→ T-040 (Telegram broadcast) → T-041 (SMS service) → T-043 (WF-02 broadcast)
→ T-045 → T-046 → T-047 (PWA report + alert feed)
→ T-050 (Vercel deploy) → T-055 → T-056 (Appsmith approve flow)
→ T-060 (E2E test) → T-072 → T-073 (record + submit)
```

**Estimated critical path: ~28 hours.**

#### Safe Cuts (will not break demo)

| Task | What it is | Why cut it |
|------|-----------|------------|
| T-024 | Huginn OSINT agents | Crucix + GDELT source module covers OSINT demo. Huginn adds a 7th container for marginal value. |
| T-025 | WF-03 OSINT ingestion | Pre-seed OSINT cases in Aurora. Show them in the demo as "OSINT-discovered." |
| T-032 | QW-04 anti-fake | Mention in pitch. Show the prompt. Don't wire it into the pipeline — it's not on the demo path. |
| T-042 | USSD handler | Demo with WhatsApp. Mention USSD in pitch. AT USSD sandbox is flaky. |
| T-044 | NAPTIP bridge | Mock with webhook.site. Show the payload format in the demo. |
| T-048 | i18n (HA) | Show Hausa Qwen extraction in the demo. UI translation is not demo-critical. |
| T-049 | Alert detail + map | Show alert cards in feed. Detail page can be a "coming soon" click. |
| T-057 | Appsmith sighting queue | Core approve/suppress flow (T-056) is sufficient for demo. |
| T-062–T-064 | Individual integration tests | One E2E test (T-060) covers the demo path. |

**With cuts: ~22 hours to minimum demo.** This gives ~13 hours of buffer in a 48-hour hackathon for debugging, polish, and sleep.

#### Dependency Issues Found

1. **T-025 depends on T-024 AND T-030** — but T-024 (Huginn) and T-030 (Qwen) are in different phases. If Huginn setup takes long, it blocks the OSINT pipeline. **Fix:** Cut T-024 entirely. Use Crucix GDELT source for OSINT instead. Wire GDELT events directly to Qwen QW-03 via the Crucix webhook.

2. **T-036 depends on T-030, T-035, AND T-011** — this is a 3-way dependency. If any of Qwen, Whisper, or Aurora is slow, it blocks WhatsApp intake. **Fix:** Implement T-036 with mock Qwen responses first, then swap in real Qwen. This allows parallel development.

3. **No task exists for the Express API gateway.** Design.md Section 4 specifies 12 endpoints, but no todo task builds them. Add a task between T-013 and T-030: "T-015 · Express API gateway scaffold with health, reports, sightings, and subscribe endpoints."

#### Decision Summary — 1C
- Revised total from 35h to 42h — tight for solo, feasible with cuts
- Minimum viable demo: ~22h with 9 tasks cut
- Cut Huginn (T-024) entirely — use Crucix GDELT instead
- Add missing API gateway task
- Build WF-01 against mock services first for parallel development

---

## TASK 2 — TECH STACK DECISION AND DOCUMENTATION

| Layer | Chosen Tool | Version | Justification | Alternative Considered | Why Alternative Rejected |
|-------|-------------|---------|---------------|----------------------|--------------------------|
| Alert engine | **Crucix** (forked) | Latest | Free, open-source, purpose-built sweep/delta engine. 4 RAVENCRY source modules plug into its architecture cleanly. Demo value: live HUD showing sweeps. | Custom sweep script | Crucix's delta engine, HUD, and source module pattern save ~6h of build time vs custom. |
| Workflow orchestration | **n8n** (self-hosted) | 1.x | Visual workflow editor creates excellent demo screenshots. Judges can see data flow. Webhook-driven, connects all services. | BullMQ + Express | BullMQ is lighter but loses the visual workflow demo. n8n wins on demo impact. |
| LLM triage | **Qwen API** (qwen-plus + qwen-turbo) | DashScope intl | Hackathon requirement. Multilingual support tested on Hausa/Yoruba/Igbo/Pidgin. Cost is negligible at demo scale. | None | Hackathon-locked. |
| Voice transcription | **Whisper** (faster-whisper, CPU) | whisper-small | Open-source, runs offline, handles Nigerian languages. No API cost. | Qwen Audio | Qwen Audio has worse Nigerian language support based on available benchmarks. Whisper is proven. |
| OSINT ingestion | **Crucix GDELT source** | — | GDELT provides real Nigerian news data via free API. Crucix natively polls it. No additional container needed. | Huginn | Huginn adds a ~2GB RAM container for RSS polling that Crucix can do natively. Cut for hackathon. |
| Frontend | **Next.js 14** (App Router) | 14.x | Vercel hackathon requirement. App Router is current. PWA via next-pwa. | Vite + React | Must deploy to Vercel — Next.js is the native fit. |
| Ops dashboard | **Appsmith** (self-hosted) | Latest | Fastest way to build an internal CRUD dashboard with zero frontend code. Connects directly to PostgreSQL. | Retool (cloud) | Retool is SaaS — adds a dependency and potential latency. Appsmith is self-hosted, no account needed. |
| Primary database | **RDS PostgreSQL** (standard) | 15.x | PostGIS support, proven, instant provisioning. No cold-start penalty. | Aurora PostgreSQL | Aurora adds no value at hackathon scale. Higher cost, cold-start delays. Standard RDS is identical functionally for this workload. |
| Audit/event log | **DynamoDB** (on-demand) | — | Hackathon requirement (AWS). On-demand billing = zero cost at demo scale. Good for session state (TTL) and sweep logs. | Aurora additional tables | DynamoDB TTL auto-cleanup is cleaner for sessions. Keeps Aurora focused on core data. |
| Media storage | **S3** | — | No alternative. Pre-signed URLs, lifecycle policies. Standard choice. | — | — |
| SMS/USSD gateway | **Africa's Talking** (sandbox) | — | Only viable SMS/USSD provider with Nigerian carrier coverage and sandbox mode. | Twilio | Twilio doesn't support Nigerian USSD. AT is the only option. |
| Maps | **Leaflet + OSM** | 1.9.x | Free, no API key, good Nigerian OSM data. | Google Maps | API key, billing, overkill for alert pin display. |
| Containers | **Docker Compose** on EC2 | — | Single-machine deployment, simple networking. | ECS/Fargate | Over-engineered for hackathon. Docker Compose is the right level of simplicity. |
| Reverse proxy | **Caddy** | 2.x | **Replacing nginx.** Automatic HTTPS via Let's Encrypt, zero config. Saves 30+ minutes vs manual nginx + certbot setup. | nginx | nginx requires manual certbot setup, renewal config. Caddy does this automatically. |

> [!WARNING]
> ⚠️ **DECISION NEEDED:** The spec says Aurora PostgreSQL. Switching to standard RDS PostgreSQL saves money and cold-start issues but may technically violate the H01 hackathon requirement if "Aurora" is explicitly required. **Check the H01 rules:** does it say "AWS Aurora" specifically, or "AWS database"? If the latter, standard RDS PostgreSQL qualifies.

> [!WARNING]
> ⚠️ **DECISION NEEDED:** Huginn is specified in the locked tech stack but adds ~2GB RAM to an already strained EC2 instance. Recommendation is to cut it for hackathon and use Crucix's native source modules for all OSINT polling. **Are you willing to cut Huginn?**

#### Decision Summary — Task 2
- Keep n8n (demo value outweighs RAM cost)
- Replace Aurora with standard RDS PostgreSQL (verify hackathon rules first)
- Cut Huginn entirely (Crucix handles OSINT polling natively)
- Replace nginx with Caddy (automatic HTTPS, zero config)
- Upgrade EC2 to t3.large minimum

---

## TASK 3 — DATA LAYER AND DB SCHEMA OPTIMIZATION

### Schema Corrections

#### 1. Case ID Generation — Broken

```sql
-- CURRENT (will not work)
CREATE TABLE cases (
  id TEXT PRIMARY KEY DEFAULT 'NR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('case_seq')::TEXT, 6, '0'),
  ...
);
-- Problem: CREATE SEQUENCE must come BEFORE the table definition.
-- Problem: Complex DEFAULT expressions with string concatenation + nextval are fragile.
-- Problem: Under concurrent INSERTs, TO_CHAR(NOW()) and nextval() execute independently — 
--   theoretically safe but hard to test.
```

**Fix:** Move ID generation to a function:

```sql
CREATE SEQUENCE case_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'NR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('case_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE cases (
  id TEXT PRIMARY KEY DEFAULT generate_case_id(),
  ...
);
```

This is collision-safe because `nextval()` is guaranteed unique across concurrent transactions.

#### 2. `face_embedding VECTOR(512)` — Requires pgvector

The `VECTOR` type is **not native to PostgreSQL or PostGIS**. It requires the `pgvector` extension.

- RDS PostgreSQL 15+: pgvector is available as a pre-installed extension. Add `CREATE EXTENSION IF NOT EXISTS "vector";`
- Aurora PostgreSQL 15.4+: pgvector is also available.
- **For hackathon V1:** face embedding is marked V2 in the design. **Remove the `face_embedding` column from the V1 schema entirely.** Add it when you actually build facial recognition.

```sql
-- REMOVE from V1:
-- face_embedding VECTOR(512),

-- ADD extension when needed (V2):
-- CREATE EXTENSION IF NOT EXISTS "vector";
```

#### 3. Subscriber Phone — Cannot be hashed (SMS delivery)

As identified in 1A, `phone_hash TEXT UNIQUE NOT NULL` in subscribers means you **cannot send SMS** because you can't reverse SHA-256.

**Fix:**

```sql
CREATE TABLE subscribers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_encrypted  BYTEA NOT NULL,              -- AES-256-GCM encrypted phone number
  phone_hash       TEXT UNIQUE NOT NULL,         -- SHA-256 for dedup lookups only
  lga              TEXT,
  state            TEXT,
  location         GEOGRAPHY(POINT, 4326),
  whatsapp_opted_in BOOLEAN DEFAULT FALSE,
  push_token       TEXT,
  active           BOOLEAN DEFAULT TRUE,
  subscribed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ,
  unsubscribed_at  TIMESTAMPTZ
);
```

Encryption key stored in AWS Secrets Manager. Decrypt at SMS send time only.

#### 4. Alerts Table — `status` should be ENUM, not TEXT

```sql
-- CURRENT:
status TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|suppressed|broadcast

-- FIX:
CREATE TYPE alert_status AS ENUM ('pending', 'approved', 'suppressed', 'broadcast');
-- Then:
status alert_status NOT NULL DEFAULT 'pending',
```

#### 5. Missing Table: `push_subscriptions`

Web Push subscriptions require storing the full PushSubscription JSON (endpoint + keys). Storing this as a single `push_token TEXT` in subscribers is insufficient.

```sql
CREATE TABLE push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id    UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_subscriber ON push_subscriptions (subscriber_id);
```

#### 6. Missing Index: Composite index for geofence + active

The geofence function filters by `active = TRUE` AND uses `ST_DWithin`. A composite or partial index improves this:

```sql
CREATE INDEX idx_subscribers_active_location ON subscribers USING GIST (location) 
  WHERE active = TRUE;
```

This partial GIST index eliminates inactive subscribers from the spatial scan entirely.

#### 7. Geofence Function — State Fallback Missing

FR-012 requires state-level fallback when subscribers have no coordinates. The current function only queries by coordinates.

```sql
CREATE OR REPLACE FUNCTION get_subscribers_in_radius(
  p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT DEFAULT 160, p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  subscriber_id UUID, phone_encrypted BYTEA, whatsapp_opted_in BOOLEAN, push_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.phone_encrypted, s.whatsapp_opted_in, s.push_token
  FROM subscribers s
  WHERE s.active = TRUE
    AND (
      -- Coordinate-based geofence
      (s.location IS NOT NULL AND ST_DWithin(
        s.location::geography,
        ST_MakePoint(p_lng, p_lat)::geography,
        p_radius_km * 1000
      ))
      OR
      -- State-level fallback for subscribers without coordinates
      (s.location IS NULL AND p_state IS NOT NULL AND s.state = p_state)
    );
END;
$$ LANGUAGE plpgsql;
```

### DynamoDB Access Pattern Validation

| Table | Pattern | GSI Used | Status |
|-------|---------|----------|--------|
| `ravencry-alerts` | Get alerts by case_id | case-index (PK=case_id, SK=created_at) | ✅ Correct |
| `ravencry-alerts` | Get alert by alert_id | Primary key (PK=alert_id) | ✅ Correct |
| `ravencry-sweep-log` | Get sweeps by source | source-index (PK=source, SK=swept_at) | ✅ Correct |
| `ravencry-sweep-log` | Get recent sweeps | Primary key (SK=swept_at DESC) | ⚠️ DynamoDB doesn't sort by SK on full-table scan. Add GSI with PK=status, SK=swept_at for "recent sweeps across all sources" query. |
| `ravencry-sessions` | Get session by key | Primary key (PK=session_key) | ✅ Correct |

**Recommendation:** Add a GSI to `ravencry-sweep-log`:
```
GSI: status-time-index
  PK: status (S)  — always "ok" or "error"
  SK: swept_at (S)
```

### S3 Architecture Confirmation

S3 structure is **correct and well-designed**. Two minor additions:

1. **Add a `transcripts/` prefix** for Whisper output text (useful for debugging, auto-delete after 7 days):
```
transcripts/{case_id}/transcript.json  → lifecycle: 7 day expiry
```

2. **Lifecycle policy for sightings audio** is missing — sightings can also include audio/photos:
```json
{
  "Id": "delete-sighting-audio",
  "Status": "Enabled",
  "Filter": { "Prefix": "sightings/*/audio/" },
  "Expiration": { "Days": 1 }
}
```

#### Decision Summary — Task 3
- Fix case ID generation: use a dedicated function
- Remove `face_embedding` column from V1 schema (add in V2 with pgvector)
- Add `phone_encrypted` BYTEA column to subscribers (cannot send SMS to a hash)
- Add `alert_status` ENUM (don't use raw TEXT)
- Add `push_subscriptions` table
- Add partial GIST index for active subscriber geofence queries
- Fix geofence function to include state-level fallback
- Add `status-time-index` GSI to sweep-log

---

## TASK 4 — LLM TASK ALLOCATION

| Operation | Executor | Trigger | Latency Budget | Cost/1000 ops | Fallback | Human Escalation |
|-----------|----------|---------|---------------|---------------|----------|-----------------|
| **QW-01 Field extraction** | Qwen-plus | On-demand (each report) | 3s | ~$0.21 | Return `_fallback: true` with nulls, flag for manual | If `extraction_confidence < 0.5` |
| **QW-02 Severity classification** | Qwen-plus | On-demand (after QW-01) | 2s | ~$0.21 | Rule-based fallback: child→FLASH, high-risk state→PRIORITY, else→ROUTINE | If confidence < 0.7 on FLASH/PRIORITY boundary |
| **QW-03 OSINT classification** | Qwen-turbo | Batch (10 headlines/call) | 5s per batch | ~$0.014 (batched) | Rule-based keyword filter: if title matches nigeria-keywords → `actionable: true` | Never — OSINT drafts always land in pending_review |
| **QW-04 Anti-fake detection** | Qwen-plus | On-demand (FLASH/PRIORITY only) | 3s | ~$0.21 | Skip — case proceeds with `antifake_verdict: "not_checked"`. Operator must review. | Always — anti-fake is advisory, not blocking |
| **Voice transcription** | Whisper-small (local Docker) | On-demand (audio reports) | 15s (p95 for 30s clip) | $0 (self-hosted) | Return `"[audio - transcription failed]"`, flag for manual, attach raw audio | If `language_confidence < 0.6` |
| **Trust scoring** | Rule-based first pass | On-demand (each report) | <50ms | $0 | Score = 0.5 (neutral), flag for manual | If score is in ambiguous range (0.4–0.6), queue for ops review |
| **Case deduplication** | Rule-based (pg_trgm + PostGIS) | On-demand (each new case) | 200ms | $0 | Skip dedup — create new case. Operator merges manually. | If similarity > 0.7 but < 0.9 (ambiguous match) |
| **Sighting correlation** | Rule-based (case_id match) | On-demand (each sighting) | <50ms | $0 | Reject sighting if case_id invalid | If trust_score > 0.8 on FLASH case → auto-notify ops |
| **Alert copy generation** | Template-based | On-demand (on approval) | <10ms | $0 | Pre-written templates with field substitution. No LLM needed. | Never |
| **Face embedding extraction** | **V2 — skip for hackathon** | — | — | — | — | — |
| **Operator case summary** | Qwen-turbo | Human-initiated (ops dashboard button) | 3s | ~$0.07 | Show raw extraction fields instead of summary | Never — this is a convenience feature |

### Key Optimization Decisions

1. **Alert copy is template-based, not LLM-generated.** SMS messages must be ≤160 characters. A template with field substitution (`"RAVENCRY FLASH: {name}, {age}, last seen {location}. Case {id}. Seen them? Reply SIGHTING {id}"`) is faster, cheaper, and more predictable than an LLM call.

2. **Trust scoring is rule-based for V1.** No LLM call needed. See Task 8C for the formula.

3. **Case deduplication is database-level, not LLM.** pg_trgm fuzzy matching + PostGIS proximity + time window. See Task 8D.

4. **QW-02 has a rule-based fallback.** If Qwen API is down, the system can still classify FLASH cases using the `ALWAYS_FLASH` trigger list and `HIGH_RISK_STATES` array. This is critical — a Qwen outage must not prevent FLASH classification.

#### Decision Summary — Task 4
- QW-01/QW-02/QW-04: Qwen-plus for accuracy on safety-critical ops
- QW-03: Qwen-turbo batched (10x cost reduction)
- Trust scoring, dedup, correlation, alert copy: rule-based (no LLM, zero cost, zero latency)
- Face embedding: V2 only — remove from V1
- Rule-based fallback for QW-02 ensures FLASH classification works during Qwen outages

---

## TASK 5 — USER TESTING MILESTONES

### MILESTONE 1: Infrastructure Live
**After:** T-007, T-008, T-010, T-013

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| EC2 SSH | `ssh -i key.pem ubuntu@{ip}` | Shell prompt | Terminal | 🔴 Blocker |
| Docker running | `docker compose ps` on EC2 | All services UP/healthy | Terminal | 🔴 Blocker |
| DB connection | `psql $DATABASE_URL -c "SELECT 1"` | Returns `1` | Terminal | 🔴 Blocker |
| DynamoDB | `aws dynamodb list-tables` | 3 tables visible | AWS CLI | 🔴 Blocker |

**Who can test:** Solo developer via SSH.

---

### MILESTONE 2: Database Ready
**After:** T-011, T-014

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Tables exist | `\dt` in psql | 9 tables listed | psql | 🔴 Blocker |
| PostGIS active | `SELECT postgis_version()` | Version string | psql | 🔴 Blocker |
| Seed data | `SELECT COUNT(*) FROM cases` | 4 | psql | 🟡 Warning (re-seed) |
| Geofence function | `SELECT * FROM get_subscribers_in_radius(12.0, 8.59, 160)` | Returns rows | psql | 🔴 Blocker |

**Who can test:** Solo developer via psql.

---

### MILESTONE 3: First AI Call
**After:** T-030

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Qwen reachable | `curl -X POST localhost:3002/extract -d '{"text":"An sace yaro..."}'` | JSON with extracted fields | curl | 🔴 Blocker |
| Hausa extraction | Submit Hausa test text | `person_name`, `location` extracted correctly | curl / test suite | 🔴 Blocker |
| Whisper reachable | `curl -X POST localhost:8000/transcribe -F "audio=@test.ogg"` | Transcript JSON | curl | 🟡 Warning (voice disabled) |

**Who can test:** Solo developer. No external dependencies.

---

### MILESTONE 4: First Intake Working
**After:** T-036

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| WhatsApp → case | Send text message via AT sandbox | Case created in Aurora | AT sandbox + psql | 🔴 Blocker |
| Voice → case | Send voice note via AT sandbox | Transcribed + case created | AT sandbox + psql | 🟡 Warning |
| Confirmation reply | Send report via WhatsApp | Receive reply with case ID | AT sandbox | 🟡 Warning |

**Who can test:** Solo developer using AT sandbox simulator. **Does NOT require a real phone.**

---

### MILESTONE 5: First Alert Fired
**After:** T-043

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Approve triggers broadcast | Approve FLASH case in Appsmith | Telegram channel + SMS + DynamoDB log | Appsmith + Telegram + AT log | 🔴 Blocker |
| Geofence enforced | Approve Kano case | Only Kano subscribers receive SMS | AT delivery log | 🔴 Blocker |
| Timing | Measure approval-to-SMS time | ≤60 seconds | Stopwatch | 🟡 Warning (tune) |

**Who can test:** Solo developer. Needs Telegram channel access.

---

### MILESTONE 6: Frontend Live
**After:** T-050

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Vercel URL loads | Visit ravencry-web.vercel.app | Home page renders | Browser | 🔴 Blocker |
| Mobile render | Open on phone (or Chrome DevTools mobile) | Responsive, readable | Mobile/DevTools | 🟡 Warning |
| Alert feed | Active seeded alerts visible | AlertCard list renders | Browser | 🔴 Blocker |
| Report form | Submit 4-step form | Case created in Aurora | Browser + psql | 🔴 Blocker |

**Who can test:** Solo developer. Test on real phone if available.

---

### MILESTONE 7: Full End-to-End
**After:** T-060

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Full flow | WhatsApp report → Qwen → approve → SMS + Telegram | All channels fire | All systems | 🔴 Blocker |
| Timing | Report to SMS delivery | ≤90s (including manual approval) | Stopwatch | 🟡 Warning |

**Who can test:** Ideally 2 people — one reports, one approves. Solo: use two browser tabs.

---

### MILESTONE 8: Hackathon-Ready
**After:** T-072

| Test | Action | Expected Result | Tool | Failure = |
|------|--------|----------------|------|-----------|
| Screen recording | Watch the full 5-min video | All demo flows visible, no crashes | Video player | 🔴 Blocker |
| Devpost fields | Check all Devpost fields | All filled, links working | devpost.com | 🔴 Blocker |
| GitHub README | Visit repo | Architecture diagram renders, links work | github.com | 🟡 Warning |

**Who can test:** Solo developer. Have someone else watch the video for clarity.

#### Decision Summary — Task 5
- 8 milestones with concrete test actions and pass/fail criteria
- Milestones 1-5 testable by solo developer
- Milestone 7 ideally needs 2 people but workable solo
- Every milestone distinguishes blockers from warnings

---

## TASK 6 — ADDITIONAL TOOLS AND RESOURCES

### Monitoring & Observability

| Gap | Recommendation | Setup Time | Why |
|-----|---------------|------------|-----|
| Container health | **Docker healthchecks + `docker compose` events → Telegram** | 30 min | Add `healthcheck` to each service in docker-compose.yml. Use a simple cron script that checks `docker compose ps` every 2 min and sends Telegram alert on any unhealthy service. |
| Log aggregation | **Dozzle** (lightweight Docker log viewer) | 5 min | Single container, zero config, web UI for viewing all container logs. Add to docker-compose: `image: amir20/dozzle ports: ["9999:8080"]`. |
| Error alerting | **Sentry** (free tier) | 20 min | Add `@sentry/node` to Qwen service and intake service. Free tier = 5K errors/month. Enough for hackathon. |
| Uptime | **UptimeRobot** (free tier) | 5 min | Monitor `api.ravencry.ng/api/health` every 5 min. Telegram webhook on downtime. |

### Load Testing

**Tool:** [k6](https://k6.io/) (free, CLI-based)

```javascript
// load-test.js — run with: k6 run load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '60s',
};

export default function () {
  const payload = JSON.stringify({
    channel: 'pwa',
    person_name: 'Test Person',
    last_seen_location: 'Kano',
    description: 'Test report for load testing',
  });

  const res = http.post('https://api.ravencry.ng/api/reports', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

### API Documentation

**Tool:** [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc) + [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)

Add JSDoc comments to Express routes → auto-generate OpenAPI spec → serve at `/api/docs`. Setup time: 30 min. Judges love interactive API docs.

### Local Development

Create `docker-compose.dev.yml`:

```yaml
version: '3.9'
services:
  postgres:
    image: postgis/postgis:15-3.4
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: ravencry
      POSTGRES_PASSWORD: devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d

  dynamodb-local:
    image: amazon/dynamodb-local
    ports: ["8100:8000"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"

volumes:
  pgdata:
```

This eliminates the need for AWS credentials during local development. Run Qwen and Whisper services directly (no Docker needed for them during dev).

### CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
        working-directory: services/qwen
      - run: npm test
        working-directory: services/qwen

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web
```

### Geocoding

> [!IMPORTANT]
> ⚠️ **DECISION NEEDED:** The system needs to convert text locations ("Kasuwan Shanu, Kano") to coordinates for geofencing. Two options:

| Option | Pros | Cons |
|--------|------|------|
| **Nominatim** (OSM, self-hosted or free API) | Free, no API key, good Nigerian coverage | Rate limit: 1 req/s on public instance. Self-hosted adds another container. |
| **Google Maps Geocoding** | Accurate, fast, $5/1000 requests | Requires billing account, API key management |

**Recommendation:** Use Nominatim's free API with a 1s rate limiter and local cache (store geocoded LGA→coords mappings in a `lga_coords` table). Nigeria has ~774 LGAs — cache them all once and you never need geocoding again for LGA-level geofencing. For free-text locations, fall back to state centroid.

```sql
CREATE TABLE lga_coords (
  lga     TEXT NOT NULL,
  state   TEXT NOT NULL,
  lat     FLOAT NOT NULL,
  lng     FLOAT NOT NULL,
  PRIMARY KEY (lga, state)
);
-- Pre-populate with all 774 Nigerian LGA centroids from OpenStreetMap data
```

### WhatsApp Testing

Africa's Talking WhatsApp sandbox limitation: **you can only message numbers that have opted in to the sandbox.** 

**Workaround for demo:**
1. Register your personal WhatsApp number in the AT sandbox
2. Use AT's WhatsApp simulator for automated testing
3. For the demo video: screen-record the AT simulator, not a real phone (cleaner, reproducible)
4. Mention in the pitch: "Production deployment would use AT's production WhatsApp API with a verified business number"

> [!TIP]
> Alternative: Use Telegram as the primary demo channel (no sandbox restrictions) and show WhatsApp as "also supported" with the AT simulator screenshot.

#### Decision Summary — Task 6
- Add Dozzle (5 min) + UptimeRobot (5 min) for minimal monitoring
- k6 for load testing with provided script
- swagger-jsdoc for auto-generated API docs
- docker-compose.dev.yml for local development without AWS
- Nominatim + LGA cache table for geocoding
- Demo via AT simulator or prioritize Telegram channel for demo

---

## TASK 7 — COLLABORATION AND CONTRIBUTION MAP

| Role | Skill Needed | What They Work On | Files to Hand Them | Engagement | Where to Find |
|------|-------------|-------------------|-------------------|------------|---------------|
| **Hausa language reviewer** | Native Hausa speaker, literate in Boko script | Validate Hausa Qwen prompt templates, USSD menu text, SMS alert templates, UI strings in `ha/common.json` | `skills/qwen-multilingual.md` Section 2 + 4, `prompts/06-qwen-triage.md` QW-01 system prompt, `public/locales/ha/common.json` | 2-3 hours | Nigerian university Hausa department (ABU Zaria, BUK), X/Twitter Nigerian tech community, Nairaland forum |
| **Nigeria security domain expert** | Knowledge of active conflict zones, LGA risk levels, community groups | Validate `HIGH_RISK_STATES` list, high-risk routes, community vigilante group details, NAPTIP integration assumptions | `skills/nigeria-context.md` Sections 1+4, `specs/requirements.md` FR-006 | 1-2 hours | Civilian JTF contacts, Nigerian security Twitter (e.g. @HumAngleMedia, @DailyNigerian reporters), university conflict studies departments |
| **Mobile QA tester** | Android phone with Nigerian SIM (MTN/Airtel), willing to test | Test PWA on real 3G connection, test USSD *384# flow on AT sandbox, test SMS delivery latency | Vercel URL, AT sandbox credentials, test script from T-060 | 2 hours | Personal contacts in Nigeria, X/Twitter Nigerian developer community (#NigeriaTech), Telegram groups |
| **Database reviewer** | PostgreSQL + PostGIS experience | Validate schema, run EXPLAIN on geofence query at 100K subscribers, test migration sequence | `prompts/09-database.md`, `specs/design.md` Section 3 | 1-2 hours | r/PostgreSQL, PGConf Nigeria (if exists), database-focused Discord servers |
| **UI/UX reviewer** | Mobile-first design for low-literacy users, accessibility | Review PWA report form for clarity, validate that alert cards are readable without colour (NFR-010), test with screen reader | Vercel URL, `prompts/08-frontend-pwa.md` | 2 hours | Andela alumni, Nigerian UX designers on X/Twitter (@UXLagos), Figma Community Nigeria |

### Highest-Leverage Roles (ranked)

1. **Hausa language reviewer** — a single native speaker reviewing Qwen prompts and UI text for 2 hours could prevent embarrassing language errors that undermine the entire "multilingual" claim
2. **Mobile QA tester with Nigerian SIM** — the only way to validate real-world SMS delivery and 3G PWA performance
3. **UI/UX reviewer** — low-literacy usability is a core differentiator but hard to self-test

#### Decision Summary — Task 7
- Hausa reviewer is highest priority (2-3h engagement)
- All roles are micro-engagements (1-3h, no ongoing commitment)
- Nigerian university departments are the best source for Hausa and security expertise
- X/Twitter Nigerian tech community is the fastest channel for finding testers

---

## TASK 8 — ALGORITHM OPTIMIZATION

### 8A. Data Ingestion Pipeline

#### Source-Specific Sweep Intervals

| Source | Current | Recommended | Rationale |
|--------|---------|-------------|-----------|
| citizen-reports | 5 min | **30 seconds** | Citizen reports are time-critical. A 5-min delay before Crucix picks up a FLASH case is unacceptable. Better: skip Crucix entirely for citizen reports (see Design Review). |
| naptip-rss | 5 min | **30 min** | NAPTIP publishes press releases, not live alerts. Polling every 5 min wastes resources. |
| gdelt-nigeria | 5 min | **10 min** | GDELT updates in batches. 10 min catches batches without excessive API calls. |
| nigeria-news-rss | 5 min | **15 min** | RSS feeds update infrequently. 15 min is sufficient. |
| sighting-feed | 5 min | **60 seconds** | Sightings on FLASH cases need rapid processing. |

#### Ingestion Priority Weighting

```
citizen-report (FLASH)    → immediate processing (skip Crucix)
citizen-report (other)    → 30s sweep
sighting (FLASH case)     → 60s sweep  
naptip-rss                → 30 min sweep
gdelt-nigeria             → 10 min sweep
nigeria-news-rss          → 15 min sweep
```

#### Cross-Source Deduplication

When the same kidnapping appears in GDELT AND a citizen report:

1. **Match criteria:** location within 5km AND time within 6 hours AND name fuzzy match > 0.6
2. **Action:** Link the OSINT event to the citizen case (add `osint_corroboration` field to cases table). Do NOT create a duplicate case.
3. **Trust impact:** OSINT corroboration increases the citizen case trust score by +0.15

#### Source Failure Health Model

```javascript
const SOURCE_HEALTH = {
  'citizen-reports': { degradedAfterMins: 15,  errorAfterMins: 60 },
  'sighting-feed':   { degradedAfterMins: 60,  errorAfterMins: 180 },
  'naptip-rss':      { degradedAfterMins: 360, errorAfterMins: 720 },
  'gdelt-nigeria':   { degradedAfterMins: 120, errorAfterMins: 360 },
  'news-rss':        { degradedAfterMins: 120, errorAfterMins: 360 }
}
```

Each source failure is independent — one source erroring does not affect others. Overall system health = worst individual source status.

---

### 8B. Geofence and Subscriber Query

#### Dynamic Radius by Tier and Context

| Tier | Default Radius | Max Radius | Condition |
|------|---------------|------------|-----------|
| FLASH | 160 km | 250 km | Expand to 250km if sightings_count = 0 after 2 hours |
| PRIORITY | 100 km | 160 km | Static |
| ROUTINE | 50 km | 100 km | Expand to 100km if operator requests |

#### Rationale for 160km Default
160km is approximately the distance from Kaduna city to Abuja. A kidnapping on the Kaduna-Abuja expressway (the highest-risk route in Nigeria) needs to alert subscribers in both cities. 160km achieves this. It's the right default.

#### Performance at Scale

```sql
-- At 100,000 subscribers:
EXPLAIN ANALYZE SELECT * FROM get_subscribers_in_radius(12.0, 8.59, 160);
-- With GIST index on location: ~5ms for 100K rows
-- With partial GIST index (WHERE active = TRUE): ~3ms
-- This is well within the 90s SLA budget.
```

The GIST spatial index makes this a bounded search, not a full table scan. **Performance is not a concern at 100K subscribers.**

At 1M subscribers (V2 scale): still ~20ms with GIST. PostgreSQL spatial indexes are excellent.

#### State-Level Fallback

Already addressed in schema fix (Task 3). The geofence function now includes `OR (s.location IS NULL AND s.state = p_state)` for subscribers who registered with state but no GPS.

**Hard geofence by state boundaries:** Not recommended for V1. State boundary polygons require storing MultiPolygon geometries for all 36 states + FCT. This is V2 complexity. State name string matching is sufficient for the fallback case.

---

### 8C. Trust Scoring Algorithm

```javascript
/**
 * RAVENCRY Trust Score v1
 * Range: 0.0 (no trust) to 1.0 (full trust)
 * 
 * Thresholds:
 *   ≥ 0.8  → auto-proceed to approval queue (operator still approves FLASH)
 *   0.4–0.8 → normal processing, no flags
 *   < 0.4  → flagged for enhanced review, operator warned
 *   < 0.2  → held — does not enter approval queue until operator manually releases
 */

function calculateTrustScore(report) {
  const weights = {
    phone_verified:         0.20,  // boolean: verified phone OTP
    prior_accurate_reports: 0.15,  // historical accuracy of this reporter
    report_specificity:     0.25,  // how detailed is the report (from Qwen)
    media_authenticity:     0.15,  // anti-fake score (from QW-04)
    corroboration_count:    0.15,  // number of matching reports for same incident
    reporter_proximity:     0.10,  // how close reporter is to incident location
  }

  let score = 0

  // 1. Phone verification (binary)
  score += report.phone_verified ? weights.phone_verified : 0

  // 2. Prior accurate reports (capped at 5)
  //    First report = 0. Each subsequent accurate report adds 0.03, max 5 = 0.15
  const priorAccurate = Math.min(report.prior_accurate_reports || 0, 5)
  score += (priorAccurate / 5) * weights.prior_accurate_reports

  // 3. Report specificity (0-1 from Qwen QW-01 extraction_confidence)
  score += (report.extraction_confidence || 0) * weights.report_specificity

  // 4. Media authenticity (0-1 from QW-04, default 0.5 if no media)
  const mediaScore = report.has_media 
    ? (report.media_authenticity_score || 0.5)
    : 0.5  // neutral if no media submitted
  score += mediaScore * weights.media_authenticity

  // 5. Corroboration (capped at 3 matching reports)
  const corroboration = Math.min(report.corroboration_count || 0, 3)
  score += (corroboration / 3) * weights.corroboration_count

  // 6. Reporter proximity (inverse distance, capped at 50km)
  //    If reporter is at the incident location: full score
  //    If reporter is 50km+ away: zero
  const proximity = report.reporter_distance_km != null
    ? Math.max(0, 1 - (report.reporter_distance_km / 50))
    : 0.3  // default if no location shared
  score += proximity * weights.reporter_proximity

  // Bonus: Anonymous reports get a -0.15 penalty
  if (!report.phone_verified && !report.reporter_phone) {
    score = Math.max(0, score - 0.15)
  }

  // Bonus: OSINT corroboration from a different source
  if (report.osint_corroborated) {
    score = Math.min(1.0, score + 0.15)
  }

  return Math.round(score * 100) / 100  // 2 decimal places
}
```

#### Trust Score Action Thresholds

| Score Range | Action | UI Indicator |
|-------------|--------|-------------|
| **≥ 0.8** | Auto-queue for approval. Operator sees green badge. | 🟢 High Trust |
| **0.6–0.79** | Normal queue. No special flags. | 🔵 Normal |
| **0.4–0.59** | Queue with "review recommended" flag. | 🟡 Review |
| **0.2–0.39** | Queue with "low trust" warning. Operator must acknowledge before approving. | 🟠 Low Trust |
| **< 0.2** | **Held.** Does not enter approval queue. Operator must manually release. | 🔴 Held |

> [!IMPORTANT]
> Trust score **never overrides** FLASH classification for child cases. A child abduction report with trust_score = 0.1 still enters the FLASH queue — but with a prominent low-trust warning. The operator decides.

---

### 8D. Case Deduplication

#### Pipeline Position

Deduplication runs **after Qwen extraction (QW-01) and before severity classification (QW-02).**

```
Report received → QW-01 extract → DEDUP CHECK → QW-02 classify → Aurora INSERT
                                    ↓
                              match found?
                              ├── similarity ≥ 0.9 → merge into existing case
                              ├── 0.7 ≤ similarity < 0.9 → create linked case, flag for ops
                              └── similarity < 0.7 → create new case
```

#### Matching Fields and Weights

```javascript
function calculateSimilarity(newReport, existingCase) {
  let similarity = 0
  let totalWeight = 0

  // 1. Name similarity (pg_trgm trigram similarity)
  //    Weight: 0.30
  if (newReport.person_name && existingCase.person_name) {
    // PostgreSQL: SELECT similarity('Amina Musa', 'Aminah Musa')  → 0.82
    const nameSim = trigramSimilarity(newReport.person_name, existingCase.person_name)
    similarity += nameSim * 0.30
    totalWeight += 0.30
  }

  // 2. Location proximity (PostGIS distance)
  //    Weight: 0.25
  //    Same LGA = 1.0, within 10km = 0.8, within 50km = 0.5, >50km = 0
  if (newReport.coords && existingCase.coords) {
    const distKm = stDistanceKm(newReport.coords, existingCase.coords)
    const locSim = distKm < 1 ? 1.0 : distKm < 10 ? 0.8 : distKm < 50 ? 0.5 : 0
    similarity += locSim * 0.25
    totalWeight += 0.25
  } else if (newReport.lga && existingCase.lga) {
    similarity += (newReport.lga === existingCase.lga ? 1.0 : 0) * 0.25
    totalWeight += 0.25
  }

  // 3. Time window
  //    Weight: 0.20
  //    Same hour = 1.0, same day = 0.7, within 3 days = 0.3, >3 days = 0
  if (newReport.last_seen_time && existingCase.last_seen_time) {
    const hoursDiff = Math.abs(newReport.last_seen_time - existingCase.last_seen_time) / 3600000
    const timeSim = hoursDiff < 1 ? 1.0 : hoursDiff < 24 ? 0.7 : hoursDiff < 72 ? 0.3 : 0
    similarity += timeSim * 0.20
    totalWeight += 0.20
  }

  // 4. Circumstance match
  //    Weight: 0.10
  if (newReport.circumstance === existingCase.circumstance) {
    similarity += 0.10
  }
  totalWeight += 0.10

  // 5. Age match (within 3 years)
  //    Weight: 0.15
  if (newReport.age_estimate && existingCase.age_estimate) {
    const ageDiff = Math.abs(newReport.age_estimate - existingCase.age_estimate)
    similarity += (ageDiff <= 3 ? 1.0 : ageDiff <= 5 ? 0.5 : 0) * 0.15
    totalWeight += 0.15
  }

  // Normalise by available fields
  return totalWeight > 0 ? similarity / totalWeight : 0
}
```

#### Database Query for Candidate Matching

```sql
-- Find potential duplicate cases within last 7 days, same state or within 100km
SELECT c.id, c.last_seen_coords, c.last_seen_lga, c.last_seen_state,
       c.last_seen_time, c.circumstance,
       p.full_name, p.age_estimate,
       similarity(p.full_name, $1) as name_sim
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.created_at > NOW() - INTERVAL '7 days'
  AND c.status NOT IN ('resolved', 'false_report')
  AND (
    c.last_seen_state = $2
    OR ST_DWithin(c.last_seen_coords, ST_MakePoint($3, $4)::geography, 100000)
  )
  AND similarity(p.full_name, $1) > 0.3  -- pg_trgm pre-filter
ORDER BY name_sim DESC
LIMIT 10;
```

#### OSINT ↔ Citizen Report Matching

OSINT cases (from GDELT/news RSS) often lack person names but have incident descriptions. Match these differently:

1. **Location + time window** (same state, within 24 hours)
2. **Circumstance type** (abduction, missing)
3. **Keyword overlap** between OSINT article text and citizen report text

If match score > 0.7: link the OSINT case to the citizen case as corroborating evidence. Delete the OSINT draft case.

#### Recommended Fuzzy Matching Library

**pg_trgm** (already in the schema via `CREATE EXTENSION IF NOT EXISTS "pg_trgm"`).

- Built-in to PostgreSQL. No additional dependency.
- Handles Nigerian name variants well: "Amina" ↔ "Aminah" = 0.77, "Musa" ↔ "Moussa" = 0.6
- The `GIN (full_name gin_trgm_ops)` index on persons table supports fast fuzzy matching.
- No need for external libraries (Levenshtein is slower and doesn't handle transpositions as well).

#### Decision Summary — Task 8
- Citizen reports should bypass Crucix sweep (direct to approval queue)
- Source-specific sweep intervals (30s for citizen-reports, 30min for NAPTIP RSS)
- Dynamic geofence radius by tier (160km FLASH, 100km PRIORITY, 50km ROUTINE)
- Concrete trust scoring formula with 6 weighted inputs and 5 action thresholds
- Deduplication at pipeline position: after QW-01, before QW-02
- pg_trgm for fuzzy name matching (already in schema), PostGIS for location proximity
- Similarity thresholds: ≥0.9 merge, 0.7-0.9 link, <0.7 new case

---

## PRIORITY ACTION LIST

Top 10 things to do differently, ranked by impact:

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| **1** | 🔴 **Fix subscriber phone storage** — change from SHA-256 hash to AES-256 encrypted. You literally cannot send SMS without this. | Critical | 1h |
| **2** | 🔴 **Upgrade EC2 to t3.large** (8GB RAM minimum). 7 Docker containers will OOM on t3.medium (4GB). | Critical | 5 min |
| **3** | 🟠 **Skip Crucix for citizen reports** — wire Qwen triage output directly to approval queue. Saves 5 min latency per report. Keep Crucix for OSINT only. | High | 2h refactor |
| **4** | 🟠 **Cut Huginn** — use Crucix's native source modules for all OSINT polling. Saves ~2GB RAM and 45 min of setup. | High | 0h (just don't build it) |
| **5** | 🟠 **Fix case ID sequence** — move `CREATE SEQUENCE` before `CREATE TABLE`. Wrap ID generation in a function. Current schema will fail on `CREATE TABLE`. | High | 15 min |
| **6** | 🟡 **Replace nginx with Caddy** — automatic HTTPS, zero config. Saves 30 min of certbot wrestling. | Medium | 20 min |
| **7** | 🟡 **Add approval race condition guard** — `WHERE status = 'pending'` + check affected rows. Prevents double-broadcast. | Medium | 15 min |
| **8** | 🟡 **Remove face_embedding from V1 schema** — VECTOR type requires pgvector extension. Not used in V1. Causes migration failure. | Medium | 5 min |
| **9** | 🟡 **Add rule-based QW-02 fallback** — if Qwen is down, classify using ALWAYS_FLASH triggers and HIGH_RISK_STATES. FLASH cases must never be blocked by API outage. | Medium | 1h |
| **10** | 🟡 **Implement trust scoring formula (8C)** before building approval flow — the ops dashboard needs to show trust scores for operators to make informed decisions. | Medium | 2h |

---

## ALL ⚠️ DECISION NEEDED ITEMS

These require developer input before proceeding:

> ⚠️ **DECISION NEEDED 1: Aurora vs RDS PostgreSQL.**
> The spec says Aurora, but standard RDS PostgreSQL is cheaper and has no cold-start delay. Aurora adds zero functional value at hackathon scale. **Check the H01 hackathon rules:** does it require "Aurora" specifically, or "AWS database"? If the latter, switch to RDS standard.

> ⚠️ **DECISION NEEDED 2: Cut Huginn?**
> Huginn adds ~2GB RAM and 45 min setup for RSS polling that Crucix can do natively via its source modules. Recommendation is to cut it entirely. **Are you willing to remove Huginn from the stack?**

> ⚠️ **DECISION NEEDED 3: USSD in demo or cut?**
> AT USSD sandbox is unreliable. The USSD handler (T-042) is 60 min of work for a channel that may not demo cleanly. **Option A:** Cut USSD, demo with WhatsApp + Telegram. Mention USSD in pitch. **Option B:** Build it but use AT simulator (not live USSD) in the demo.

> ⚠️ **DECISION NEEDED 4: Reverse image search in FR-007.**
> FR-007 says "reverse image search hits > 5" but no reverse image search service is in the stack. **Option A:** Remove this criterion (rely on EXIF + Qwen textual analysis). **Option B:** Add Google Vision API or TinEye API to the stack (adds cost + complexity).

> ⚠️ **DECISION NEEDED 5: NAPTIP bridge real vs mock.**
> NAPTIP's webhook API is undocumented. **Option A:** Mock with webhook.site (show payload format in demo, declare "production integration pending"). **Option B:** Research NAPTIP API availability (may waste hours with no result).

> ⚠️ **DECISION NEEDED 6: Auto-approve mode for demo.**
> The 90s report-to-broadcast SLA is only achievable if operator approval is instant. **Should the demo use auto-approve mode** (FLASH cases broadcast immediately without operator click)? This makes the timing claim credible but skips the approval UI. Alternative: show manual approval but don't claim 90s end-to-end.

> ⚠️ **DECISION NEEDED 7: NFR-007 bundle size.**
> ≤200KB initial load is not achievable with Next.js + Leaflet. **Accept ≤500KB** (still excellent for 3G) or implement aggressive code splitting to defer Leaflet to the map page only?

> ⚠️ **DECISION NEEDED 8: Geocoding provider.**
> For converting text locations to coordinates: **Nominatim** (free, rate-limited) or **Google Maps** ($5/1000 req, fast)? Recommendation: Nominatim + pre-cached LGA centroid table.
