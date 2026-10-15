# RAVENCRY — Testing Context Log
> **Purpose:** Running log of key decisions, discoveries, and "why we did what we did" during implementation.
> **NOT:** A copy of design docs. This captures the rationale behind choices made at build time.
> **Started:** 2026-07-04 · **Last updated:** 2026-07-07

---

## T-061 · WhatsApp Voice Note → Hausa ✅ (2026-07-07 — text path verified; Whisper deferred)

Test guide: `integration/test-061.md`. Two paths: curl simulation and real WhatsApp.

**Verified:** Hausa text → n8n WF-01 → Qwen extract + classify → Aurora (`language='ha'`) → Meta reply. Case `NR-2026-000009` produced correctly. All nodes green. Whisper audio path deferred — `small` model can't handle Hausa reliably.

---

### T-006B confirmed DONE (2026-07-07)

WhatsApp message sent via Graph API v25.0 — HTTP 200, `wamid` returned. `META_WHATSAPP_TOKEN` + `META_PHONE_NUMBER_ID` in `.env`. WhatsApp handler (port 3004) ready.

---

### Decision: curl simulation as primary test path (despite Meta being ready)

**Why:** POSTing directly to n8n WF-01 isolates the Whisper → Qwen → Aurora pipeline from Meta webhook latency. The WhatsApp handler is a thin adapter — same code path either way.

---

### Decision: text path as primary verification (audio needs Meta Media download)

**Why:** n8n WF-01 Node 2c sends `{ audio_id }` to Whisper, but Whisper `/transcribe` expects `multipart/form-data` with raw audio bytes. In production, WF-01 needs a node to download audio from Meta's Media API (`GET /v21.0/{media_id}`) before forwarding bytes to Whisper. The curl text path (Step 1c) validates the core Hausa → Qwen → Aurora path without this gap.

**Lesson:** Real E2E audio requires a Meta Media download node in WF-01. Documented in `test-061.md` Step 1b.

---

### Discovery: `language_detected` mapping — Qwen returns human-readable, DB expects ISO codes

**What happened:** Qwen QW-01 returns `language_detected: "hausa"`. DB `cases.language` expects ISO 639-1 (`'ha'`). n8n Node 5 maps `"hausa"→"ha"`, `"english"→"en"`, etc. If Qwen returns an unexpected variant (e.g. `"Hausa"` capitalized), the INSERT fails with enum violation. Fallback is `"en"`.

**Key verification:** `SELECT language FROM cases WHERE input_channel = 'whatsapp'` must return `'ha'`.

---

### Discovery: n8n Webhook Trigger nests POST body under `$json.body` (2026-07-07)

**What happened:** Curl to n8n WF-01 webhook — Node 2 IF checked `$json.message_type` → `undefined` → always routed to False branch. The audio payload never reached the Whisper node.

**Why:** n8n's Webhook Trigger wraps the incoming POST body under `$json.body`, with headers/metadata at the top level. The correct reference is `$json.body.message_type`, `$json.body.text`, `$json.body.audio_id`, etc.

**Fix (steps5.md):** All webhook field references updated from `$json.<field>` → `$json.body.<field>`. Also `$('Webhook Trigger').item.json.phone` → `$('Webhook Trigger').item.json.body.phone`. Added a note under Node 3 about the `.body` prefix.

**Lesson:** Always inspect n8n webhook output in Executions → first node — the `body` nesting is not obvious from the curl command.

---

### Discovery: n8n credential fields do NOT evaluate `$env` expressions (2026-07-07) ~~INCORRECT~~

**What actually happened:** Node 8 returned HTTP 401 — the Meta WhatsApp System User token had **expired**, not that `$env` wasn't evaluated. After regenerating the token, `Bearer {{ $env.META_WHATSAPP_TOKEN }}` in credentials works fine.

---

### Whisper deferred (2026-07-07)

`small` model can't handle Hausa — Shona detection, Bengali/Burmese garbage. 16kHz mono, VAD off, forced `language=ha` didn't help. `int8` gave hallucinated English; `auto` gave Unicode. Deferred to post-hackathon. Text path validates `language='ha'` via Qwen — that's the T-061 deliverable.

