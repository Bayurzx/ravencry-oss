# T-064 · Anti-Fake Detection Test
> **Phase:** HACKATHON Phase 7 | **Integration Testing** | **~20 min**
> **Depends on:** T-032 (QW-04 anti-fake prompt + validation)
> **LLM:** `["Human"]` — Runs curl commands against LLM service, verifies output routing and DB state.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     QW-04 Anti-Fake Pipeline                      │
│                                                                  │
│  Report ──► LLM Service (port 3002)                              │
│              POST /check-authenticity                            │
│              │                                                   │
│              ▼                                                   │
│         antifakePrompt.ts                                        │
│         "TRUST BY DEFAULT"                                       │
│              │                                                   │
│     ┌────────┼────────┬──────────────┬──────────┐               │
│     ▼        ▼        ▼              ▼          ▼                │
│  legitimate suspicious hold_for_review likely_fake               │
│  (default)  (1-2 red,  (3+ red,     (5+ red +                   │
│   score≥0.7  no green)  no green)    known hoax)                 │
│     │            │           │            │                      │
│     ▼            ▼           ▼            ▼                      │
│  Broadcast   Broadcast   Ops queue    Ops queue                  │
│  allowed     allowed     (verify      (blocked)                  │
│                          before                                  │
│                          broadcast)                              │
└──────────────────────────────────────────────────────────────────┘
```

**Key files:**
- `services/llm/src/prompts/antifake.ts` — QW-04 prompt with red/green flag framework
- `services/llm/src/validation/schema.ts` — `validateAntiFakeOutput()` validates 4 verdicts + score range + flag arrays
- `services/llm/src/index.ts` (line ~199-260) — `POST /check-authenticity` endpoint with safe defaults

**Design principle — Trust-by-Default:**
- Default verdict: `legitimate` (score 0.7) — never block on infra failure
- 0 weak red flags without a green flag → still `legitimate` (don't jump the gun)
- 1-2 red flags, zero green flags → `suspicious` (flagged, NOT blocked)
- 3+ red flags, zero green flags → `hold_for_review` (ops verify before broadcast)
- 5+ red flags + known hoax patterns → `likely_fake` (extreme cases only)


## Prerequisites

1. **LLM service running** — `cd services/llm && npx tsx src/index.ts` (port 3002)
2. **Qwen API key configured** — `QWEN_API_KEY` or `LLM_API_KEY` in `.env`
3. **curl** available in terminal


## Step 1: Baseline — Legitimate Report (High Detail)

A detailed, specific report from a real person should score high and return `legitimate`.

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "My daughter Fatima Bello, 7 years old, went missing at Sabon Gari Market in Kano around 4pm today. She is wearing a yellow dress with small floral patterns and a red hijab. She has a small dark birthmark on her left cheek. I am her mother, my phone number is 08099887766. Please help us find her.",
    "reporter_phone": "+2348099887766"
  }' | python3 -m json.tool
```

**Expected output:**
```json
{
  "verdict": "legitimate",
  "authenticity_score": 0.85 to 1.0,
  "red_flags": [],
  "green_flags": [
    "specific clothing description",
    "specific name + age + gender",
    "specific LGA + landmark (Sabon Gari Market)",
    "reporter identifies relationship to victim",
    "reporter provides phone number",
    "specific distinguishing feature (birthmark)"
  ],
  "reasoning": "Highly specific report with multiple verifiable details..."
}
```

**Green flags present:** LGA + landmark, clothing, distinguishing feature, reporter relationship, reporter phone, specific time.

✅ **Verdict check:** Must be `legitimate` with score ≥ 0.70.
If score is below 0.7 or verdict is not `legitimate`, this is a **regression** — a legitimate, detailed report must never be blocked.


## Step 2: Generic but Still Legitimate (Minimal Details)

A short but earnest report. Should NOT be flagged as fake just because it's brief.

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "My son Yusuf, 9 years, missing from Kaduna Central Mosque yesterday. He was in blue school uniform. He walks with a limp in his left leg. Please call 08123456789 if you see him.",
    "reporter_phone": "+2348123456789"
  }' | python3 -m json.tool
