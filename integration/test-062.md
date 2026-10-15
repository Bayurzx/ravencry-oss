# T-062 · Geofence Enforcement Test
> **Phase:** HACKATHON Phase 7 | **Integration Testing** | **~20 min**
> **Depends on:** T-043 (n8n WF-02 FLASH broadcast), T-041 (SMS)
> **LLM:** `["Human"]` — Requires running SQL, curl, and checking AT delivery logs.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   n8n WF-02  │────▶│  PostGIS     │────▶│  SMS Service │
│   FLASH      │     │  Geofence    │     │  (port 3006) │
│   Broadcast  │     │  Node 4      │     │  /sms/broadcast│
│              │     │  50km radius │     │              │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                    │
                   ┌────────┴────────┐    ┌──────┴───────┐
                   │ Kano sub gets  │    │ Lagos sub    │
                   │ included (≤50km)│    │ excluded     │
                   │ ✅              │    │ (>800km away)│
                   └────────────────┘    └──────────────┘
```

**Radius rules:**
- FLASH → 50 km
- PRIORITY → 25 km
- ROUTINE → 10 km

**Fallback:** When no GPS coords exist (USSD/SMS text reports), falls back to LGA + state text matching.

---

## Seed Data: Kano + Lagos Test Subscribers

Run against Aurora PostgreSQL **from EC2** (`psql $DATABASE_URL`):

```sql
-- ============================================================
-- T-062 Geofence Test Seed
-- 1 subscriber in Kano (should receive FLASH broadcast for Kano case)
-- 1 subscriber in Lagos (~800km away — should NOT receive Kano alerts)
-- ============================================================

-- Kano subscriber: near Kano Municipal (within 50km of the Kano seed case NR-2026-000001)
-- phone_encrypted = dummy bytea (test-only, SMS service won't decrypt this — fine for geofence assertion)
-- phone_hash = unique text identifier (used by n8n geofence node for display + dedup)
INSERT INTO subscribers (phone_encrypted, phone_hash, state, lga, location, whatsapp_opted_in, active)
VALUES (
  E'\\x544553542D4B414E4F'::bytea,                         -- placeholder: "TEST-KANO" in hex
  'kano-geofence-test-062',
  'Kano',
  'Kano Municipal',
  ST_SetSRID(ST_MakePoint(8.5167, 11.9964), 4326)::geography,
  FALSE,
  TRUE
)
ON CONFLICT (phone_hash) DO UPDATE
SET active = TRUE,
    state = 'Kano',
    lga = 'Kano Municipal',
    location = ST_SetSRID(ST_MakePoint(8.5167, 11.9964), 4326)::geography;

-- Lagos subscriber: Ikeja (~800km from Kano — should NOT receive Kano alerts)
INSERT INTO subscribers (phone_encrypted, phone_hash, state, lga, location, whatsapp_opted_in, active)
VALUES (
  E'\\x544553542D4C41474F53'::bytea,                       -- placeholder: "TEST-LAGOS" in hex
  'lagos-geofence-test-062',
  'Lagos',
  'Ikeja',
  ST_SetSRID(ST_MakePoint(3.3515, 6.6018), 4326)::geography,
  FALSE,
  TRUE
)
ON CONFLICT (phone_hash) DO UPDATE
SET active = TRUE,
    state = 'Lagos',
    lga = 'Ikeja',
    location = ST_SetSRID(ST_MakePoint(3.3515, 6.6018), 4326)::geography;

-- Verify both subscribers are active
SELECT phone_hash, state, lga, active FROM subscribers WHERE phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062');
```

---

## Step 1: Pre-Verify — Geofence Query (SQL Only)

Before triggering any broadcast, verify the geofence logic in isolation.
This is the same query n8n WF-02 Node 4 uses for the Kano case `NR-2026-000001`.

```sql
-- ============================================================
-- Simulate WF-02 Node 4 geofence for Kano FLASH case NR-2026-000001
-- Case coords: last_seen = Sabon Gari Market, Kano (8.5312, 12.0054)
-- ============================================================
SELECT
  s.phone_hash AS subscriber,
  s.state,
  s.lga,
  ROUND(ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(8.5312, 12.0054), 4326)::geography
  ) / 1000, 1) AS distance_km,
  CASE
    WHEN ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(8.5312, 12.0054), 4326)::geography,
      50000
    ) THEN 'INCLUDED ✅'
    ELSE 'EXCLUDED ❌'
  END AS geofence_result