## SSH: Remote EC2 Access

After adding `api.ravencry.cv` to `~/.ssh/config`, any of these work:

```
ssh ravencry
ssh api.ravencry.cv
ssh ubuntu@api.ravencry.cv
```

The `ravencry` alias is defined in `~/.ssh/config` with the hostname, user, and key file — so it's the shortest form. All three resolve to the same EC2 instance.

---

## T-060 · End-to-End: USSD → FLASH → SMS

### Decision: Steps 1-3 local; Steps 4-6 EC2-only (Docker DNS `n8n`)

**Why:** The approve endpoint fires `POST http://n8n:5678/webhook/flash-broadcast`. The hostname `n8n` is a Docker Compose service name — it only resolves inside the Compose network on EC2. From a local `npx tsx` process, `n8n` → `fetch failed`.

**⚠️ Database split:** Steps 1-3 ran against local Postgres. Steps 4-6 run against Aurora on EC2. n8n WF-02 reads `cases` + `alerts` from Aurora, so the rows created locally do NOT exist on EC2. You must re-create the case + alert rows on Aurora before approving. Added a "Pre-flight" section in Step 4 of `test-060.md` with the full curl + psql commands.

**🔧 n8n env vars:** The WF-02 nodes use `{{ $env.TELEGRAM_SERVICE_URL }}`, `{{ $env.SMS_SERVICE_URL }}`, etc. These were NOT passed to the n8n container in `docker-compose.yml`. Added them under `environment:` as Docker service names (`telegram:3005`, `sms:3006`, `naptip:3008`, `api:3003`).

**🔧 NAPTIP null coalescing:** USSD reports via curl have no GPS, no `last_seen_time`, many NULL fields. n8n's `{{ $json.last_seen_lat }}` outputs nothing for NULL → `"lat": ,` is invalid JSON. Fixed in `steps8.md` with `??` on every nullable field (`{{ $json.last_seen_lat ?? 0 }}`).

**Split:**

| Steps | Where | Why |
|---|---|---|
| 1-3 (USSD → Qwen → DB) | Local or EC2 | Independent REST APIs, only need Postgres |
| 4-6 (approve → n8n → broadcast) | EC2 only | Docker DNS (`n8n`, `sms`, `telegram`) required |

**What changed in `test-060.md`:** Step 4 now says "EC2 ONLY" with SSH + `docker compose` commands. Steps 5-6 consolidated into a single EC2 "Verify Broadcast Delivery" section. Old local verification path removed — it was misleading.

---

### Decision: Manual Qwen trigger in test (no n8n WF-01 auto-triage)

**Why:** The USSD service creates cases as `pending_triage` but does NOT automatically call Qwen for extraction + classification. In production, n8n WF-01 would poll `pending_triage` cases and trigger the LLM service. For the integration test, we trigger Qwen manually via curl — this keeps the test self-contained and avoids depending on WF-01 being built.

**What we do instead:** Step 3 in the test guide manually hits `POST /extract` and `POST /classify` on `localhost:3002`, then writes results back to Aurora via `psql`.

---

### Discovery: /classify endpoint expects `person` + `location`, not `report_text` + `extracted`

**What happened:** The test guide originally mirrored what seemed logical from the extraction response — pass `{ report_text, extracted: { person_name, age_estimate, ... } }`. But the actual `services/llm/src/index.ts` destructures `const { person, location } = req.body` and rejects with `missing_required_fields` if either is absent.

**Fix:** Changed the classify curl to:

```powershell
curl -d '{"person":{"name":"Fatima","age_estimate":9,...},"location":{"last_seen_lga":"Zamfara Central",...}}'
```

**Lesson:** Always read the actual endpoint source code — don't guess the request shape from what "makes sense."

---

### Decision: PowerShell here-string `@"..."@` for SQL with embedded JSON

**Why:** The original approach used `"..."` with `\"` escaping for the JSON string literal inside the SQL `UPDATE`. This produced invalid JSON — PostgreSQL `::jsonb` saw literal backslash-escaped quotes.