```

**Expected output:**
```json
{
  "verdict": "legitimate",
  "authenticity_score": 0.75 to 1.0,
  "red_flags": [] (or 0-1 weak flags),
  "green_flags": [
    "specific distinguishing feature (limp)",
    "specific clothing description",
    "specific location",
    "reporter provides phone number"
  ]
}
```

✅ **Verdict check:** Must be `legitimate`. A brief but specific report is not fake.


## Step 3: Suspicious — Emotional + Generic (1-2 Red Flags, No Green Flags)

All-caps pleading with no specific details. Should be `suspicious` (not blocked, but flagged for ops).

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "PLEASE SHARE URGENTLY!!! A CHILD IS MISSING!!! WE NEED EVERYONES HELP IMMEDIATELY!!! PLEASE FORWARD THIS MESSAGE TO EVERYONE YOU KNOW!!! THIS IS NOT A HOAX!!!",
    "reporter_phone": null
  }' | python3 -m json.tool
```

**Expected output:**
```json
{
  "verdict": "suspicious",
  "authenticity_score": 0.35 to 0.55,
  "red_flags": [
    "emotional manipulation without specific facts",
    "WhatsApp-forward-style formatting (ALL CAPS, chain-forward language)",
    "no location details at all",
    "no name or age of missing person",
    "no time reference"
  ],
  "green_flags": []
}
```

✅ **Verdict check:** Should be `suspicious` NOT `legitimate` and NOT `hold_for_review`. This has multiple red flags but no specific hoax indicators — ops should be aware but not blocked.


## Step 4: Hold for Review — Generic + Contradictory (3+ Red Flags, No Green)

Multiple red flags stacking without a single green flag. Should trigger `hold_for_review`.

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "A boy is missing. He has black hair and brown eyes. Last seen somewhere in Lagos. PLEASE SHARE AND FORWARD THIS MESSAGE TO ALL YOUR CONTACTS. HELP US FIND HIM. He is 5 years old. He is 15 years old. He was wearing school uniform. He was wearing casual clothes. URGENT URGENT URGENT!!!"
  }' | python3 -m json.tool
```

**Red flags present:**
- Generic physical description ("black hair, brown eyes" — describes most Nigerian children)
- No location beyond state-level (no LGA, no landmark, no town)
- No time reference at all
- WhatsApp-forward-style formatting (ALL CAPS, chain-forward)
- Multiple contradictory details (age 5 vs 15, school uniform vs casual)
- Emotional manipulation (URGENT URGENT URGENT)

**Expected output:**
```json
{
  "verdict": "hold_for_review",
  "authenticity_score": 0.2 to 0.4,
  "red_flags": ["generic physical description", "no location beyond state", ...],
  "green_flags": []
}
```

✅ **Verdict check:** Should be `hold_for_review`. 3+ red flags with zero green flags and contradictory details = ops must verify before broadcast.


## Step 5: Likely Fake — Recycled Hoax Pattern (5+ Red Flags)

Known hoax pattern with recycled image URL, no specific details, mass-forward language.

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "⚠️ URGENT ALERT ⚠️ THIS CHILD WAS FOUND WANDERING IN ABUJA. HE DOESNT KNOW HIS NAME OR WHERE HE COMES FROM. PLEASE SHARE THIS MESSAGE SO HIS FAMILY CAN FIND HIM. FORWARD TO ALL YOUR GROUPS!!! GOD BLESS YOU AS YOU SHARE!!! ⚠️ URGENT ALERT ⚠️",
    "reporter_phone": null,
    "similar_count": 5
  }' | python3 -m json.tool
```

**Red flags present:**
- Photo URL is a known recycled image (if image analysis were implemented — the `similar_count: 5` simulates this)
- "Found wandering" + "doesn't know his name" is a classic hoax template
- No location beyond city-level
- Emotional + religious manipulation ("GOD BLESS YOU AS YOU SHARE")
- Chain-forward language
- Zero specific details about the child
- 5 similar reports from same area in 24h (recycled hoax)

**Expected output:**
```json
{
  "verdict": "likely_fake",
  "authenticity_score": 0.1 to 0.25,
  "red_flags": ["known hoax pattern", "religious manipulation", "chain-forward", "no specific details", ...],
  "green_flags": []
}
```

✅ **Verdict check:** `likely_fake` is rare — the system should only produce this in extreme cases. If this input returns `hold_for_review` instead of `likely_fake`, that's acceptable (both block broadcast). If it returns `legitimate` or `suspicious`, that's a regression.


## Step 6: Trust-by-Default — Infra Failure Safety

What happens when the LLM is unreachable? The validation layer's safe defaults must kick in.

### 6a. Stop the LLM service

```bash
# Ctrl+C in the services/llm terminal
```

### 6b. Send any report

```bash
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text": "any report text"}' 2>&1
```

**Expected:** HTTP 502 with `{ "error": "llm_error", "code": "ERR_LLM_ANTIFAKE" }` — the endpoint fails closed.