FROM subscribers s
WHERE s.active = TRUE
  AND s.phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062')
  AND s.location IS NOT NULL
ORDER BY distance_km ASC;
```

**Expected output:**

| subscriber | state | lga | distance_km | geofence_result |
|---|---|---|---|---|
| kano-geofence-test-062 | Kano | Kano Municipal | ~2.0 | INCLUDED ✅ |
| lagos-geofence-test-062 | Lagos | Ikeja | ~720 | EXCLUDED ❌ |

If both rows match the expected output → geofence logic works. Proceed to full broadcast test.


## Step 2: Trigger FLASH Broadcast for Kano Case

This fires the n8n WF-02 pipeline which queries the geofence (Node 4), then sends SMS to the INCLUDED subscribers only (Node 5).

```bash
# From EC2, trigger n8n WF-02 webhook for Kano FLASH case
curl -s -X POST http://localhost:5678/webhook/flash-broadcast \
  -H 'Content-Type: application/json' \
  -d '{
    "case_id": "NR-2026-000001",
    "alert_id": "test-geofence-062",
    "alert_tier": "FLASH"
  }' | python3 -m json.tool
```

**Expected:** HTTP 200. n8n execution log shows all 10 nodes green. Node 4 (Geofence) returns 1 or more subscriber rows (NOT 0).


## Step 3: Verify SMS Delivery

### 3a. Check n8n Execution Log

Open n8n → Executions → find the latest WF-02 run.

- **Node 4 (Geofence):** Check output items. Confirm `kano-geofence-test-062` is present and `lagos-geofence-test-062` is absent.
- **Node 5 (SMS):** Check the `subscriber_ids` array. Confirm only Kano subscriber UUIDs are in the request body.

### 3b. Check Africa's Talking Sandbox Dashboard

1. Log in to [africastalking.com](https://www.africastalking.com) → Sandbox → SMS → Sent Messages
2. Verify: `+2348030001062` (Kano) is in the sent list
3. Verify: `+2348030001063` (Lagos) is NOT in the sent list

### 3c. Check SMS Service Logs (Alternative)

```bash
# On EC2, check SMS service logs for the broadcast
docker compose logs sms --tail 50 | grep -E "broadcast|kano-geofence|lagos-geofence|234803000106"
```

Look for:
- `[sms] broadcast: sending to XX subscribers` — count should include Kano sub only
- Lagos phone `+2348030001063` should NOT appear


## Step 4: Negative Test — Lagos Case (Lagos sub gets, Kano sub doesn't)

Fire a FLASH broadcast for the Lagos case (`NR-2026-000003`, Lekki) and verify the opposite:

```sql
-- Pre-verify geofence for Lagos case (Lekki, Eti-Osa ≈ 6.4350, 3.4880)
SELECT
  s.phone_hash AS subscriber,
  s.state,
  ROUND(ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(3.4880, 6.4350), 4326)::geography
  ) / 1000, 1) AS distance_km,
  CASE
    WHEN ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(3.4880, 6.4350), 4326)::geography,
      50000
    ) THEN 'INCLUDED ✅'
    ELSE 'EXCLUDED ❌'
  END AS geofence_result
FROM subscribers s
WHERE s.active = TRUE
  AND s.phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062')
  AND s.location IS NOT NULL
ORDER BY distance_km ASC;
```

**Expected:** Lagos subscriber INCLUDED, Kano subscriber EXCLUDED.

Then trigger the broadcast:
```bash
curl -s -X POST http://localhost:5678/webhook/flash-broadcast \
  -H 'Content-Type: application/json' \
  -d '{
    "case_id": "NR-2026-000003",
    "alert_id": "test-geofence-062b",
    "alert_tier": "FLASH"
  }' | python3 -m json.tool
