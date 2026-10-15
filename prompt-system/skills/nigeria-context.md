# SKILL: Nigeria Context
## Reusable reference — paste into any session touching Nigeria-specific logic

---

## PURPOSE

This skill primes any AI session with the ground-truth facts about Nigeria's security landscape, infrastructure constraints, and social context that are essential for making correct decisions in RAVENCRY.

**When to use this skill:**
- Any session involving Nigerian geography, language, or culture
- Designing alert geofences or risk zones
- Writing prompt templates for Qwen that reference Nigerian context
- Designing USSD flows or SMS content for Nigerian carriers
- Making infrastructure decisions about offline-first or low-bandwidth behaviour
- Writing seed data or test cases

---

## SECTION 1: SECURITY LANDSCAPE

### Active Conflict Zones (as of 2025)
These LGAs and routes have the highest kidnapping incident density. Any case mentioning these locations should escalate to minimum PRIORITY. A child case involving these locations is always FLASH.

**Northwest Nigeria (Banditry hotspot):**
- States: Zamfara, Katsina, Kebbi, Sokoto, Niger, Kaduna (southern)
- Worst LGAs: Anka (Zamfara), Maru (Zamfara), Maradun (Zamfara), Faskari (Katsina), Sabuwa (Katsina)
- Pattern: bandits, mass kidnappings, ransom-focused, rural communities and highways

**Northeast Nigeria (Boko Haram / ISWAP):**
- States: Borno, Yobe, Adamawa (northern)
- Worst LGAs: Gwoza (Borno), Abadam (Borno), Guzamala (Borno), Kukawa (Borno)
- Pattern: ideological abductions, long-term captivity, school attacks (Chibok precedent)

**North Central (Fulani/criminal militia):**
- States: Plateau, Benue, Kogi, Niger
- Routes: Abuja-Kaduna expressway, Abuja-Lokoja, Minna-Birnin Gwari
- Pattern: highway ambushes, farmer-herder conflict zones

**South (Criminal kidnapping):**
- States: Rivers, Bayelsa, Delta, Imo, Anambra
- Pattern: oil sector targeting, ransom kidnapping, cult activity

### Key High-Risk Routes
```javascript
const HIGH_RISK_ROUTES = [
  "Abuja-Kaduna expressway",
  "Kaduna-Abuja",
  "Minna-Birnin Gwari",
  "Okene-Lokoja",
  "Benin-Sagamu",
  "Ore-Sagamu",
  "Enugu-Port Harcourt",
  "Keffi-Lafia",
  "Jos-Barkin Ladi"
]
```

### Statistics (use in prompts and pitch)
- ~2.2 million kidnapping incidents reported in the NBS Crime Experience and Security Perception Survey (May 2023–April 2024)
- ~₦2.23 trillion reportedly paid in ransoms during the same period
- Nigeria faces one of Africa's most severe kidnapping and missing-person challenges
- Existing alert and reporting systems remain fragmented across agencies and platforms
- Kidnapping is widely believed to be underreported due to fear, mistrust, and limited reporting channels
- Ransom demands vary widely depending on location, victim profile, and criminal group

---

## SECTION 2: INFRASTRUCTURE CONSTRAINTS

### Connectivity Reality
```
Urban (Lagos, Abuja, Kano city): 4G LTE widespread, occasional 5G
State capitals: 3G/4G mixed, unreliable
Secondary towns: 2G/3G, frequent outages
Rural LGAs: 2G only, frequent >1 hour outages
Conflict zones (Zamfara, Borno): 2G patchy, government-imposed blackouts common
```

**Design consequence:**
- Never assume persistent internet for rural reporters
- PWA must cache and work offline for ≥30 minutes
- SMS/USSD must be the fallback for ALL alert delivery, not an edge case
- Images must be optional in every intake flow — never block on photo upload
- Audio compression: WhatsApp sends OGG Opus (~32kbps), not WAV — Whisper handles this natively

### Device Landscape (Nigeria, 2025)
```
Mobile access remains uneven across Nigeria, with smartphone adoption significantly higher in urban areas than in many rural communities.

Key implications:
- Smartphone ownership is substantially higher in urban and southern regions.
- Feature phones remain common in rural and lower-income communities.
- Android devices dominate Nigeria's smartphone market.
- WhatsApp is the most widely used messaging platform.
- Any nationwide alert system should support smartphone, feature phone, and offline-first channels.
```

