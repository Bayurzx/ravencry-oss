-- ============================================================
-- RAVENCRY Seed Data
-- 3 Open FLASH cases, 1 Resolved ROUTINE case, 50 Subscribers
-- Distributed across Lagos, Abuja (FCT), Kaduna, and Kano
-- ============================================================

-- Clean up existing data to avoid conflicts on duplicate runs
TRUNCATE TABLE persons, cases, sightings, alerts, subscribers, push_subscriptions RESTART IDENTITY CASCADE;

-- 1. Seed Operators (redundancy check, admin@ravencry.cv is already seeded by migration 014)
-- We do not truncate operators to avoid deleting the main admin account.

-- 2. Seed Persons
INSERT INTO persons (id, full_name, age_estimate, gender, clothing_desc, distinguishing, photo_s3_key) VALUES
('b3fa73f4-fb31-4a57-bb03-7cb529dfb931', 'Fatima Bello', 7, 'female', 'Yellow dress with small floral patterns, red hijab', 'Small dark birthmark on her left cheek', 'cases/fatima_bello/display/photo.jpg'),
('d5ce1a2e-ff6d-472d-8e4e-8683e970b8a1', 'Yusuf Ibrahim', 9, 'male', 'Blue primary school uniform (shirt and shorts), black socks', 'Walks with a slight but noticeable limp in his left leg', 'cases/yusuf_ibrahim/display/photo.jpg'),
('a3c5a7df-8f5d-4f10-ae40-e9cb00e57209', 'Chioma Okoye', 6, 'female', 'Pink t-shirt with a cartoon princess, blue denim jeans, white sneakers', 'Braided hair with bright pink and blue beads at the tips', 'cases/chioma_okoye/display/photo.jpg'),
('e8b022b7-87cf-4340-9a29-c0bbdb84218a', 'Babajide Adeniran', 12, 'male', 'Green sports jersey with number 10, black athletic shorts', 'Wears silver-rimmed prescription glasses', 'cases/babajide_adeniran/display/photo.jpg');

-- 3. Seed Cases
-- Case 1: Kano - FLASH (broadcast_complete)
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  broadcast_at, broadcast_channels, sms_recipients_count, operator_id
) VALUES (
  'NR-2026-000001',
  'b3fa73f4-fb31-4a57-bb03-7cb529dfb931',
  'broadcast_complete',
  'FLASH',
  'abduction',
  'Sabon Gari Market, Kano',
  'Kano Municipal',
  'Kano',
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
  120,
  (SELECT id FROM operators WHERE email = 'admin@ravencry.cv' LIMIT 1)
);

-- Case 2: Kaduna - FLASH (broadcast_complete)
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  broadcast_at, broadcast_channels, sms_recipients_count, operator_id
) VALUES (
  'NR-2026-000002',
  'd5ce1a2e-ff6d-472d-8e4e-8683e970b8a1',
  'broadcast_complete',
  'FLASH',
  'witnessed_kidnapping',
  'Kaduna Central Mosque, Kaduna',
  'Kaduna North',
  'Kaduna',
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
  85,
  (SELECT id FROM operators WHERE email = 'admin@ravencry.cv' LIMIT 1)
);

-- Case 3: Lagos - FLASH (active)
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  operator_id
) VALUES (
  'NR-2026-000003',
  'a3c5a7df-8f5d-4f10-ae40-e9cb00e57209',
  'active',
  'FLASH',
  'abduction',
  'Lekki Conservation Centre, Lagos',
  'Eti-Osa',
  'Lagos',
  ST_SetSRID(ST_MakePoint(3.5350, 6.4420), 4326)::geography,
  NOW() - INTERVAL '12 hours',
  'whatsapp',
  encode(sha256('+2348055554433'::bytea), 'hex'),
  'en',
  'Chioma Okoye, 6 years old, disappeared during a family outing at Lekki Conservation Centre this morning. She was wearing a pink shirt and blue jeans.',
  0.98,
  'Recent abduction of a 6-year-old child in public park area',
  0.95,
  'verified_authentic',
  (SELECT id FROM operators WHERE email = 'admin@ravencry.cv' LIMIT 1)
);