```


## Step 5: No-GPS Fallback Test

Simulate a USSD-style report (no GPS coordinates) to verify LGA/state text matching fallback:

```sql
-- ============================================================
-- Verify fallback: when GPS is NULL, geofence uses LGA + state text match
-- ============================================================

-- Kano subscriber should match on state='Kano' OR lga='Kano Municipal'
SELECT
  s.phone_hash,
  s.state,
  s.lga,
  CASE
    WHEN s.lga = 'Kano Municipal' OR s.state = 'Kano'
    THEN 'INCLUDED (LGA/state match) ✅'
    ELSE 'EXCLUDED ❌'
  END AS fallback_result
FROM subscribers s
WHERE s.active = TRUE
  AND s.phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062');
```

**Expected:** Kano subscriber INCLUDED (state match), Lagos subscriber EXCLUDED.


## Cleanup

After the test, deactivate (don't delete) the test subscribers:

```sql
UPDATE subscribers SET active = FALSE
WHERE phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062');
```


## Quick-Start (Single Copy-Paste Block)

```bash
# 1. Seed test subscribers (paste into psql)
psql $DATABASE_URL << 'SQL'
INSERT INTO subscribers (phone_encrypted, phone_hash, state, lga, location, whatsapp_opted_in, active) VALUES
  (E'\\x544553542D4B414E4F'::bytea, 'kano-geofence-test-062', 'Kano', 'Kano Municipal', ST_SetSRID(ST_MakePoint(8.5167, 11.9964), 4326)::geography, FALSE, TRUE),
  (E'\\x544553542D4C41474F53'::bytea, 'lagos-geofence-test-062', 'Lagos', 'Ikeja', ST_SetSRID(ST_MakePoint(3.3515, 6.6018), 4326)::geography, FALSE, TRUE)
ON CONFLICT (phone_hash) DO UPDATE SET active = TRUE;
SELECT phone_hash, state, active FROM subscribers WHERE phone_hash LIKE '%-geofence-test-062';
SQL

# 2. Pre-verify geofence (paste into psql)
psql $DATABASE_URL << 'SQL'
SELECT phone_hash, ROUND(ST_Distance(location, ST_SetSRID(ST_MakePoint(8.5312, 12.0054), 4326)::geography)/1000, 1) AS km,
  CASE WHEN ST_DWithin(location, ST_SetSRID(ST_MakePoint(8.5312, 12.0054), 4326)::geography, 50000) THEN 'INCLUDED ✅' ELSE 'EXCLUDED ❌' END AS result
FROM subscribers WHERE active = TRUE AND phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062') AND location IS NOT NULL ORDER BY km;
SQL

# 3. Trigger broadcast
curl -s -X POST http://localhost:5678/webhook/flash-broadcast \
  -H 'Content-Type: application/json' \
  -d '{"case_id":"NR-2026-000001","alert_id":"test-geofence-062","alert_tier":"FLASH"}' | python3 -m json.tool

# 4. Check n8n execution log → Node 4 output → only Kano subscriber present

# 5. Cleanup
psql $DATABASE_URL -c "UPDATE subscribers SET active = FALSE WHERE phone_hash IN ('kano-geofence-test-062', 'lagos-geofence-test-062');"
```


## Definition of Done

- [ ] Kano subscriber (`kano-geofence-test-062`) is in n8n Node 4 (Geofence) output for Kano case `NR-2026-000001`
- [ ] Lagos subscriber (`lagos-geofence-test-062`) is NOT in n8n Node 4 output for Kano case
- [ ] AT Sandbox shows `+2348030001062` (Kano) in sent SMS, but NOT `+2348030001063` (Lagos)
- [ ] Lagos case `NR-2026-000003` geofence correctly includes Lagos sub and excludes Kano sub
- [ ] LGA/state fallback query works for no-GPS scenarios
