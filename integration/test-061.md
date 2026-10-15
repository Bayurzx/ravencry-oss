# T-061 · End-to-End Test: WhatsApp Voice Note → Hausa
> **Phase:** HACKATHON Phase 7 | **Integration Testing** | **~30 min**
> **Depends on:** T-036 (n8n WF-01), T-035 (Whisper), T-030 (Qwen extract), T-031 (Qwen classify), T-006B (Meta WhatsApp)
> **LLM:** `["Human"]` — Requires sending a real voice note via Meta WhatsApp test number + inspecting n8n execution logs and RDS rows.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WhatsApp    │────▶│  WhatsApp    │────▶│   n8n WF-01  │────▶│   Whisper    │
│  Voice Note  │     │  handler     │     │  (whatsapp-  │     │  /transcribe │
│  (Hausa)     │     │  (port 3004) │     │   intake)    │     │  (port 8000) │
└──────────────┘     └──────────────┘     └──────┬───────┘     └──────┬───────┘
                                                 │  audio branch      │
                                                 │  transcript +      │
                                                 │  language_detected │
                                                 ▼                    │
                                          ┌──────────────┐           │
                                          │   Qwen LLM   │◀──────────┘
                                          │  (port 3002) │
                                          │  /extract    │
                                          │  /classify   │
                                          └──────┬───────┘
                                                 │ pending_triage
                                                 ▼
                                          ┌──────────────┐
                                          │  Aurora PG   │
                                          │  persons +   │
                                          │  cases       │
                                          │  language=ha │
                                          └──────┬───────┘
                                                 │ Meta API reply
                                                 ▼
                                          ┌──────────────┐
                                          │  WhatsApp    │
                                          │  Case ID     │
                                          │  confirmation│
                                          └──────────────┘
```

**Total services:** 6 (WhatsApp handler, n8n, Whisper, LLM, Aurora, Meta API)

---

## The Test Flow (Happy Path)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Send Hausa voice note via WhatsApp to Meta test number | Webhook received by WhatsApp handler, forwarded to n8n WF-01 |
| 2 | n8n WF-01 routes audio → Whisper /transcribe | Whisper returns Hausa transcript with `language_detected: "ha"` |
| 3 | n8n WF-01 sends transcript to Qwen /extract | Qwen extracts `person_name`, `last_seen_location`, `language_detected: "hausa"` |
| 4 | n8n WF-01 sends extraction to Qwen /classify | Qwen classifies tier (FLASH/PRIORITY/ROUTINE) |
| 5 | n8n WF-01 INSERTs person + case into Aurora | Case created with `input_channel = 'whatsapp'`, `language = 'ha'` |
| 6 | n8n WF-01 sends WhatsApp reply with Case ID | Phone receives `✅ Report received. Case ID: NR-2026-XXXXXX` |

> **Target:** Total time from voice note send to case in Aurora ≤ **60 seconds**.

---

## Before You Start

### All services must be running

```powershell
# Terminal 1 — LLM Service (Qwen — port 3002)
cd services/llm ; loadenv ../../.env ; npx tsx src/index.ts

# Terminal 2 — WhatsApp Handler (port 3004)
cd services/whatsapp ; loadenv ../../.env ; npx tsx src/index.ts

# Terminal 3 — n8n (Docker, port 5678)
docker run -it --rm --name n8n -p 5678:5678 --env-file .env -v ${env:USERPROFILE}\.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n

# Terminal 4 — Whisper (Docker, port 8000)
docker compose up whisper
```

### Prerequisites Checklist

- [x] **Meta WhatsApp Cloud API** configured (T-006B): Phone Number ID, System User token, webhook verified ✅
- [ ] **Aurora PostgreSQL** accessible (or local `ravencry` database via Docker)
- [ ] **Qwen API key** set in `.env` (`QWEN_API_KEY` or `DASHSCOPE_API_KEY`)
- [ ] **n8n WF-01** built and active (follow `steps5.md`)
- [ ] **n8n WF-01 webhook** URL reachable from WhatsApp handler (`N8N_WF01_WEBHOOK_URL`)
- [ ] **Whisper service** running with model downloaded (`docker compose up -d whisper`)
- [ ] **Hausa voice note** ready: record a short (~10–15s) voice note in Hausa describing a missing person

### Quick Health Check

```powershell
# Verify all services are up
curl http://localhost:3002/health            # LLM (Qwen)
curl http://localhost:3004/health            # WhatsApp handler
curl http://localhost:8000/health            # Whisper
curl http://localhost:5678/healthz           # n8n