### 6c. Restart LLM service

```bash
cd services/llm && npx tsx src/index.ts
```

✅ **Key behavior:** When the LLM is down, the API gateway or n8n workflow that calls `/check-authenticity` should **default to trusting the report** (fail-open). The anti-fake check failing should never block a report from being created. Verify this by checking what the API gateway's `/api/reports` route does when the LLM call fails — the case should still be created with a default `antifake_verdict`.


## Step 7: Verify DB Integration — antifake_verdict in Cases

After running a report through the full pipeline (not just the LLM endpoint), verify the `antifake_verdict` is stored in PostgreSQL.

```sql
-- Check recent cases' antifake verdicts
SELECT id, status, antifake_verdict, trust_score, created_at
FROM cases
WHERE antifake_verdict IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check distribution of verdicts
SELECT antifake_verdict, COUNT(*) as count
FROM cases
WHERE antifake_verdict IS NOT NULL
GROUP BY antifake_verdict
ORDER BY count DESC;
```

✅ **Expected:** Most cases should have `antifake_verdict = 'verified_authentic'` or `'legitimate'`. Few (if any) should be `'hold_for_review'` or `'likely_fake'` — the system biases toward trust.


## Quick-Start (Single Copy-Paste Block)

```bash
# Terminal 1: Start LLM service
cd services/llm && npx tsx src/index.ts

# Terminal 2: Run all 5 test cases
echo "=== Test 1: Legitimate (detailed) ==="
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text":"My daughter Fatima Bello, 7 years old, went missing at Sabon Gari Market in Kano around 4pm today. She is wearing a yellow dress with small floral patterns and a red hijab. She has a small dark birthmark on her left cheek. I am her mother, my phone number is 08099887766. Please help us find her.","reporter_phone":"+2348099887766"}' | python3 -m json.tool

echo "=== Test 2: Legitimate (brief but specific) ==="
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text":"My son Yusuf, 9 years, missing from Kaduna Central Mosque yesterday. He was in blue school uniform. He walks with a limp in his left leg. Please call 08123456789 if you see him.","reporter_phone":"+2348123456789"}' | python3 -m json.tool

echo "=== Test 3: Suspicious (emotional, no facts) ==="
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text":"PLEASE SHARE URGENTLY!!! A CHILD IS MISSING!!! WE NEED EVERYONES HELP IMMEDIATELY!!! PLEASE FORWARD THIS MESSAGE TO EVERYONE YOU KNOW!!! THIS IS NOT A HOAX!!!"}' | python3 -m json.tool

echo "=== Test 4: Hold for Review (contradictory, 3+ red flags) ==="
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text":"A boy is missing. He has black hair and brown eyes. Last seen somewhere in Lagos. PLEASE SHARE AND FORWARD THIS MESSAGE TO ALL YOUR CONTACTS. HELP US FIND HIM. He is 5 years old. He is 15 years old. He was wearing school uniform. He was wearing casual clothes. URGENT URGENT URGENT!!!"}' | python3 -m json.tool

echo "=== Test 5: Likely Fake (hoax pattern) ==="
curl -s -X POST http://localhost:3002/check-authenticity \
  -H 'Content-Type: application/json' \
  -d '{"text":"⚠️ URGENT ALERT ⚠️ THIS CHILD WAS FOUND WANDERING IN ABUJA. HE DOESNT KNOW HIS NAME OR WHERE HE COMES FROM. PLEASE SHARE THIS MESSAGE SO HIS FAMILY CAN FIND HIM. FORWARD TO ALL YOUR GROUPS!!! GOD BLESS YOU AS YOU SHARE!!! ⚠️ URGENT ALERT ⚠️","similar_count":5}' | python3 -m json.tool
```


## Definition of Done

- [ ] Test 1 (detailed legitimate): verdict `legitimate`, score ≥ 0.70
- [ ] Test 2 (brief specific): verdict `legitimate`, score ≥ 0.70 — brief is NOT fake
- [ ] Test 3 (emotional, no facts): verdict `suspicious` — NOT `legitimate`, NOT `hold_for_review`
- [ ] Test 4 (contradictory, 3+ red flags): verdict `hold_for_review`
- [ ] Test 5 (hoax pattern): verdict `hold_for_review` or `likely_fake` — NOT `legitimate`
- [ ] Trust-by-default: no report is blocked entirely — `hold_for_review` is the hardest gate (ops still sees it)
- [ ] Validation layer works: invalid verdict values are caught, scores out of 0-1 range are caught
- [ ] DB stores `antifake_verdict` in cases table
