# T-060 · End-to-End Test: USSD → FLASH → SMS
> **Phase:** HACKATHON Phase 7 | **Integration Testing** | **~45 min**
> **Depends on:** T-042 (USSD), T-043 (n8n WF-02), T-041 (SMS), T-040 (Telegram), T-030 (Qwen extract), T-031 (Qwen classify)
> **LLM:** `["Human"]` — End-to-end manual testing across AT simulator, Appsmith (or curl), Telegram, and psql. Requires human to operate multiple systems simultaneously.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AT USSD    │────▶│   USSD svc   │────▶│   Aurora PG  │────▶│   Qwen LLM   │
│  Simulator  │     │  (port 3007) │     │  (persons +  │     │  (port 3002) │
│  *384*72836#│     │              │     │   cases)     │     │  /extract    │
└─────────────┘     └──────────────┘     └──────┬───────┘     │  /classify   │
                                                 │             └──────┬───────┘
                                                 │  pending_triage     │
                                                 │  → pending_review   │
                                                 │  (FLASH tier)       │
                                                 ▼                    │
                                          ┌──────────────┐           │
                                          │  Appsmith /  │◀──────────┘
                                          │  curl approve│
                                          │  (POST /api/ │
                                          │   ops/alerts │
                                          │   /:id/      │
                                          │   approve)   │
                                          └──────┬───────┘
                                                 │ fire-and-forget
                                                 ▼
                                          ┌──────────────┐
                                          │  n8n WF-02   │
                                          │  FLASH       │
                                          │  Broadcast   │
                                          └──┬───┬───┬───┘
                                             │   │   │
                                    ┌────────┘   │   └────────┐
                                    ▼            ▼            ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ Telegram │ │   SMS    │ │  NAPTIP  │
                              │ (3005)   │ │  (3006)  │ │  (3008)  │
                              └──────────┘ └──────────┘ └──────────┘
                                    │            │
                                    ▼            ▼
                              Telegram      AT Sandbox
                              Channel       SMS log
```

**Total services:** 8 (API gateway, USSD, LLM, n8n, Telegram, SMS, NAPTIP, Aurora)

---

## The Test Flow (Happy Path)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Dial `*384*72836#` on AT USSD Simulator → Option 1 | Prompted for name |
| 2 | Enter `Fatima` → `9` → `Zamfara Central` → `today 10am` | Case ID returned, e.g. `NR-2026-000042` |
| 3 | `psql` check: case in Aurora with `pending_triage` | `SELECT status, alert_tier FROM cases WHERE id = '...'` → `pending_triage`, `NULL` |
| 4 | Trigger Qwen extraction + classification | `pending_triage` → `pending_review`, `alert_tier = 'FLASH'` (child, Zamfara) |
| 5 | Approve in Appsmith (or `curl` to API gateway) | n8n WF-02 fires, SMS sent, Telegram posted |
| 6 | Verify SMS in AT Sandbox dashboard | SMS appears in AT log |
| 7 | Verify Telegram alert in channel | Formatted FLASH message with photo in `RAVENCRY Alerts` channel |

> **Target:** Total time from USSD submission to SMS delivery ≤ **90 seconds**.

---

## Before You Start

### All services must be running

```powershell
# Terminal 1 — API Gateway (the hub — port 3003)
cd services/api ; npx tsx src/index.ts

# Terminal 2 — USSD Service (port 3007)
cd services/ussd ; npx tsx src/index.ts

# Terminal 3 — LLM Service (Qwen — port 3002)
cd services/llm ; npx tsx src/index.ts

# Terminal 4 — Telegram Service (port 3005)
cd services/telegram ; npx tsx src/index.ts

# Terminal 5 — SMS Service (port 3006)
cd services/sms ; npx tsx src/index.ts

# Terminal 6 — NAPTIP Mock (port 3008)
cd services/naptip ; npx tsx src/index.ts

# Terminal 7 — n8n (Docker, port 5678)
docker run -it --rm --name n8n -p 5678:5678 --env-file .env -v ${env:USERPROFILE}\.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

### Prerequisites Checklist

- [ ] **AT Sandbox** configured: USSD service code `*384*72836#`, callback URL pointing to USSD service
- [ ] **Aurora PostgreSQL** accessible (or local `ravencry` database via Docker)
- [ ] **Qwen API key** set in `.env` (`QWEN_API_KEY` or `DASHSCOPE_API_KEY`)
- [ ] **AT API key + username** set in `.env` (`AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`)
- [ ] **Telegram Bot Token** set in `.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHANNEL_ID`)
- [ ] **n8n WF-02** built and active (follow `steps8.md`)
- [ ] **n8n WF-02 webhook** URL reachable from API gateway (check `N8N_WEBHOOK_BASE_URL`)
- [ ] **Appsmith** running **or** `curl` ready for approve step (Appsmith is optional — curl works)