# Verify Aurora connection
# (adjust $LOCAL_PG / $DATABASE_URL as needed)
psql $LOCAL_PG -c "SELECT COUNT(*) FROM cases;"
```

> **If any service returns non-200 or an error**, fix it before proceeding.

> **🟢 Meta WhatsApp is CONFIRMED:** T-006B complete — Graph API v25.0 returns HTTP 200 with valid `wamid` message IDs. `META_WHATSAPP_TOKEN` + `META_PHONE_NUMBER_ID` are set in `.env`. The WhatsApp handler on port 3004 forwards webhooks to n8n WF-01. See Step 6 for the real-phone test path.
>
> **🟡 curl simulation still recommended for initial testing:** POST directly to n8n WF-01 to isolate the Whisper → Qwen → Aurora pipeline without Meta webhook latency.

---

## Step-by-Step Test Execution

---

### STEP 1 — Simulate WhatsApp Voice Note via curl

**Goal:** Simulate a Hausa voice note arriving at the WhatsApp handler, flowing through n8n WF-01's audio branch, and producing a case in Aurora.

> **Why curl first:** POSTing directly to n8n isolates the Whisper → Qwen → Aurora pipeline from Meta webhook latency. Same code path either way — the WhatsApp handler is a thin adapter. Step 6 covers the real-phone test.

#### 1a. Simulate the WhatsApp webhook — audio payload

The WhatsApp handler (`services/whatsapp/src/handler.ts`) receives Meta webhooks and forwards structured payloads to n8n WF-01. We skip the handler and POST directly to n8n:

```powershell
# Simulate an audio message arriving via WhatsApp
curl -X POST http://localhost:5678/webhook/whatsapp-intake `
  -H "Content-Type: application/json" `
  -H "X-Webhook-Secret: $env:N8N_WEBHOOK_SECRET" `
  -d '{"channel":"whatsapp","phone":"2348000000001","message_id":"wamid.test-hausa-001","timestamp":"2026-07-07T09:00:00Z","message_type":"audio","audio_id":"audio-test-hausa-001","audio_mime":"audio/ogg; codecs=opus"}'
```

> **⚠️ n8n WF-01 audio branch:** The audio branch (Node 2b → 2c → 2d → 3) expects `message_type: "audio"` and an `audio_id` field. n8n passes `audio_id` to the Whisper service for transcription.

**Expected response (from n8n Respond to Webhook node):**
```json
{
  "workflow": "wf-01-whatsapp-intake",
  "case_id": "NR-2026-XXXXXX",
  "status": "pending_triage",
  "timestamp": "2026-07-07T09:00:05.000Z"
}
```

> **Note the Case ID!** You'll need it for all subsequent verification steps.

#### 1b. Troubleshoot: n8n audio branch — Whisper connection

If the audio branch fails, the most likely cause is n8n can't reach the Whisper service. From n8n (Docker), Whisper is at `host.docker.internal:8000`:

```powershell
# Test Whisper directly from host
curl -X POST http://localhost:8000/transcribe `
  -F "audio=@test_hausa.ogg"

# Expected: { "transcript": "...", "language_detected": "ha", ... }
```

> **If Whisper returns `transcription_failed`:** The Whisper model may not be downloaded. Check `docker compose logs whisper` for model cache errors. The `faster-whisper` model (~1.5GB) is downloaded at first run.

#### 1c. Alternative: Skip audio — test text path first

If Whisper isn't running, test the text path to verify Qwen → Aurora works:

```powershell
# Simulate a Hausa TEXT message (skip Whisper entirely)
curl -X POST http://localhost:5678/webhook/whatsapp-intake `
  -H "Content-Type: application/json" `
  -H "X-Webhook-Secret: $env:N8N_WEBHOOK_SECRET" `
  -d '{"channel":"whatsapp","phone":"2348000000001","message_id":"test-hausa-text-001","timestamp":"2026-07-07T09:00:00Z","message_type":"text","text":"An sace yarinya Fatima shekara 9 a kasuwar Maru ta Zamfara yau da safe. Tana sanye da rigar makaranta blue."}'
