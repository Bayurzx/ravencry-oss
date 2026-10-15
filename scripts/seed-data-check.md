# RAVENCRY — Seed Data Verification & Upsert

Copy-paste these SQL blocks on the server that has `psql` access.

---

## 1. Connect

### Remote (Aurora RDS — from EC2)

```bash
psql "$DATABASE_URL"
```

### Local (Docker dev-postgres — from dev machine)

```bash
psql "$LOCAL_PG"
```

---

## 2. Check: do the three cases exist?

Paste this into the `psql` session:

```sql
SELECT
  p.id AS person_id,
  p.full_name,
  p.age_estimate,
  p.gender,
  c.id AS case_id,
  c.status,
  c.alert_tier,
  c.last_seen_location,
  (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id) AS sightings_count
FROM persons p
JOIN cases c ON c.person_id = p.id
WHERE c.id IN ('NR-2026-000001', 'NR-2026-000002', 'NR-2026-000003')
ORDER BY c.id;
```

**Expected output** (3 rows):

```
person_id                            | full_name       | age | gender | case_id         | status            | alert_tier | last_seen_location
b3fa73f4-fb31-4a57-bb03-7cb529dfb931 | Fatima Bello    |   7 | female | NR-2026-000001  | broadcast_complete| FLASH      | Sabon Gari Market, Kano
d5ce1a2e-ff6d-472d-8e4e-8683e970b8a1 | Yusuf Ibrahim   |   9 | male   | NR-2026-000002  | broadcast_complete| FLASH      | Kaduna Central Mosque, Kaduna
a3c5a7df-8f5d-4f10-ae40-e9cb00e57209 | Chioma Okoye    |   6 | female | NR-2026-000003  | active            | FLASH      | Lekki Conservation Centre, Lagos
```

- **If all 3 rows appear** → skip to section 4 (sightings check).
- **If 0 rows or some missing** → run section 3.

---

## 3. Upsert: insert missing persons + cases

Paste the entire block. `ON CONFLICT (id) DO NOTHING` means it's safe to re-run — existing rows are skipped.

```sql
-- =====================================================================
-- Persons
-- =====================================================================
INSERT INTO persons (id, full_name, age_estimate, gender, clothing_desc, distinguishing, photo_s3_key) VALUES
  ('b3fa73f4-fb31-4a57-bb03-7cb529dfb931', 'Fatima Bello', 7, 'female',
   'Yellow dress with small floral patterns, red hijab',
   'Small dark birthmark on her left cheek',
   'cases/fatima_bello/display/photo.jpg'),
  ('d5ce1a2e-ff6d-472d-8e4e-8683e970b8a1', 'Yusuf Ibrahim', 9, 'male',
   'Blue primary school uniform (shirt and shorts), black socks',
   'Walks with a slight but noticeable limp in his left leg',
   'cases/yusuf_ibrahim/display/photo.jpg'),
  ('a3c5a7df-8f5d-4f10-ae40-e9cb00e57209', 'Chioma Okoye', 6, 'female',
   'Pink t-shirt with a cartoon princess, blue denim jeans, white sneakers',
   'Braided hair with bright pink and blue beads at the tips',
   'cases/chioma_okoye/display/photo.jpg')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Fatima Bello — FLASH (whatsapp, broadcast_complete)
-- =====================================================================
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  broadcast_at, broadcast_channels, sms_recipients_count
) VALUES (
  'NR-2026-000001',
  'b3fa73f4-fb31-4a57-bb03-7cb529dfb931',
  'broadcast_complete', 'FLASH', 'abduction',
  'Sabon Gari Market, Kano', 'Kano Municipal', 'Kano',
  ST_SetSRID(ST_MakePoint(8.5312, 12.0054), 4326)::geography,
  NOW() - INTERVAL '1 day',
  'whatsapp',
  encode(sha256('+2348099887766'::bytea), 'hex'),
  'mixed',
  'My daughter Fatima Bello went missing at Sabon Gari market yesterday around 4pm. Ta saka riga yellow da jan hijab. Please help!',
  0.95,
  'Child under 12 abducted in high-traffic public market',
  0.92,
  'verified_authentic',
  NOW() - INTERVAL '23 hours',
  ARRAY['telegram', 'whatsapp', 'sms'],
  120
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Yusuf Ibrahim — FLASH (sms, broadcast_complete)
-- =====================================================================
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  broadcast_at, broadcast_channels, sms_recipients_count
) VALUES (
  'NR-2026-000002',
  'd5ce1a2e-ff6d-472d-8e4e-8683e970b8a1',
  'broadcast_complete', 'FLASH', 'witnessed_kidnapping',
  'Kaduna Central Mosque, Kaduna', 'Kaduna North', 'Kaduna',
  ST_SetSRID(ST_MakePoint(7.4305, 10.5186), 4326)::geography,
  NOW() - INTERVAL '2 days',
  'sms',
  encode(sha256('+2348123456789'::bytea), 'hex'),
  'en',
  'I saw a boy in blue school uniform being forced into a black Toyota Corolla near Kaduna Central Mosque. The boy matches Yusuf Ibrahim description.',
  0.91,
  'Witnessed kidnapping of a minor (9yo)',
  0.88,
  'verified_authentic',
  NOW() - INTERVAL '47 hours',
  ARRAY['telegram', 'sms'],
  85
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Chioma Okoye — FLASH (whatsapp, active)
-- =====================================================================
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict
) VALUES (
  'NR-2026-000003',
  'a3c5a7df-8f5d-4f10-ae40-e9cb00e57209',
  'active', 'FLASH', 'abduction',
  'Lekki Conservation Centre, Lagos', 'Eti-Osa', 'Lagos',
  ST_SetSRID(ST_MakePoint(3.5350, 6.4420), 4326)::geography,
  NOW() - INTERVAL '12 hours',
  'whatsapp',
  encode(sha256('+2348055554433'::bytea), 'hex'),
  'en',
  'Chioma Okoye, 6 years old, disappeared during a family outing at Lekki Conservation Centre this morning. She was wearing a pink shirt and blue jeans.',
  0.98,
  'Recent abduction of a 6-year-old child in public park area',
  0.95,
  'verified_authentic'
) ON CONFLICT (id) DO NOTHING;

-- Advance the case sequence past any manual inserts
SELECT setval('case_seq', GREATEST(
  (SELECT COALESCE(MAX(SUBSTRING(id FROM '\d+$')::int), 0) FROM cases),
  4
));
```

