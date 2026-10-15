# Nigeria Anti-Kidnapping & Missing Persons Alert System
## Full Feature Map — Hackathon → Scale

> **Legend**
> - `[CORE]` — Hackathon / MVP (build this weekend)
> - `[V2]` — Post-hackathon (weeks 1–8)
> - `[V3]` — Scale phase (months 3–12)

---

## PART 1 — FRONTEND (Citizen-Facing Interface)
> Principle: Any device. Any network. Zero friction.

---

### 1.1 Report Submission Channels

| Feature                   | Tier     | Description                                                                                                                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp bot intake       | `[CORE]` | Send name, photo, last seen location via WhatsApp. Works on any smartphone without installing an app.                                                            |
| USSD / SMS fallback       | `[CORE]` | `*123*ALERT#` style flow for feature phones. No smartphone or internet required. Reaches rural North. Requires aggregator: Africa's Talking, Infobip, or Termii. |
| Progressive Web App (PWA) | `[CORE]` | Mobile-first. Works offline. Single page: report, track, confirm sighting. Deployable on Vercel.                                                                 |
| Telegram bot channel      | `[CORE]` | Blast alerts, receive tips. Two-way: `/brief`, `/status`, `/sighting` commands. Built on Crucix alert adapter.                                                   |

---

### 1.2 Input Types Supported

| Input                    | Tier     | Description                                                                                                                                                   |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice note upload        | `[CORE]` | Caller records a voice note describing the missing person. AI transcribes and structures it into report fields.                                               |
| Photo / video upload     | `[CORE]` | Last known photo, dashcam clip, street footage. Accepts blurry/low-res. AI enhances and extracts face.                                                        |
| GPS coordinates          | `[CORE]` | Share live location or pin last seen point. Geofences alerts to nearby users automatically.                                                                   |
| Free text (multilingual) | `[CORE]` | Hausa, Yoruba, Igbo, Pidgin, English. LLM normalises dialect variations into structured report fields. Qwen handles code-switching well — key differentiator. |

---

### 1.3 Identity & Access

| Feature              | Tier     | Description                                                                                                            |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Phone OTP (optional) | `[CORE]` | Mobile number is the only identity. Not enforced — anonymous reports fully accepted. OTP unlocks case status tracking. |
| Anonymous tip mode   | `[CORE]` | No sign-up required for community tips. Reduces barrier in high-mistrust regions. Especially important in the North.   |

---

### 1.4 Output — What Citizens See

| Feature               | Tier     | Description                                                                                                                   |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Geofenced push alerts | `[CORE]` | Alert only users within ~160km radius of incident. Reduces noise, increases action relevance.                                 |
| Minimal alert card    | `[CORE]` | Name, photo, last seen area, case ID, one-tap to report a sighting. No sensitive PII or location details exposed.             |
| Case status feed      | `[CORE]` | Family receives timestamped updates: e.g. "3 sightings confirmed near Kaduna Central". No exfiltration of investigative data. |
| Radio / TV broadcast  | `[V2]`   | Auto-generate broadcast-ready alert text for NTA, Channels TV, local Hausa/Yoruba radio stations.                             |
| Banking app push      | `[V2]`   | Partner with GTBank, Access, UBA to embed alerts in their mobile app notification channels.                                   |
| Digital billboard API | `[V2]`   | Push alert image to OOH billboard networks in Lagos, Abuja, Kano for FLASH-tier cases.                                        |
| X/Twitter auto-post   | `[V2]`   | Auto-post alert with photo, case ID, last seen LGA to maximise organic viral spread.                                          |

---

## PART 2 — BACKEND (Intelligence & Processing)
> Principle: Ingest everything. Trust nothing unverified. Alert fast.

---

### 2.1 Data Ingestion Pipelines

| Source                      | Tier     | Description                                                                                                       |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| Citizen reports (API / bot) | `[CORE]` | WhatsApp, Telegram, web form, USSD → structured ingest module. Follows Crucix `apis/sources/` module pattern.     |
| News & social OSINT         | `[CORE]` | GDELT, local news RSS, curated X/Twitter, Facebook groups, NAPTIP press releases. Auto-polled on sweep interval.  |
| CCTV / private camera feeds | `[V2]`   | Opt-in camera network: filling stations, malls, banks, churches, schools. Federated — raw video stays on-premise. |
| Drone aerial feeds          | `[V2]`   | Search drones relay thermal and visual footage to backend. AI detects humans, abandoned vehicles, bush camps.     |
| Traffic camera integration  | `[V2]`   | LASTMA, FRSC cameras. LPR for vehicle tracking on known escape routes.                                            |
| Toll gate data              | `[V2]`   | Vehicle plate logs from toll gates cross-referenced against kidnapping-linked vehicle watchlist.                  |
| Satellite / geospatial      | `[V3]`   | Planet Labs or Sentinel-2 for forest camp detection, route heatmaps, terrain analysis in NW/NE Nigeria.           |
| Telecom CDR data            | `[V3]`   | MTN/Airtel movement anomaly detection. Requires MNO partnership and legal/regulatory framework.                   |