```

**Expected response:**
```json
{
  "workflow": "wf-01-whatsapp-intake",
  "case_id": "NR-2026-XXXXXX",
  "status": "pending_triage",
  "timestamp": "2026-07-07T09:00:05.000Z"
}
```

**Hausa text translation:** "A girl Fatima age 9 was kidnapped at Maru Market in Zamfara this morning. She was wearing a blue school uniform."

---

### STEP 2 — Verify: Whisper Transcription

> **Only for the audio path (Step 1a).** Skip to Step 3 if using the text path (Step 1c).

#### 2a. Check n8n execution log

Open n8n at `http://localhost:5678` → Executions → find the latest WF-01 run → inspect **Node 2c (Whisper Transcribe)** output.

**Expected Whisper output:**
```json
{
  "transcript": "An sace yarinya Fatima shekara tara a kasuwar Maru ta Zamfara yau da safe",
  "language_detected": "ha",
  "language_name": "Hausa",
  "language_confidence": 0.95,
  "duration_seconds": 8.5,
  "transcription_latency_ms": 3200
}
```

> **✅ Checkpoint:** `language_detected: "ha"`, `language_name: "Hausa"`. The transcript is in Hausa and readable.

#### 2b. Verify Whisper directly (bypass n8n)

```powershell
# If you have a test Hausa audio file:
curl -X POST http://localhost:8000/transcribe `
  -F "audio=@test_hausa.ogg"

# Expected response includes: "language_detected": "ha", "transcript": "..."
```

---

### STEP 3 — Verify: Qwen Extraction (QW-01)

#### 3a. Check n8n execution log — Node 3 (QW-01 Extract)

In n8n Executions, inspect **Node 3 (QW-01 Extract)** output.

**Expected Qwen output (from Hausa text):**
```json
{
  "person_name": "Fatima",
  "age_estimate": 9,
  "age_unit": "years",
  "gender": "female",
  "circumstance": "abduction",
  "last_seen_location": "Maru Market, Zamfara",
  "last_seen_lga": "Maru",
  "last_seen_state": "Zamfara",
  "last_seen_time": "2026-07-07T09:00:00",
  "language_detected": "hausa",
  "confidence": 0.92,
  "missing_critical_fields": ["clothing_desc", "distinguishing_features", "reporter_relationship"]
}
```

> **✅ Checkpoint:** `language_detected: "hausa"` — Qwen correctly identified the input as Hausa and extracted structured data from it.

#### 3b. Verify Qwen extract directly (bypass n8n)

```powershell
$HAUSA_TEXT = "An sace yarinya Fatima shekara 9 a kasuwar Maru ta Zamfara yau da safe. Tana sanye da rigar makaranta blue."

curl -X POST http://localhost:3002/extract `
  -H "Content-Type: application/json" `
  -d "{`"text`": `"$HAUSA_TEXT`", `"language`": `"auto`"}"
```

> **Expected:** `person_name: "Fatima"`, `language_detected: "hausa"`, `last_seen_state: "Zamfara"`

---

### STEP 4 — Verify: Qwen Classification (QW-02)

#### 4a. Check n8n execution log — Node 4 (QW-02 Classify)

In n8n Executions, inspect **Node 4 (QW-02 Classify)** output.

**Expected output (child in Zamfara = FLASH):**
```json
{
  "tier": "FLASH",
  "reasoning": "Victim is a 9-year-old female — child rule applies; age ≤ 17 mandates FLASH regardless of location. Additionally, Zamfara is a confirmed kidnapping hotspot state.",
  "is_child": true,
  "is_hotspot": true,
  "escalating_factors": ["child_victim", "hotspot_state"],
  "de_escalating_factors": [],
  "recommended_action": "immediate_broadcast",
  "confidence": 1
}
```

> **✅ Checkpoint:** `tier: "FLASH"`, `is_child: true`, `escalating_factors` includes `"child_victim"` and `"hotspot_state"`.

#### 4b. Verify Qwen classify directly (bypass n8n)

```powershell
curl -X POST http://localhost:3002/classify `
  -H "Content-Type: application/json" `
  -d '{"person":{"name":"Fatima","age_estimate":9,"age_unit":"years","gender":"female"},"location":{"last_seen_lga":"Maru","last_seen_state":"Zamfara","last_seen_location":"Maru Market, Zamfara"}}'
```

---

### STEP 5 — Verify: Case in Aurora

#### 5a. Check the case row