**Design consequence:**
- USSD (*384#) must be the primary channel for Northern Nigeria
- WhatsApp is the primary channel for Southern and urban Nigeria
- Never require app install for core functionality
- USSD sessions timeout in ~180 seconds — keep flows to max 5 steps

### Power Supply
```
Grid: NEPA/PHCN outages average 8-12 hours/day nationwide
Generators: common in urban/semi-urban, expensive to run
Solar: growing in North and rural areas
```

**Design consequence:**
- EC2 and server infrastructure needs UPS or must tolerate brief downtime
- Edge nodes in field must be solar-powered
- Mobile devices frequently at low battery — notifications must be concise
- USSD works even when phone is at 1% battery (no screen-on requirement for feature phones)

### Telecom Landscape
```
MTN Nigeria: ~40% market share, best rural coverage
Airtel Nigeria: ~25% market share
Glo: ~20% market share, competitive on data
9mobile: ~8% market share
```

**Africa's Talking coverage:** All 4 operators via their Nigerian aggregator agreements.

**USSD number allocation:** Africa's Talking provides a shared USSD code (*384#) in sandbox. Production requires your own shortcode from NCC (Nigerian Communications Commission) — 3-6 month process. Plan for this.

---

## SECTION 3: LANGUAGE AND CULTURE

### Language Distribution
```
Hausa: ~70-80M speakers (North, Northwest, Northeast, Abuja)
Yoruba: ~40-45M speakers (Southwest: Lagos, Ogun, Oyo, Osun, Ondo, Ekiti)
Igbo: ~35-40M speakers (Southeast: Anambra, Imo, Enugu, Ebonyi, Abia)
Nigerian Pidgin: ~75-100M speakers (nationwide second language, especially South)
English: official language, ~50-60M functional speakers (urban, educated)
Fulfulde: ~14M (North, herder communities)
Kanuri: ~5M (Borno, Northeast)
```

**For RAVENCRY V1 priority:**
1. **Hausa** — highest urgency: covers the worst-affected security regions
2. **Pidgin** — broadest reach nationwide as a lingua franca
3. **Yoruba** — large urban population in Lagos
4. **Igbo** — Southeast coverage
5. **English** — educated urban users, investigators, ops team

### Hausa Writing Notes
Hausa is written in two scripts:
- **Boko (Latin):** used in modern digital contexts, WhatsApp, social media. Use this.
- **Ajami (Arabic script):** older, less common in digital contexts. Do not attempt to handle.

Common Hausa transliterations vary — "kidnap" appears as: `sace`, `sace shi`, `yi garkuwa`, `yi jabu`, `kwace`. Keyword list must include variants.

### Nigerian Pidgin Notes
Pidgin is not a creole — it is a contact language that varies by region. Southern Pidgin differs from Northern Pidgin. Key phrases for missing persons:

```
"dem don carry am"    = they took him/her (kidnapped)
"e don miss"          = he/she is missing
"dem snatch am"       = they snatched him/her
"e no dey house"      = he/she is not at home
"dem kidnap am"       = they kidnapped him/her
"e dey for their hand"= he/she is in their captivity
"make una help"       = please help (us)
"wetin e wear"        = what was he/she wearing
"e dey around"        = he/she was seen around [location]
```

### Cultural Factors Affecting Intake
1. **Family honour:** Many families hesitate to report publicly, especially if victim is female. Anonymous reporting is culturally critical, not just a privacy feature.

2. **Police mistrust (North):** Deep historical mistrust of security forces. Framing RAVENCRY as community-to-community (not police-to-community) is critical for adoption in Northern Nigeria.

3. **Superstition and rumour:** Fake kidnapping alerts spread rapidly on WhatsApp, particularly about organ harvesting. Anti-fake detection is not just technical — it addresses a deep social problem.

4. **Elder authority:** In Hausa communities, elders often make decisions about reporting. The USSD flow should be usable by anyone holding a phone.

5. **Gender:** Reports involving women and girls are often understated. System should never require gender to complete a report.

---

## SECTION 4: EXISTING SYSTEMS TO INTEGRATE WITH

### NAPTIP (National Agency for the Prohibition of Trafficking in Persons)
- Website: naptip.gov.ng
- Amber Alert: launched with Meta Sept 2022, Facebook + Instagram, 160km radius
- Scope: children only
- Trigger: requires NAPTIP staff activation
- RAVENCRY bridge: automate trigger for child FLASH cases via webhook

### N-Alerts (NISPSAS — Nigeria Internal Security and Public Safety Alerts System)
- Ministry of Interior
- Features: crime reporting, kidnapping prevention, inter-agency coordination room
- API: documented at nispsas.gov.ng (verify availability before integrating)
- RAVENCRY bridge: POST verified FLASH alerts to N-Alerts API

### FRSC (Federal Road Safety Corps)
- Camera network on federal highways
- Relevant for: vehicle tracking on escape routes
- Integration: V2 — requires MOU with FRSC

### LASTMA (Lagos State Traffic Management Authority)
- Lagos-specific traffic cameras
- Relevant for: Lagos vehicle tracking
- Integration: V2 — Lagos-specific pilot

### Community Vigilante Networks
| Group                        | Region                    | Mandate                    |
| ---------------------------- | ------------------------- | -------------------------- |
| Amotekun                     | Southwest (Yoruba states) | Regional security          |
| Civilian JTF                 | Northeast (Borno)         | Counter-insurgency support |
| Hisbah                       | Kano, Zamfara, Kaduna     | Islamic law enforcement    |
| Neighbourhood Watch          | Nationwide (informal)     | Community security         |
| OPC (Oodua Peoples Congress) | Southwest (informal)      | Yoruba community militia   |

---

## SECTION 5: REGULATORY AND LEGAL CONTEXT

### Relevant Laws
- **Nigerian Data Protection Act 2023 (NDPA):** Requires consent for personal data processing. RAVENCRY must have a clear privacy notice. Data minimisation applies — collect only what is necessary.
- **Cybercrimes Act 2015:** False alarm/hoax reporting can be criminal. Anti-fake detection supports legal compliance.
- **NCC Regulations:** USSD shortcodes require NCC approval for production. Africa's Talking provides a shared shortcode for development/MVP.
- **No biometric surveillance law (yet):** Facial recognition is unregulated but politically sensitive. Proceed with privacy-first architecture and community consent model.

### Sensitive Populations
- Children (under 18): highest protection, fastest response, NAPTIP notification required
- Women and girls: trafficking risk, discretion in any public broadcast
- Persons with disability: may require adapted intake channels

---

## SECTION 6: SEED DATA — REALISTIC NIGERIAN TEST CASES

Use these in `db/seed.sql` and test suites:

```sql
-- FLASH case: Kano child abduction
INSERT INTO persons (full_name, age_estimate, gender, clothing_desc, distinguishing)
VALUES ('Amina Musa', 8, 'female', 'Blue primary school uniform, white socks', 'Small scar above left eyebrow, plaited hair in two cornrows');

-- PRIORITY case: Kaduna adult missing
INSERT INTO persons (full_name, age_estimate, gender, clothing_desc)
VALUES ('Emmanuel Danjuma', 34, 'male', 'Grey jalabiya, brown leather sandals');

-- ROUTINE case: Lagos
INSERT INTO persons (full_name, age_estimate, gender, clothing_desc)
VALUES ('Taiwo Adeleke', 19, 'female', 'Jeans and red top, school bag');
```

Realistic Nigerian coordinates for test cases:
```javascript
const TEST_LOCATIONS = {
  kano_central:    { lat: 12.0022, lng: 8.5920,  state: 'Kano',   lga: 'Kano Municipal' },
  kaduna_city:     { lat: 10.5105, lng: 7.4165,  state: 'Kaduna', lga: 'Kaduna North' },
  abuja_wuse:      { lat: 9.0579,  lng: 7.4951,  state: 'FCT',    lga: 'Municipal Area Council' },
  lagos_mainland:  { lat: 6.5244,  lng: 3.3792,  state: 'Lagos',  lga: 'Lagos Island' },
  zamfara_anka:    { lat: 12.0833, lng: 5.9167,  state: 'Zamfara', lga: 'Anka' },
  maiduguri:       { lat: 11.8469, lng: 13.1572, state: 'Borno',  lga: 'Maiduguri' },
  port_harcourt:   { lat: 4.8156,  lng: 7.0498,  state: 'Rivers', lga: 'Port Harcourt' }
}
```