---

### 2.2 Core Processing Algorithms

| Algorithm                           | Tier     | Description                                                                                                                       |
| ----------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Delta / dedup engine                | `[CORE]` | Crucix-native. Detects what is genuinely new between sweeps. Prevents duplicate and false alerts from recycled posts.             |
| Severity tiering                    | `[CORE]` | FLASH / PRIORITY / ROUTINE model. Child abduction = FLASH. Adult missing 48h+ with violence indicators = PRIORITY.                |
| LLM triage layer                    | `[CORE]` | Qwen classifies incoming reports, extracts structured fields from dialect voice/text. LLM is optional fallback per Crucix design. |
| Facial recognition — photo matching | `[V2]`   | Match uploaded photo against confirmed sightings. Confidence scoring, blurry image enhancement, gait as fallback signal.          |
| Licence plate recognition (LPR)     | `[V2]`   | Dirty/partial plate handling. Vehicle re-ID across camera networks. Fake plate detection via model/colour cross-check.            |
| Movement timeline + heatmap         | `[V2]`   | Reconstruct probable route from last known → confirmed sightings. LGA-level heatmap of likely movement corridors.                 |
| Trust / credibility scoring         | `[V2]`   | Rank citizen reports by: prior accuracy, metadata quality, corroboration count, proximity to incident.                            |
| Predictive kidnapping hotspot model | `[V2]`   | Historical incidents × geography × economic conditions × route activity → risk zone prediction map.                               |
| Anti-fake alert detection           | `[V2]`   | Detect recycled images, manipulated media, coordinated misinformation. Critical for Nigeria specifically.                         |
| Natural language video/image search | `[V2]`   | Query: "Find child in yellow shirt near Wuse Market". AI searches indexed footage by description.                                 |
| Audio intelligence                  | `[V3]`   | Gunshot detection, distress keyword spotting, voice biometrics, regional dialect geolocation clues.                               |
| Synthetic face aging                | `[V3]`   | AI-age the last known photo for long-term missing persons to aid present-day recognition.                                         |
| Behavioral anomaly detection        | `[V3]`   | Detect forced movement, hostage postures, surveillance loitering patterns from camera feeds.                                      |
| Identity reconstruction             | `[V3]`   | Reconstruct probable match from partial data: side profile, clothing, gait, voice, blurry image combined.                         |

---

### 2.3 Data Persistence (Aurora PostgreSQL + DynamoDB)

| Store                            | Tier     | Description                                                                                                     |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Unified missing persons database | `[CORE]` | Aurora PostgreSQL. Unifies NAPTIP, NGO, hospital, orphanage, immigration, and prison records in one schema.     |
| Sweep & audit log                | `[CORE]` | DynamoDB. Every sweep delta, alert issued, sighting submitted. Immutable evidence chain for case investigation. |
| Subscriber registry              | `[CORE]` | Phone numbers, alert preferences, LGA subscription zones. TTL-managed for privacy compliance.                   |
| Alert archive                    | `[CORE]` | Full history of every issued alert with confidence score, sources, and outcome (resolved / active / cold).      |

---

### 2.4 Operational Resilience

| Feature                  | Tier     | Description                                                                                                                    |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Offline edge nodes       | `[V2]`   | Solar-powered Raspberry Pi at checkpoints and motor parks. Sync batch data when connectivity returns. Critical for NW Nigeria. |
| Graceful key degradation | `[CORE]` | Crucix-native: missing API keys → system continues operating. Source health visible on ops dashboard.                          |
| Low-bandwidth mode       | `[CORE]` | SMS/USSD fallback auto-activates when internet quality drops below threshold.                                                  |

---

## PART 3 — INTEGRATIONS (Existing Systems)
> Principle: Extend what exists. Don't replace it.

---

### 3.1 Government Integrations

| Integration                | Tier     | Description                                                                                                       |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| NAPTIP Amber Alert bridge  | `[CORE]` | Trigger existing Meta/NAPTIP Facebook+Instagram alert system. Extends reach without replacing it.                 |
| N-Alerts (NISPSAS) webhook | `[CORE]` | Feed verified FLASH-tier alerts into FG's N-Alerts platform via their open API for government distribution layer. |
| FRSC / LASTMA camera feed  | `[V2]`   | Tap traffic enforcement cameras for vehicle tracking on arterial highways.                                        |
| Immigration / NIS database | `[V2]`   | Cross-match unresolved missing persons against border crossing records.                                           |