```powershell
# Replace NR-2026-XXXXXX with your actual case ID from Step 1
$CASE_ID = "NR-2026-XXXXXX"

psql $LOCAL_PG -c "
SELECT
  c.id,
  p.full_name,
  p.age_estimate,
  c.status,
  c.alert_tier,
  c.input_channel,
  c.language,
  c.raw_report,
  c.qwen_confidence,
  c.qwen_severity_reason,
  c.created_at
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.id = '$CASE_ID';
"
```

**Expected output:**

| id | full_name | age_estimate | status | alert_tier | input_channel | language | raw_report | qwen_confidence |
|----|-----------|-------------|--------|------------|---------------|----------|------------|-----------------|
| NR-2026-... | Fatima | 9 | pending_triage | FLASH | whatsapp | ha | (Hausa text) | 0.92 |

> **✅ Checkpoint:** `input_channel = 'whatsapp'`, `language = 'ha'` (ISO 639-1 code, mapped from Qwen's `"hausa"` by n8n Node 5 Normalise). `status = 'pending_triage'`, `alert_tier = 'FLASH'`.

#### 5b. Critical: `language = 'ha'`

This is the key verification for T-061 — the `language` column must be `'ha'` (Hausa), proving the end-to-end pipeline correctly handled a non-English report:

```powershell
psql $LOCAL_PG -c "
SELECT id, language, input_channel, raw_report
FROM cases
WHERE input_channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;
"
```

| id | language | input_channel | raw_report |
|----|----------|---------------|------------|
| NR-2026-... | ha | whatsapp | An sace yarinya Fatima shekara... |

> **✅ Checkpoint:** `language = 'ha'`. This is the **Definition of Done** for T-061.

#### 5c. Verify the person row

```powershell
psql $LOCAL_PG -c "
SELECT id, full_name, age_estimate, gender, clothing_desc, distinguishing
FROM persons
ORDER BY created_at DESC
LIMIT 5;
"
```

**Expected:** `full_name = 'Fatima'`, `age_estimate = 9`, `gender = 'female'`.

---

### STEP 6 — Real WhatsApp Test (requires T-006B)

> **⚠️ Only run this after T-006B Meta WhatsApp setup is complete.**

#### 6a. Record a Hausa voice note

Record a short (10–15 second) voice note in Hausa on your phone. Example script:

> **Hausa:** "An sace yarinya Amina shekara 7 a unguwar Sabon Gari Kano. Tana sanye da riga ja. Don Allah a taimaka."

**Translation:** "A girl Amina age 7 was kidnapped in Sabon Gari area of Kano. She was wearing a red dress. Please help."

#### 6b. Send via WhatsApp

1. Open WhatsApp on your phone
2. Send the voice note to the Meta test number (from T-006B Phone Number ID)
3. Wait ~30 seconds for the pipeline to process

#### 6c. Verify the reply

Your phone should receive a WhatsApp reply:

```
✅ Report received. Case ID: NR-2026-XXXXXX

We will alert people in Kano. You will receive updates here.

Share this ID with police: NR-2026-XXXXXX
```

#### 6d. Verify in Aurora

```powershell
# On EC2:
ssh ravencry
CASE_ID="NR-2026-XXXXXX"   # from the WhatsApp reply

psql $DATABASE_URL -c "
SELECT c.id, p.full_name, p.age_estimate, c.status, c.alert_tier,
       c.input_channel, c.language, c.raw_report
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.id = '$CASE_ID';
"
```

**Expected:** `input_channel = 'whatsapp'`, `language = 'ha'`, `raw_report` contains the Hausa transcript from Whisper.

---

## Verification Summary

Run this all-in-one verification query at the end:

```powershell
$CASE_ID = "NR-2026-XXXXXX"   # ← replace with your actual case ID

psql $LOCAL_PG -c "
SELECT
  'Case' AS entity,
  c.id,
  p.full_name,
  p.age_estimate,
  c.status,
  c.alert_tier,
  c.input_channel,
  c.language,
  c.qwen_confidence,
  c.trust_score
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.id = '$CASE_ID';
"
```

**Expected final state:**

| entity | id | full_name | age_estimate | status | alert_tier | input_channel | language | qwen_confidence |
|--------|----|-----------|-------------|--------|------------|---------------|----------|-----------------|
| Case | NR-2026-... | Fatima | 9 | pending_triage | FLASH | whatsapp | ha | 0.92 |

---

## Troubleshooting

### n8n WF-01 returns HTTP 500: "No Respond to Webhook node found"

- n8n's production webhooks require the **Respond to Webhook** node (Node 9) to exist AND the workflow to be **activated/published**
- "Listen for Test Event" mode does NOT use the Respond to Webhook node — it expects the workflow to return data implicitly
- **Fix:** Activate the workflow (toggle in top-right of n8n editor), then retry

### n8n audio branch: Node 2c fails with "fetch failed"

- n8n (Docker) can't reach Whisper at `localhost:8000`
- **Fix:** Set `WHISPER_SERVICE_URL=http://host.docker.internal:8000` in n8n's env vars (or `docker-compose.yml` n8n environment)
- Whisper is NOT on the Docker Compose network if n8n runs standalone — use `host.docker.internal`

### Whisper returns "transcription_failed"

- Model not downloaded or wrong user permissions on model cache
- **Fix:** `docker compose logs whisper` — check for model download errors. The `faster-whisper` small model is ~1.5GB and downloads on first run
- If model cache is owned by root: `docker compose exec whisper chown -R appuser:appuser /home/appuser/.cache`

### Qwen extract returns empty `person_name`

- Hausa text may use characters the model doesn't handle well
- **Fix:** Test with simpler Hausa: `curl -X POST http://localhost:3002/extract -H "Content-Type: application/json" -d '{"text":"Yaro Ali shekara 5 ya bata a Lagos","language":"ha"}'`
- Check Qwen API key: `curl http://localhost:3002/health`

### `language_code` enum violation in PostgreSQL

- n8n Node 5 (Normalise) has a `language_code` row that maps Qwen's human-readable values (`"hausa"`, `"english"`) to ISO codes (`"ha"`, `"en"`)
- If the mapping is missing or wrong, PostgreSQL rejects the INSERT
- **Fix:** Verify Node 5's `language_code` expression includes all mappings: `"english"→"en"`, `"hausa"→"ha"`, `"yoruba"→"yo"`, `"igbo"→"ig"`, `"pidgin"→"pcm"`

### Cases table shows `language = 'en'` instead of `'ha'`

- n8n Node 5 `language_code` fallback is `"en"` — if the ternary expression doesn't match `"hausa"`, it defaults to English
- **Fix:** Check n8n execution log → Node 3 (QW-01 Extract) output → verify `language_detected` is exactly `"hausa"` (lowercase). If it's `"Hausa"` or `"HA"`, update the ternary expression

### n8n can't reach LLM service

- Docker network isolation — n8n in Docker can't reach `localhost:3002`
- **Fix:** Set `LLM_SERVICE_URL=http://host.docker.internal:3002` in n8n env vars

---

## Performance Target

| Milestone | Max Time |
|-----------|----------|
| WhatsApp webhook → n8n WF-01 triggered | < 1 second |
| Whisper transcription (10–15s audio) | < 15 seconds |
| Qwen extraction + classification | < 10 seconds |
| Person + Case INSERT | < 1 second |
| Meta API reply delivered | < 2 seconds |
| **Total: Voice note → Case in Aurora** | **≤ 60 seconds** |

---

## What T-061 Proves

| Capability | How It's Verified |
|------------|-------------------|
| **Hausa voice intake** | Whisper detects `language: "ha"`, transcribes Hausa audio correctly |
| **Multilingual extraction** | Qwen QW-01 extracts `person_name`, `location` from Hausa text |
| **Language preservation** | `cases.language = 'ha'` — the DB records the source language |
| **WhatsApp as input channel** | `cases.input_channel = 'whatsapp'` |
| **Audio → text bridge** | n8n WF-01 audio branch: Whisper transcript → Set `text` → Qwen pipeline (same as text path) |
| **End-to-end intake** | Full flow: WhatsApp webhook → n8n → Whisper → Qwen → Aurora → reply |

---

## Next Steps

- [ ] **T-062**: Geofence enforcement test
- [ ] **T-063**: Offline PWA + background sync test
- [ ] **T-064**: Anti-fake detection test

## Support Files

- [`integration/testing_context.md`](testing_context.md) — Running log of decisions, discoveries, and "why we did what we did"
- [`steps5.md`](../steps5.md) — n8n WF-01 node-by-node build guide
- [`services/whatsapp/src/handler.ts`](../services/whatsapp/src/handler.ts) — WhatsApp webhook handler source
- [`services/whisper/whisper_server.py`](../services/whisper/whisper_server.py) — Whisper transcription server source
- [`services/llm/src/prompts/extract.ts`](../services/llm/src/prompts/extract.ts) — QW-01 multilingual extraction prompt