-- Case 4: Abuja - ROUTINE (resolved)
INSERT INTO cases (
  id, person_id, status, alert_tier, circumstance,
  last_seen_location, last_seen_lga, last_seen_state, last_seen_coords, last_seen_time,
  input_channel, reporter_phone, language, raw_report,
  qwen_confidence, qwen_severity_reason, trust_score, antifake_verdict,
  resolved_at, resolution_notes, operator_id
) VALUES (
  'NR-2026-000004',
  'e8b022b7-87cf-4340-9a29-c0bbdb84218a',
  'resolved',
  'ROUTINE',
  'missing',
  'Millennium Park, Maitama',
  'Abuja Municipal',
  'Federal Capital Territory',
  ST_SetSRID(ST_MakePoint(7.4985, 9.0620), 4326)::geography,
  NOW() - INTERVAL '5 days',
  'ussd',
  encode(sha256('+2349011223344'::bytea), 'hex'),
  'en',
  'Babajide Adeniran, 12, wandered off from his parents during a picnic at Millennium Park Maitama on Sunday.',
  0.89,
  'Child missing for over 48 hours without kidnap signs',
  0.85,
  'verified_authentic',
  NOW() - INTERVAL '1 day',
  'Found safe at a relative''s house in Gwarinpa. Reunited with family.',
  (SELECT id FROM operators WHERE email = 'admin@ravencry.cv' LIMIT 1)
);

-- Advance sequence to match manual inserts
SELECT setval('case_seq', 4);

-- 4. Seed 50 Subscribers using PL/pgSQL loop
DO $$
DECLARE
  i INTEGER;
  phone_num TEXT;
  phone_hash_val TEXT;
  state_val TEXT;
  lga_val TEXT;
  lat_val FLOAT;
  lng_val FLOAT;
  whatsapp_opt BOOLEAN;
BEGIN
  FOR i IN 1..50 LOOP
    -- Generate sequential mock phone numbers
    phone_num := '+234803' || lpad(i::text, 7, '0');
    phone_hash_val := encode(sha256(phone_num::bytea), 'hex');
    
    -- Distribute across Lagos (1-20), FCT (21-35), Kaduna (36-43), and Kano (44-50)
    IF i <= 20 THEN
      state_val := 'Lagos';
      IF i <= 8 THEN
        lga_val := 'Ikeja';
        lat_val := 6.6018 + (i * 0.001 - 0.004);
        lng_val := 3.3515 + (i * 0.001 - 0.004);
      ELSIF i <= 14 THEN
        lga_val := 'Eti-Osa';
        lat_val := 6.4350 + (i * 0.001 - 0.011);
        lng_val := 3.4880 + (i * 0.001 - 0.011);
      ELSE
        lga_val := 'Alimosho';
        lat_val := 6.6080 + (i * 0.001 - 0.017);
        lng_val := 3.2500 + (i * 0.001 - 0.017);
      END IF;
    ELSIF i <= 35 THEN
      state_val := 'Federal Capital Territory';
      IF i <= 28 THEN
        lga_val := 'Abuja Municipal';
        lat_val := 9.0578 + (i * 0.001 - 0.024);
        lng_val := 7.4951 + (i * 0.001 - 0.024);
      ELSE
        lga_val := 'Bwari';
        lat_val := 9.2780 + (i * 0.001 - 0.031);
        lng_val := 7.3780 + (i * 0.001 - 0.031);
      END IF;
    ELSIF i <= 43 THEN
      state_val := 'Kaduna';
      lga_val := 'Kaduna North';
      lat_val := 10.5333 + (i * 0.001 - 0.039);
      lng_val := 7.4333 + (i * 0.001 - 0.039);
    ELSE
      state_val := 'Kano';
      IF i <= 47 THEN
        lga_val := 'Kano Municipal';
        lat_val := 11.9964 + (i * 0.001 - 0.046);
        lng_val := 8.5167 + (i * 0.001 - 0.046);
      ELSE
        lga_val := 'Fagge';
        lat_val := 12.0250 + (i * 0.001 - 0.048);
        lng_val := 8.5350 + (i * 0.001 - 0.048);
      END IF;
    END IF;

    -- Alternating WhatsApp opt-in status
    whatsapp_opt := (i % 2 = 0);

    -- Insert subscriber
    INSERT INTO subscribers (
      phone_encrypted,
      phone_hash,
      lga,
      state,
      location,
      whatsapp_opted_in,
      active
    ) VALUES (
      decode(md5(phone_num), 'hex'), -- dummy binary data for ciphertext
      phone_hash_val,
      lga_val,
      state_val,
      ST_SetSRID(ST_MakePoint(lng_val, lat_val), 4326)::geography,
      whatsapp_opt,
      TRUE
    );
  END LOOP;
END $$;