### Quick Health Check

```powershell
# Verify all services are up
curl http://localhost:3003/api/health        # API Gateway
curl http://localhost:3007/health            # USSD
curl http://localhost:3002/health            # LLM
curl http://localhost:3005/health            # Telegram
curl http://localhost:3006/health            # SMS
curl http://localhost:3008/health            # NAPTIP
curl http://localhost:5678/healthz           # n8n

# Verify Aurora connection
# (adjust $LOCAL_PG / $DATABASE_URL as needed)
psql $LOCAL_PG -c "SELECT COUNT(*) FROM cases;"
```

> **If any service returns non-200 or an error**, fix it before proceeding. The test depends on ALL services being healthy.

> **🟢 Local-first for Steps 1–3 (USSD → Qwen → DB):** These services are independent — run them locally with `npx tsx` and a local Postgres. Verify data flows into `cases` and `alerts` tables.
>
> **🔴 EC2 required for Steps 4–6 (approve → n8n → broadcast):** The API gateway calls n8n at `http://n8n:5678` (Docker service name). This only resolves inside Docker Compose on EC2. From a local `npx tsx` process, `n8n` is not a reachable hostname — hence `fetch failed`.
>
> See [`integration/issues.md`](issues.md) for the full local-vs-EC2 strategy.

---

## Step-by-Step Test Execution

---

### STEP 1 — Simulate USSD Report

**Goal:** Submit a missing child report via AT USSD Simulator that will be classified as FLASH.

#### 1a. Open the AT USSD Simulator

Go to: **Africa's Talking Sandbox → USSD → Simulator**

#### 1b. Dial the service code

```
Phone number: +2348000000001
Dial: *384*72836#
```

**Expected response (Root Menu):**
```
Welcome to RAVENCRY 🇳🇬
Report & find missing persons

1. Report missing person
2. I saw a missing person
3. Latest alert in my area
4. Subscribe / Unsubscribe
```

#### 1c. Complete the report flow

| Prompt | You Enter | Notes |
|--------|-----------|-------|
| `Enter the name of the missing person:` | `Fatima` | |
| `Enter their age (number):` | `9` | **Child = FLASH trigger** |
| `Where were they last seen?` | `Zamfara Central` | **Zamfara = high-risk state = FLASH** |
| `When were they last seen?` | `today 10am` | |

**Expected final response:**
```
Report received.
Case ID: NR-2026-XXXXXX
Share this ID with police.
RAVENCRY will alert your area.
Thank you.
```

> **⚠️ Note the Case ID!** You'll need it for all subsequent verification steps.

#### 1d. Alternative: Simulate USSD via curl (skip AT simulator)

If the AT Simulator isn't available or the callback URL isn't configured, you can simulate the entire USSD session directly against the USSD service:

```powershell
# Session parameters
$SESSION = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
$PHONE  = "+2348000000001"
$USSD   = "http://localhost:3007/ussd/callback"

# Step 1: Dial *384*72836# (empty text = root menu)
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text="
# → CON Welcome to RAVENCRY...

# Step 2: Select option 1 (Report)
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1"
# → CON Enter the name of the missing person:

# Step 3: Enter name
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima"
# → CON Enter their age (number):

# Step 4: Enter age
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9"
# → CON Where were they last seen?

# Step 5: Enter LGA
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9*Zamfara Central"
# → CON When were they last seen?

# Step 6: Enter when → case created
curl -X POST $USSD -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9*Zamfara Central*today 10am"
# → END Report received. Case ID: NR-2026-XXXXXX
```