**What we did better:** Switched to PowerShell's `@"..."@` (here-string):
- No escaping needed for `"` or `'` inside
- `$CASE_ID` still interpolates (PowerShell vars)
- Em dashes (`—`) and other Unicode pass through cleanly
- Copy-paste safe from the markdown file

**Before (broken):**
```powershell
psql -c "UPDATE ... SET qwen_raw_output = '{\"tier\":\"FLASH\"}'::jsonb"
```

**After (fixed):**
```powershell
psql -c @"
UPDATE ... SET qwen_severity_reason = 'FLASH — child rule applied'
"@
```

---

### Discovery: `qwen_classified_at` and `qwen_raw_output` don't exist in `cases`

**What happened:** The test guide used `qwen_classified_at` (TIMESTAMPTZ) and `qwen_raw_output` (JSONB) — columns that were mentioned in the design but never added to the migration `005_cases.sql`. The actual columns are:

| Exists? | Column | Type |
|---|---|---|
| ✅ | `qwen_confidence` | FLOAT (0–1) |
| ✅ | `qwen_severity_reason` | TEXT |
| ✅ | `trust_score` | FLOAT (0–1) |
| ✅ | `antifake_verdict` | TEXT |
| ❌ | `qwen_classified_at` | *missing* |
| ❌ | `qwen_raw_output` | *missing* |

**Fix:** Use `qwen_severity_reason` for the classify reasoning text. Use `updated_at` (already on every row) instead of a dedicated classify timestamp.

**Lesson:** Verify column names against actual migrations before writing SQL in test guides.

---

### Decision: Local USSD test uses local Postgres, not Aurora

**Why:** Aurora's security group only allows inbound from the EC2 VPC. The USSD service running on a local laptop can't reach `<your-rds-endpoint>:5432`. The `docker-compose.yml` on EC2 works because all services share the same VPC.

**Fix:** Override `DATABASE_URL` locally:
```powershell
$env:DATABASE_URL = "postgres://postgres:test@localhost:5433/ravencry"
```

Start local Postgres if needed:
```powershell
docker run -d --name ravencry-pg -p 5433:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ravencry postgis/postgis:16-3.4
```

**Lesson:** The `.env` file has the production Aurora URL. Local dev ALWAYS needs a separate local Postgres instance. The commented-out line `# DATABASE_URL="postgres://postgres:test@localhost:5433/ravencry"` exists for this reason.

---

### Decision: USSD service code is `*384*72836#`

**Why:** This is the code registered on Africa's Talking sandbox. The shorter `*384#` was a placeholder in early docs. All test guides, menu text, and curl commands must use the full registered code or AT won't route callbacks.

**Files updated:** `test-060.md` (all 6 occurrences), USSD service menus (`menus.ts` already had it).

---

### Discovery: LLM service needs `loadenv ../../.env` when run from `services/llm/`

**Why:** The LLM service uses `dotenv.config()` which looks for `.env` in its CWD (`services/llm/`). But the actual `.env` is in the repo root. Other services (ussd, telegram, sms) explicitly use `loadenv ../../.env` but the LLM terminal didn't.

**Error seen:** `{"error":"llm_error","code":"ERR_LLM_EXTRACT","details":"[qwen] LLM_API_KEY is required"}`

**Fix:**
```powershell
cd services/llm
loadenv ../../.env
npx tsx src/index.ts
```

---

### Discovery: Caddy routing works — empty response was missing Docker container

**What happened:** `curl https://api.ravencry.cv/ussd/callback` returned nothing, while `curl http://localhost:3007/ussd/callback` worked fine. The Caddy config was correct (`handle /ussd/* { reverse_proxy ussd:3007 }`) but the `ussd` Docker container wasn't running on EC2.

**Fix:** `docker compose up -d ussd` on EC2. The Caddy log showed zero errors — it was forwarding to a service that simply wasn't there. Caddy returns an empty 502 (no body) in that case.

**Lesson:** Caddy gives silent failures when a backend is down. Always `docker compose ps` before debugging routing issues.

---

