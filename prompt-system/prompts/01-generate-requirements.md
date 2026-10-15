# Prompt 01 — Generate specs/requirements.md
## Run this AFTER pasting 00-master-context.md

---

## INSTRUCTION TO AI

Using the full project context from 00-master-context.md, generate a complete `specs/requirements.md` file for RAVENCRY.

The file must follow the Kiro spec-driven format:
- Functional Requirements (FR) with unique IDs (FR-001, FR-002...)
- Non-Functional Requirements (NFR) with unique IDs
- User Stories in "As a [role], I want [action], so that [outcome]" format
- Acceptance Criteria for every requirement (Given / When / Then)
- Out of scope items (explicit — prevents scope creep)

---

## ROLES IN THE SYSTEM

Use these exact roles in user stories:

| Role           | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `reporter`     | Anyone submitting a missing person report (family, witness, bystander)      |
| `sighter`      | Anyone who believes they have seen a missing person and is submitting a tip |
| `subscriber`   | Anyone who has opted in to receive alerts for their region                  |
| `operator`     | RAVENCRY staff reviewing cases and approving/suppressing alerts             |
| `investigator` | Police, DSS, or security agency using the ops dashboard                     |
| `admin`        | System administrator managing integrations and source modules               |

---

## REQUIREMENT DOMAINS TO COVER

Cover every domain below. Do not skip any.

### Domain 1: Report Submission
- WhatsApp bot intake (text, photo, voice note, location pin)
- Telegram bot intake
- PWA web form intake
- USSD *384# flow for feature phones
- SMS keyword intake (REPORT to shortcode)
- Anonymous vs phone-verified paths
- Multilingual input handling (Hausa, Yoruba, Igbo, Pidgin, English)

### Domain 2: AI Processing
- Voice note transcription via Whisper
- Structured field extraction via Qwen (name, age, gender, clothing, last seen location, time, reporter contact)
- Severity classification: FLASH (child / confirmed abduction) / PRIORITY (adult, violence indicators) / ROUTINE (missing, no violence indicators)
- Anti-fake detection (recycled image detection, metadata validation)
- Trust scoring for citizen reports
- Deduplication of reports about the same person/incident

### Domain 3: Alert Distribution
- Geofenced push alerts (160km radius from last seen)
- Telegram channel broadcast
- WhatsApp broadcast via Africa's Talking
- SMS blast to LGA subscribers via Africa's Talking
- SSE feed to ops dashboard (Crucix HUD)
- Webhook to NAPTIP N-Alerts system
- Severity gating: only FLASH goes to full blast; PRIORITY goes to subscribers only; ROUTINE goes to ops dashboard only

### Domain 4: Case Management
- Unified missing persons database
- Case lifecycle: Open → Active (sightings received) → Resolved / Cold
- Sighting submission and review queue
- Operator approval before FLASH alert broadcast
- Investigator timeline view (sightings map, movement path)
- Case deactivation on resolution

### Domain 5: Data & Integrations
- OSINT ingestion: NAPTIP RSS, GDELT, local news, curated Telegram channels
- NAPTIP Amber Alert bridge (trigger existing system on FLASH)
- Periodic Crucix sweeps (configurable interval, default 5 minutes)
- Data retention policy (case data: 7 years; subscriber data: TTL 12 months inactive)
- Media handling: photo/video upload to S3, embedding extraction, source deletion post-processing

### Domain 6: Security & Privacy
- No raw biometric data stored (embeddings only)
- No PII in alert broadcasts (case ID, description, photo only)
- Role-based access control for ops dashboard
- Audit log for every action (immutable DynamoDB records)
- Rate limiting on public intake endpoints
- Anti-abuse: max 3 reports per phone number per hour

### Domain 7: Resilience & Offline
- SMS/USSD fallback when internet unavailable
- PWA offline mode: cache last 10 active alerts
- Graceful degradation when optional integrations are down
- Source health monitoring per Crucix pattern

---

## FORMAT FOR EACH REQUIREMENT

```
### FR-001: [Short title]
**Domain:** [domain name]
**Priority:** MUST / SHOULD / COULD (MoSCoW)
**User Story:** As a [role], I want [action], so that [outcome].

**Acceptance Criteria:**
- GIVEN [precondition]
- WHEN [action]
- THEN [expected result]
- AND [additional condition if needed]

**Notes:** [Any Nigeria-specific constraints or edge cases]
```

---

## ADDITIONAL INSTRUCTIONS

- Mark MUST requirements as hackathon-deliverable or V2 in a notes field
- Include at least 3 acceptance criteria per requirement
- Add a "Constraints" section at the end covering: network, language, device, legal
- Add a "Success Metrics" section: how do we know the system is working? (alert delivery rate, time from report to broadcast, false positive rate)
- Total requirements expected: ~30 FR, ~10 NFR

Save output as: `specs/requirements.md`