**The last curl returns the Case ID. Copy it.**: `NR-2026-000008`

---

### STEP 2 — Verify: Case in Aurora with `pending_triage`

```powershell
# Replace NR-2026-XXXXXX with your actual case ID
$CASE_ID = "NR-2026-XXXXXX" # NR-2026-000072
# $CASE_ID = "NR-2026-000008"

psql $LOCAL_PG -c "
SELECT
  c.id,
  p.full_name,
  p.age_estimate,
  c.status,
  c.alert_tier,
  c.last_seen_lga,
  c.input_channel,
  c.created_at
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.id = '$CASE_ID';
"
```

**Expected output:**

| id | full_name | age_estimate | status | alert_tier | last_seen_lga | input_channel | created_at |
|----|-----------|-------------|--------|------------|---------------|---------------|------------|
| NR-2026-... | Fatima | 9 | pending_triage | NULL | Zamfara Central | ussd | (now) |

> **✅ Checkpoint:** `status = 'pending_triage'`, `alert_tier IS NULL`. This means the case is waiting for Qwen to extract structured data and classify severity.

---

### STEP 3 — Trigger Qwen Triage (Extract + Classify)

The USSD service creates the case as `pending_triage` but does NOT automatically trigger Qwen triage. In production, n8n WF-01 handles this. For this test, we trigger it manually.

#### 3a. QW-01: Extract structured data from the raw report

```powershell
# The raw_report is stored in the cases table.
# First, get the raw report text:
$RAW = $(psql $LOCAL_PG -t -A -c "SELECT raw_report FROM cases WHERE id = '$CASE_ID';")

# Send to LLM service for extraction
curl -X POST http://localhost:3002/extract `
  -H "Content-Type: application/json" `
  -d "{`"text`": `"$RAW`", `"language`": `"auto`"}"
```

**Expected response:**
```json
{
  "person_name": "Fatima",
  "age_estimate": 9,
  "age_unit": "years",
  "gender": "unknown",
  "language_detected": "en",
  ...
}
```
---
**Actual response:**
```json
{"person_name":"Fatima","age_estimate":9,"age_unit":"years","gender":"female","clothing_desc":null,"distinguishing_features":null,"circumstance":"missing","last_seen_location":"Zamfara Central","last_seen_lga":"Zamfara Central","last_seen_state":"Zamfara","last_seen_time":"2024-06-15T10:00:00","reporter_relationship":null,"num_victims":1,"weapons_mentioned":[],"vehicle_mentioned":null,"language_detected":"english","confidence":0.95,"missing_critical_fields":["clothing_desc","distinguishing_features","reporter_relationship"]}
```

#### 3b. QW-02: Classify severity

```powershell
# The /classify endpoint expects top-level `person` and `location` fields
curl -X POST http://localhost:3002/classify `
  -H "Content-Type: application/json" `
  -d '{"person":{"name":"Fatima","age_estimate":9,"age_unit":"years","gender":"female"},"location":{"last_seen_lga":"Zamfara Central","last_seen_state":"Zamfara","last_seen_location":"Zamfara Central"}}'
```

**Expected response:**
```json
{
  "tier": "FLASH",
  "confidence": 0.95,
  "escalating_factors": ["child", "high_risk_state"],
  "de_escalating_factors": [],
  "recommended_action": "broadcast_immediately",
  "operator_note": "Child (9) reported missing in Zamfara — FLASH broadcast required."
}
```

**Actual response:**
```json
{"tier":"FLASH","reasoning":"Victim is a 9-year-old female — child rule applies; age ≤ 17 mandates FLASH regardless oflocation or other factors. Additionally, Zamfara is a confirmed kidnapping hotspot state.","is_child":true,"is_hotspot":true,"escalating_factors":["child_victim","hotspot_state"],"de_escalating_factors":[],"recommended_action":"immediate_broadcast","operator_note":null,"confidence":1}
```

> **🔑 Why FLASH?** Child (age 9) = automatic FLASH per FR-006. Zamfara = high-risk state (kidnapping hotspot). Combined = highest severity.