### Discovery: n8n `??` null-coalescing needed on ALL channel JSON bodies

**What happened:** USSD curl reports have no GPS, no `last_seen_time`, many NULLs. n8n expression `{{ $json.last_seen_lat }}` outputs nothing for NULL → `"lat": ,` → invalid JSON → node crashes.

**Fix (steps8.md):** Added `??` to every nullable field across Telegram (Node 7) and NAPTIP (Node 8):
- Numbers: `{{ $json.last_seen_lat ?? 0 }}`
- Strings: `{{ $json.last_seen_state ?? '' }}`

**Lesson:** n8n doesn't serialize null to JSON `null` — it outputs empty string. Every field touching nullable data needs `??`.

---

### Decision: Geofence LGA/state fallback for GPS-less reports (USSD, SMS)

**Why:** The Geofence node used `ST_DWithin(coords, coords, radius)` which requires GPS. USSD reports never have GPS (`last_seen_coords IS NULL`). First run returned 0 rows → SMS/Push never fired.

**Fix (steps8.md):** Added a two-path WHERE clause:
- GPS available → PostGIS `ST_DWithin` (original behavior)
- No GPS → LGA/state text match (`s.lga = 'Zamfara Central' OR s.state = 'Zamfara'`)
- Gate: `{{ !!$node["Fetch Case"].json.last_seen_lat }}` evaluates to `true`/`false`

---

### Discovery: naptip service not in docker-compose.yml at all

**What happened:** `EAI_AGAIN naptip` — Docker had no container for the `naptip` hostname. The `NAPTIP_SERVICE_URL` env var was added to n8n but the service itself was never defined in compose.

**Fix:**
- Created `services/naptip/Dockerfile` (multi-stage Node 20 Alpine)
- Created `services/naptip/tsconfig.json`
- Added `naptip:` service to `docker-compose.yml` on `ravencry-net`

---

### Discovery: SMS container not running on EC2

**What happened:** After naptip was fixed, SMS returned `EAI_AGAIN sms`. Same root cause — the `docker-compose.yml` had the SMS service defined but it wasn't running.

**Fix:** `docker compose up -d sms` on EC2.

---

### Discovery: `pgcrypto` extension not enabled on Aurora

**What happened:** `SELECT digest(...)` failed — `pgcrypto` extension not loaded. Needed for seeding subscriber test data with `phone_hash = digest(phone, 'sha256')`.

**Fix:** `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

---

### Discovery: `subscribers` table has no `phone` / `channel` / `created_at` columns

**What happened:** Guessed column names from memory — `phone` → `phone_encrypted` (BYTEA) + `phone_hash` (TEXT). `channel` doesn't exist. `created_at` → `subscribed_at`.

**Lesson:** Always `\d subscribers` before writing INSERTs.

---

### Running Services Checklist (for T-060)

**Steps 1-3 (local or EC2):**

| Service | Port | Local start command |
|---|---|---|
| API Gateway | 3003 | `cd services/api ; npx tsx src/index.ts` |
| USSD | 3007 | `cd services/ussd ; $env:DATABASE_URL="..." ; npx tsx src/index.ts` |
| LLM (Qwen) | 3002 | `cd services/llm ; loadenv ../../.env ; npx tsx src/index.ts` |
| Postgres (local) | 5433 | `docker run -d --name ravencry-pg -p 5433:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ravencry postgis/postgis:16-3.4` |

**Steps 4-6 (EC2 only — Docker Compose):**

| Service | Port | EC2 command |
|---|---|---|
| All services | — | `cd ~/ravencry ; docker compose up -d` |
| Check status | — | `docker compose ps` (all should be `Up (healthy)`) |
| Approve (curl) | 3003 | `curl -X POST http://localhost:3003/api/ops/alerts/$ALERT_ID/approve` |
| n8n logs | 5678 | `docker compose logs n8n --tail 30` |
| SMS logs | 3006 | `docker compose logs sms --tail 10` |
| Telegram logs | 3005 | `docker compose logs telegram --tail 10` |
| NAPTIP check | 3008 | `curl http://localhost:3008/naptip/alerts` |