---

### 3.2 Community & Security

| Integration                   | Tier   | Description                                                                                                |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Security agency ops room feed | `[V2]` | Webhook/SSE to police, DSS, military ops rooms. Crucix Jarvis HUD as their case dashboard.                 |
| Vigilante / community groups  | `[V2]` | Amotekun (SW), Civilian JTF (NE), Hisbah (North). Private encrypted alert channel with tip line per group. |
| Hospitals & morgues           | `[V2]` | Unidentified patients and deceased auto-fed into DB. Cross-match against open missing persons cases.       |
| Schools & estates             | `[V2]` | Child pickup verification, school perimeter alerts, bus route tracking via school-facing sub-platform.     |

---

### 3.3 Commercial / API Layer

| Feature                         | Tier   | Description                                                                                                                            |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Public safety API (B2B)         | `[V3]` | Stripe-style API: face search, vehicle search, alert blast, geolocation intelligence. Sell to logistics firms, oil companies, estates. |
| Insurance data layer            | `[V3]` | Anonymised incident data sold to insurance actuaries for kidnap & ransom risk modelling.                                               |
| Cross-border (ECOWAS) expansion | `[V3]` | Extend alert network to Benin, Ghana, Togo, Niger, Cameroon. Trafficking and cross-border kidnapping coverage.                         |

---

## PART 4 — TECH STACK REFERENCE

### Hackathon Stack (Deploy This Weekend)

| Layer                | Tool                          | Notes                                                                            |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Alert engine         | Crucix (fork)                 | Node.js + Express. Delta engine, severity tiers, Telegram/Discord adapters.      |
| LLM triage           | Qwen API                      | Multilingual classification, dialect normalisation, structured field extraction. |
| Frontend / dashboard | Next.js on Vercel             | Crucix Jarvis HUD adapted. SSE for live alert feed.                              |
| Database             | AWS Aurora PostgreSQL         | Missing persons records, subscriber registry, alert archive.                     |
| Audit log            | AWS DynamoDB                  | Sweep deltas, sighting submissions, alert issuance events.                       |
| Alert delivery       | Telegram bot                  | Two-way. `/brief`, `/status`, `/sighting`.                                       |
| Alert delivery       | WhatsApp (via gateway)        | Twilio or Africa's Talking sandbox for demo.                                     |
| Deployment           | Docker (local) + Vercel + AWS | Hackathon credits apply.                                                         |
| Env management       | `.env` pattern                | `TELEGRAM_BOT_TOKEN`, `WHATSAPP_API_KEY`, `DB_URL`, `QWEN_API_KEY` etc.          |

### SMS/USSD Gateway — To Evaluate Next
> No gateway selected yet. Priority candidates for Nigeria:

| Provider         | USSD Support | Nigeria Coverage    | Notes                                        |
| ---------------- | ------------ | ------------------- | -------------------------------------------- |
| Africa's Talking | Yes          | Yes                 | Best developer experience. Nigerian sandbox. |
| Infobip          | Yes          | Yes                 | Enterprise-grade. Higher cost.               |
| Termii           | Yes          | Yes (Lagos-founded) | Nigerian startup. Competitive pricing.       |
| Twilio           | SMS only     | Via partners        | No native USSD. Use only for SMS fallback.   |

---

## PART 5 — KEY RISKS & MITIGATIONS

| Risk                                  | Impact | Mitigation                                                                           |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Poor CCTV coverage in target regions  | High   | Start with citizen-submitted footage. Camera network is V2.                          |
| Police/government mistrust            | High   | Launch as NGO/community tool first. Gov integration is additive, not dependent.      |
| Fake/recycled alert images            | High   | Anti-fake detection module + community corroboration scoring.                        |
| Power and internet instability        | High   | Offline edge nodes, SMS/USSD fallback, lightweight PWA.                              |
| False positives causing alert fatigue | Medium | Severity tiering + trust scoring. Only FLASH goes to full blast.                     |
| Surveillance abuse risk               | High   | No raw biometric data stored. Federated camera model. Legal review for V2+.          |
| USSD gateway dependency               | Medium | Build SMS fallback first for hackathon. USSD via Africa's Talking sandbox post-demo. |

---

## NEXT ACTIONS

- [ ] Fork Crucix repo and run local sweep demo
- [ ] Add first Nigerian source module (`apis/sources/naptip-rss.mjs`)
- [ ] Set up Aurora PostgreSQL on AWS with missing persons schema
- [ ] Deploy Crucix dashboard (Jarvis HUD) to Vercel
- [ ] Wire Telegram bot with two-way commands
- [ ] Register Africa's Talking sandbox account for SMS demo
- [ ] Draft architecture diagram for Devpost submission
- [ ] Record deployment proof (Vercel URL + AWS DB screenshot)