#### 3c. Update the case in Aurora with classification results

```powershell
# The cases table has: qwen_confidence (FLOAT), qwen_severity_reason (TEXT)
# There is NO qwen_classified_at or qwen_raw_output column — use updated_at + qwen_severity_reason
psql $LOCAL_PG -c @"
UPDATE cases
SET
  status = 'pending_review',
  alert_tier = 'FLASH',
  qwen_confidence = 1,
  qwen_severity_reason = 'Victim is a 9-year-old female — child rule applies; age ≤ 17 mandates FLASH regardless of location or other factors. Additionally, Zamfara is a confirmed kidnapping hotspot state.',
  updated_at = NOW()
WHERE id = '$CASE_ID';
"@
```

#### 3d. Create the corresponding alert row

```powershell
psql $LOCAL_PG -c "
INSERT INTO alerts (case_id, tier, status, created_at)
VALUES ('$CASE_ID', 'FLASH', 'pending', NOW())
RETURNING id, case_id, tier, status, created_at;
"
# --------------
# Actual Output
#                   id                  |    case_id     | tier  | status  |         created_at
# --------------------------------------+----------------+-------+---------+-----------------------------
#  b8abaeaa-d88a-4ac4-977d-2c33f292855d | NR-2026-000008 | FLASH | pending | 2026-07-06 06:45:54.5362+00
# (1 row)
```

> **⚠️ Note the `alerts.id` (UUID)!** You'll need it for the approve step.

```powershell
# Store it
$ALERT_ID = $(psql $LOCAL_PG -t -A -c "SELECT id FROM alerts WHERE case_id = '$CASE_ID' AND tier = 'FLASH';")
echo "ALERT_ID = $ALERT_ID" # b8abaeaa-d88a-4ac4-977d-2c33f292855d
```

#### 3e. Verify triage result

```powershell
psql $LOCAL_PG -c "
SELECT c.id, p.full_name, p.age_estimate, c.status, c.alert_tier
FROM cases c
JOIN persons p ON c.person_id = p.id
WHERE c.id = '$CASE_ID';
"

# Actual Response
#        id       | full_name | age_estimate |     status     | alert_tier
# ----------------+-----------+--------------+----------------+------------
#  NR-2026-000008 | Fatima    |            9 | pending_review | FLASH
# (1 row)
```

**Expected:**

| id | full_name | age_estimate | status | alert_tier |
|----|-----------|-------------|--------|------------|
| NR-2026-... | Fatima | 9 | pending_review | FLASH |

> **✅ Checkpoint:** `status = 'pending_review'`, `alert_tier = 'FLASH'`. Case is ready for operator approval.

---

### STEP 4 — Approve (EC2 ONLY)

> **🔴 Must run on EC2.** The API gateway calls n8n at the Docker service name `http://n8n:5678`. From a local `npx tsx` process this fails with `fetch failed`. The approve endpoint, n8n WF-02, and all downstream services (SMS, Telegram) must be in the same Docker Compose network.
>
> **⚠️ Before you approve:** Steps 1-3 were done on your **local** Postgres. n8n WF-02 reads from **Aurora** (the EC2 database). You must re-create the same case + alert rows on Aurora before approving, or n8n will find nothing. See the quick re-run commands below.

#### 0. Pre-flight: Re-create case + alert on Aurora