Re-run section 2 to confirm.

---

## 4. Sightings check

The Evidence Desk needs sightings attached to these cases. Run:

```sql
SELECT
  s.id,
  s.case_id,
  s.description,
  s.sighting_location,
  s.sighting_time,
  s.input_channel,
  s.created_at
FROM sightings s
WHERE s.case_id IN ('NR-2026-000001', 'NR-2026-000002', 'NR-2026-000003')
ORDER BY s.case_id, s.created_at;
```

- If you see rows → the evidence-read endpoint will find them.
- If empty → insert demo sightings from section 5.

---

## 5. Insert demo sightings (if missing)

Each case needs at least one sighting for the corroboration/contradiction logic to work.

```sql
-- Fatima — two corroborating sightings at Sabon Gari Market
INSERT INTO sightings (case_id, description, sighting_location, sighting_time, input_channel, status)
VALUES
  ('NR-2026-000001', 'A witness saw a girl matching Fatima near the market entrance.', 'Sabon Gari Market, Kano', NOW() - INTERVAL '20 hours', 'telegram', 'under_review'),
  ('NR-2026-000001', 'A local volunteer relay reports a matching child in the same corridor.', 'Sabon Gari Market, Kano', NOW() - INTERVAL '19 hours', 'osint',   'under_review');

-- Yusuf — one conflicting sighting (different location)
INSERT INTO sightings (case_id, description, sighting_location, sighting_time, input_channel, status)
VALUES
  ('NR-2026-000002', 'A witness reports a boy with the same name at a bus stop.', 'Kawo Bus Stop, Kaduna', NOW() - INTERVAL '44 hours', 'telegram', 'under_review');

-- Chioma — no sightings (insufficient-evidence scenario)
-- Intentionally empty — the Desk handles this case.
```

---

## 6. Final verification

```sql
SELECT
  c.id AS case_id,
  p.full_name,
  c.alert_tier,
  c.status,
  COUNT(s.id) AS sighting_count
FROM cases c
JOIN persons p ON c.person_id = p.id
LEFT JOIN sightings s ON s.case_id = c.id
WHERE c.id IN ('NR-2026-000001', 'NR-2026-000002', 'NR-2026-000003')
GROUP BY c.id, p.full_name, c.alert_tier, c.status
ORDER BY c.id;
```

**Expected:**

| case_id | full_name | alert_tier | status | sighting_count |
|---|---|---|---|---|
| NR-2026-000001 | Fatima Bello | FLASH | broadcast_complete | ≥ 2 |
| NR-2026-000002 | Yusuf Ibrahim | FLASH | broadcast_complete | ≥ 1 |
| NR-2026-000003 | Chioma Okoye | FLASH | active | 0 |

---

## Quick reference for the remote server

```bash
# SSH in
ssh -i your-key.pem ubuntu@your-ec2-host

# Source env vars (DATABASE_URL is set in .env)
export $(grep -v '^#' .env | xargs)

# Open psql
psql "${DATABASE_URL}"

# Then paste the blocks above, one at a time.
```
