# Article 4: After the Hackathon
## Prompt, instructions, reference materials, and research
### Generated: 2026-07-15

---

## Suggested Titles

Primary:
**"After the Hackathon: Where RAVENCRY Goes From Here"**

Alternatives:
- "Week 8 and Beyond: The Road from Hackathon to Production"
- "What 39 Hours Built and What Comes Next"

---

## Article Purpose

A grounded, honest look at the path from hackathon demo to real-world system. RAVENCRY runs. Eleven Docker containers, all healthy. But there is a long list of things that are designed but not built, working but not hardened, functional but not production-ready. This article maps the V2 and V3 roadmap, the technical debt we carried forward, the features we cut for time, and the partnership and scale questions we haven't answered yet.

It is not a pitch deck. It is an engineering assessment of what remains.

---

## Writing Instructions

### Required Reading (read BEFORE writing)

1. `prompt-system/articles/master-plan.md` — global rules, anti-AI checklist, cross-linking map, tone, voice, scene, settings
2. `prompt-system/skills/anti-ai-writing.md` — full anti-AI writing rules
3. `features.md` — V2 and V3 sections: facial recognition, LPR, drone feeds, CDR data, etc.
4. `step_qwencloud.md` — priority-ranked remaining tasks (QC-02 through QC-09)
5. `ravencry_opus_optimization.md` — Task 5 (User Testing Milestones), Task 8 (Algorithm Optimization), technical debt items
6. `specs/todo.md` — V2 backlog items
7. `articles/02-what-we-built.md` — "What We Cut" section
8. `articles/03-what-we-learned.md` — "Design vs. Reality: The Phone Encryption Gap"
9. `flow.md` — demo script for context on what judges saw

> **Validity warning:** `features.md` and `ravencry_opus_optimization.md` were written during the June 2026 hackathon. Some V2/V3 estimates and technical debt items may have been resolved or reprioritized since. The production code in `services/` and `db/migrations/` is the definitive source for what is built vs what remains. Check `step_qwencloud.md` for the most current remaining-task list.

### Research Before Writing (online)

1. **Nigerian emergency response landscape (2026)** — Current state of N-Alerts, Nigeria Police Force alert systems, any new government initiatives. Check NAPTIP website, news about Nigeria's emergency response modernization.
2. **Africa's Talking production pricing Nigeria (2026)** — SMS and USSD costs at scale. What 10,000 SMS/day costs. USSD session pricing. Check developers.africastalking.com.
3. **AWS/Aliyun cost comparison for production scale** — What does 24/7 operation cost? EC2/ECS, Aurora, S3, data transfer.
4. **Open-source emergency alert systems** — What else exists? Ushahidi, RapidSMS, FrontlineSMS. How does RAVENCRY compare?
5. **Nigeria data protection regulation (NDPR) 2026** — Current requirements for storing citizen data, phone numbers, location data. Check NDPR/NITDA website.

### Article Structure

**Opening (2 paragraphs)**
Start with what exists: 11 services running, 15 database migrations, 5 languages, one command. Then the pivot: a hackathon is a snapshot. Production is a process. Here's the gap between the two.

**Section: What the demo showed, what it didn't (~3 paragraphs)**
The 3-minute demo from `flow.md`. What judges saw: the architecture diagram, the WhatsApp flow, the Qwen triage, the FLASH broadcast. What they didn't see: the phone encryption gap, the mocked NAPTIP bridge, the missing ops dashboard, the rate limiting that fails open, the `AUTO_APPROVE_FLASH` toggle that skips human review. None of this is hidden — it's documented in `articles/03-what-we-learned.md` and `pending_fix.md`. It's just not finished.

**Section: The V2 roadmap (~5 paragraphs)**
Walk through the V2 features from `features.md` that matter most:

- Phone encryption: AES-256-GCM with KMS key. Designed, not built. The subscriber schema stores `phone_encrypted` BYTEA. The decrypt function doesn't exist yet.
- Trust scoring: rank citizen reports by prior accuracy, metadata quality, corroboration. The formula is specified in `ravencry_opus_optimization.md`. The code isn't.
- Anti-fake detection: reverse image search (Google Vision/TinEye), EXIF analysis, coordinated misinformation detection. Currently only QW-04 textual analysis.
- Facial recognition: match uploaded photos against confirmed sightings. Blurry image enhancement. Gait as fallback signal.
- Case deduplication: detect when multiple reports describe the same incident. The algorithm is specified, not implemented.
- Radio/TV broadcast: auto-generate broadcast-ready text for NTA, Channels TV, local stations.
- X/Twitter auto-post: push FLASH alerts with photo and case ID.

Reference: `features.md` V2 sections, `ravencry_opus_optimization.md` Task 8.

**Section: The V3 vision (~3 paragraphs)**
The big bets:

- CCTV/private camera network: opt-in federation from filling stations, malls, banks, churches. Raw video stays on-premise.
- Drone aerial feeds: thermal and visual footage, AI for human/vehicle/bush camp detection.
- Telecom CDR data: MTN/Airtel movement anomaly detection. Requires MNO partnership and legal framework.
- Satellite/geospatial: Planet Labs or Sentinel-2 for forest camp detection.
- Audio intelligence: gunshot detection, distress keyword spotting, voice biometrics.
- Predictive hotspot modeling: historical incidents × geography × economic conditions → risk zone prediction.

Reference: `features.md` V3 sections.

**Section: What we need before production (~3 paragraphs)**
List the gaps honestly:

- Phone encryption implementation (`decryptPhone()` function, KMS key in Secrets Manager)
- Circuit breaker on Africa's Talking (3 consecutive failures → skip SMS, alert ops)
- Operator authentication (currently `api_key` header, needs proper JWT/OAuth)
- Source health monitoring with configurable thresholds
- Reverse image search for anti-fake
- Proper ops dashboard (Appsmith container exists but not configured)
- Real NAPTIP integration (currently mocked via webhook.site)
- Load testing (10 concurrent reports minimum)
- Nigerian language test corpus expansion (23 tests → 100+)

Reference: `ravencry_opus_optimization.md`, `pending_fix.md`, `step_qwencloud.md` remaining tasks.

**Section: The partnership question (~2 paragraphs)**
RAVENCRY can't scale alone. It needs:
- MNO partnerships (MTN, Airtel, Glo, 9mobile) for zero-rated USSD and SMS
- Government integration (NAPTIP, Nigeria Police Force, NITDA)
- Media partnerships (Channels TV, NTA, local radio stations)
- NGO partnerships (community organizations in high-risk LGAs)

This section is brief because we don't have answers yet. The point is to name the question honestly.

**Closing (1 paragraph)**
39 hours built a working system. The next 39 weeks decide whether it makes a difference. The code is public. The architecture is documented. The roadmap is clear. What happens next depends on who shows up.

Cross-link: "Next: the anti-fake pipeline and why we chose trust-by-default over skepticism..."

---

### Cross-Linking

- **Links from Article 3**: The prompting article explained how the system thinks. This article explains where it's going.
- **Links to Article 5**: "Next: how the anti-fake pipeline decides what's real and what's not, and why false positives are bad but false negatives are catastrophic."

---

### Voice & Tone Reminder

This is the "what's next" article. Not hype. Not "we're going to change the world." Calm, measured, honest about what's finished and what isn't. The narrator has just spent 39 hours building something and is now looking at the gap between where it is and where it needs to be. There's pride in what was built. There's clear-eyed realism about what remains. There's no hand-waving about "we'll figure it out later."

---

## Online Research URLs to Check

1. NAPTIP Nigeria: `https://www.naptip.gov.ng/` (current programs, alert systems)
2. Nigeria Data Protection Regulation (NDPR): `https://ndpr.nitda.gov.ng/` (current requirements)
3. Africa's Talking pricing: `https://africastalking.com/pricing` (Nigeria SMS/USSD)
4. Ushahidi: `https://www.ushahidi.com/` (comparable open-source platform)
5. N-Alerts / Nigeria Police Force: search for current emergency alert initiatives