```bash
ssh ravencry

# Step 1 — create the USSD case (simulate the report against the EC2 USSD service)
SESSION="ec2-test-$(date +%Y%m%d%H%M%S)"
PHONE="+2348000000001"

curl -s -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text="
# → CON Welcome to RAVENCRY...

curl -s -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1"
curl -s -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima"
curl -s -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9"
curl -s -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9*Zamfara Central"

# Last call — creates the case, returns the CASE_ID
curl -X POST http://localhost:3007/ussd/callback \
  -d "sessionId=$SESSION&phoneNumber=$PHONE&text=1*Fatima*9*Zamfara Central*today%2010am"
# → END Report received. Case ID: NR-2026-000104

# Store it
CASE_ID="NR-2026-000104"   # ← copy from the output above

# Step 3 — classify + create alert (Qwen is already running on EC2)
RAW=$(psql $DATABASE_URL -t -A -c "SELECT raw_report FROM cases WHERE id = '$CASE_ID';")

# Extract
curl -s -X POST http://localhost:3002/extract \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$RAW\",\"language\":\"auto\"}"

# Classify
curl -s -X POST http://localhost:3002/classify \
  -H "Content-Type: application/json" \
  -d '{"person":{"name":"Fatima","age_estimate":9,"age_unit":"years","gender":"female"},"location":{"last_seen_lga":"Zamfara Central","last_seen_state":"Zamfara","last_seen_location":"Zamfara Central"}}'
# → {"tier":"FLASH","confidence":1,...}

# Update case in Aurora
psql $DATABASE_URL -c "
UPDATE cases SET status = 'pending_review', alert_tier = 'FLASH',
  qwen_confidence = 1, updated_at = NOW()
WHERE id = '$CASE_ID';"

# Create alert row in Aurora
psql $DATABASE_URL -c "
INSERT INTO alerts (case_id, tier, status, created_at)
VALUES ('$CASE_ID', 'FLASH', 'pending', NOW())
RETURNING id;"

# Store ALERT_ID
ALERT_ID=$(psql $DATABASE_URL -t -A -c "SELECT id FROM alerts WHERE case_id = '$CASE_ID' AND tier = 'FLASH';")
echo "CASE_ID=$CASE_ID  ALERT_ID=$ALERT_ID"
```

#### 4a. SSH into EC2 and verify services

```bash
ssh ravencry
cd ~/ravencry
docker compose ps
```

All services should show `Up (healthy)`. If n8n isn't listed, build WF-02 following `steps8.md`.

#### 4b. Approve via curl

```bash
# On EC2 — curl to the API gateway inside Docker
# ALERT_ID="b8abaeaa-d88a-4ac4-977d-2c33f292855d"   # from Step 3d
ALERT_ID=725e471d-0942-4cd4-ab39-18a0444fe79f
curl -X POST "http://localhost:3003/api/ops/alerts/$ALERT_ID/approve" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{"status":"broadcast_initiated","broadcast_eta_seconds":90}
```

#### 4c. Watch the logs

```bash
# API gateway log — should show n8n WF-02 completion
docker compose logs api --tail 20 | grep approve

# n8n execution log
docker compose logs n8n --tail 30

# SMS broadcast log
docker compose logs sms --tail 10

# Telegram broadcast log
docker compose logs telegram --tail 10
```

#### What happens on approve

The API gateway (`services/api/src/routes/ops.ts`) atomically:

1. `UPDATE alerts SET status = 'approved' WHERE id = $1 AND status = 'pending'` (race-guarded)
2. `UPDATE cases SET status = 'active', alert_tier = 'FLASH'`
3. **Fire-and-forget** `POST http://n8n:5678/webhook/flash-broadcast` (Docker DNS resolves `n8n` to the container)

n8n WF-02 then fetches case + person from Aurora, geofences subscribers, and fans out to SMS, Telegram, and NAPTIP.

---

### STEP 5 — Verify Broadcast Delivery (EC2)

All verifications run on EC2 via SSH.

#### 5a. SMS: AT Sandbox Dashboard

Go to: **Africa's Talking Sandbox → SMS → Logs**

If the geofence matched subscribers, you'll see an outbound SMS with the FLASH alert.

#### 5b. Telegram: RAVENCRY Alerts channel

Open the Telegram channel. You should see:

```
🚨 FLASH ALERT — CHILD MISSING

*Name:* Fatima
*Age:* 9 years
*Last Seen:* Zamfara Central, Zamfara
*When:* today 10am
*Case ID:* NR-2026-XXXXXX

📞 Report sightings: *384*72836# or WhatsApp
```

#### 5c. NAPTIP mock

```bash
curl http://localhost:3008/naptip/alerts
# → {"total": 1, "alerts": [{"person_name":"Fatima","tier":"FLASH","state":"Zamfara"}]}
```

#### 5d. Database state

```bash
docker compose exec api curl -s http://localhost:3003/api/cases/$CASE_ID | jq .
```

**Expected:** `status: "active"`, `alert_tier: "FLASH"`.

#### 5e. Seed a subscriber (if geofence matched nobody)

If n8n WF-02 ran but found zero subscribers in Zamfara:

```bash
psql $DATABASE_URL -c "
INSERT INTO subscribers (phone, lga, state, channel, status, created_at)
VALUES ('+2348012345678', 'Zamfara Central', 'Zamfara', 'sms', 'active', NOW());
"

# Re-trigger n8n directly
curl -X POST http://localhost:5678/webhook/flash-broadcast \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: ${N8N_WEBHOOK_SECRET}" \
  -d "{\"case_id\":\"${CASE_ID}\",\"alert_id\":\"${ALERT_ID}\",\"tier\":\"FLASH\",\"auto_approved\":true}"
```

---

## Verification Summary

Run this all-in-one verification query at the end:

```powershell
$CASE_ID = "NR-2026-XXXXXX"   # ← replace with your actual case ID

psql $LOCAL_PG -c "
SELECT
  'Case' AS entity,
  c.id,
  c.status,
  c.alert_tier,
  c.input_channel,
  c.created_at
FROM cases c WHERE c.id = '$CASE_ID'

UNION ALL

SELECT
  'Alert',
  a.id::text,
  a.status,
  a.tier,
  ''::case_input_channel AS input_channel,
  a.created_at
FROM alerts a WHERE a.case_id = '$CASE_ID';
"
```

**Expected final state:**

| entity | id | status | alert_tier | input_channel | created_at |
|--------|----|--------|------------|---------------|------------|
| Case | NR-2026-... | active | FLASH | ussd | (test time) |
| Alert | (UUID) | approved / broadcast | FLASH | | (test time) |

---

## Troubleshooting

### Qwen extract returns empty person_name
- Check Qwen API key is valid: `curl http://localhost:3002/health`
- Check LLM service logs for provider errors
- Try with explicit `"language": "en"` in the request body

### USSD case creation fails (SERVICE_ERROR)
- Check Aurora connectivity: `curl http://localhost:3007/health`
- If `database: unreachable`, verify `DATABASE_URL` in `.env`
- Check USSD service logs for PostgreSQL errors

### n8n WF-02 never fires
- Verify n8n is running: `curl http://localhost:5678/healthz`
- Check `N8N_WEBHOOK_BASE_URL` in API gateway `.env`
- If n8n is in Docker and API gateway on host, use `http://host.docker.internal:5678`
- Check API gateway logs: `[approve] n8n WF-02 call failed: ...`

### SMS never arrives in AT Sandbox
- Verify AT credentials: `curl http://localhost:3006/health`
- If `at_api_key_configured: false`, set `AFRICASTALKING_API_KEY` + `AFRICASTALKING_USERNAME`
- Check AT Sandbox is in **SMS mode** (not just USSD)
- Ensure subscriber phone is in the geofence area (same LGA/state as case)

### Telegram message not posted
- Verify bot token: `curl http://localhost:3005/health`
- If `bot_token_configured: false`, set `TELEGRAM_BOT_TOKEN`
- Check webhook is set: `curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo`
- Ensure bot is admin in `RAVENCRY Alerts` channel

---

## Performance Target

| Milestone | Max Time |
|-----------|----------|
| USSD submission → case in Aurora | < 2 seconds |
| Qwen extraction + classification | < 10 seconds |
| Approve → n8n WF-02 triggered | < 1 second |
| n8n WF-02 → SMS + Telegram delivered | < 90 seconds |
| **Total: USSD → SMS delivery** | **≤ 90 seconds** |

---

## Next Steps

- [ ] **T-061**: WhatsApp voice note → Hausa (requires T-006B Meta setup)
- [ ] **T-062**: Geofence enforcement test
- [ ] **T-063**: Offline PWA + background sync test
- [ ] **T-064**: Anti-fake detection test

## Support Files

- [`integration/issues.md`](issues.md) — Clarifications on local vs EC2 testing, Appsmith credentials
- [`integration/testing_context.md`](testing_context.md) — Running log of decisions, discoveries, and "why we did what we did"
