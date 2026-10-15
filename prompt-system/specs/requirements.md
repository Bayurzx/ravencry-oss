# RAVENCRY — Requirements Specification
## Kiro Spec · v1.1 · June 2026 (Opus-optimized)

> This document is the source of truth for what RAVENCRY must do.
> Anything not in this document is out of scope.
> Update this file before changing any behaviour.

---

## ROLES

| ID  | Role           | Description                                                                   |
| --- | -------------- | ----------------------------------------------------------------------------- |
| R1  | `reporter`     | Anyone submitting a missing person report — family member, witness, bystander |
| R2  | `sighter`      | Anyone submitting a tip about a person they may have seen                     |
| R3  | `subscriber`   | Anyone opted in to receive geofenced alerts for their area                    |
| R4  | `operator`     | RAVENCRY staff reviewing, approving, and suppressing alerts                   |
| R5  | `investigator` | Police, DSS, or security agency using the ops dashboard                       |
| R6  | `admin`        | System administrator managing integrations and source modules                 |

---

## FUNCTIONAL REQUIREMENTS

---

### FR-001 · Multi-channel report submission
**Domain:** Report Submission
**Priority:** MUST
**User Story:** As a `reporter`, I want to submit a missing person report via WhatsApp, USSD, SMS, Telegram, or the web app, so that I can use whichever channel I have access to.

**Acceptance Criteria:**
- GIVEN a reporter has WhatsApp
- WHEN they send any message to the RAVENCRY WhatsApp number
- THEN they receive the intake menu within 5 seconds

- GIVEN a reporter has a feature phone only
- WHEN they dial *384#
- THEN a USSD session begins and they can complete a full report without a smartphone

- GIVEN a reporter has internet access
- WHEN they visit the RAVENCRY PWA
- THEN the 4-step report form loads on a 3G connection within 3 seconds

**Notes:** USSD requires Africa's Talking sandbox for hackathon. USSD is the highest-priority channel for reaching northern Nigeria.

---

### FR-002 · Multilingual report intake
**Domain:** Report Submission
**Priority:** MUST
**User Story:** As a `reporter`, I want to submit a report in Hausa, Yoruba, Igbo, Pidgin, or English, so that I do not have to translate my report into a language I am not comfortable with.

**Acceptance Criteria:**
- GIVEN a reporter submits a WhatsApp text in Hausa
- WHEN the Qwen extraction service processes it
- THEN all extractable fields (name, age, location, time) are correctly identified

- GIVEN a reporter sends a voice note in Yoruba
- WHEN Whisper transcribes it
- THEN the transcript is intelligible and Qwen correctly extracts structured fields

- GIVEN a reporter uses code-switching (e.g. Hausa + English mix)
- WHEN the extraction runs
- THEN the language field returns "mixed" and all available fields are still extracted

**Notes:** Whisper `small` model tested on Hausa achieves ~78% WER. Flag Igbo transcripts below 0.6 confidence for human review.

---

### FR-003 · Voice note report submission
**Domain:** Report Submission
**Priority:** MUST
**User Story:** As a `reporter`, I want to send a voice note describing the missing person, so that I do not need to type, especially in an emergency.

**Acceptance Criteria:**
- GIVEN a reporter sends a WhatsApp voice note (OGG format)
- WHEN the system receives it
- THEN it is passed to Whisper for transcription within 30 seconds (p95, CPU-mode whisper-small)

- GIVEN a transcription is returned
- WHEN the transcript confidence is ≥ 0.6
- THEN it proceeds to Qwen extraction automatically

- GIVEN transcript confidence is < 0.6
- WHEN the low confidence is detected
- THEN the report is flagged for human review in the ops dashboard with the raw audio attached

---

### FR-004 · Anonymous report submission
**Domain:** Report Submission / Identity
**Priority:** MUST
**User Story:** As a `reporter`, I want to submit a report without providing my phone number, so that I am not at risk if I am reporting in a dangerous situation.

**Acceptance Criteria:**
- GIVEN a reporter reaches the contact step in the PWA report form
- WHEN they tap "Submit anonymously"
- THEN the report is submitted and stored without any reporter identifier
- AND they still receive a case ID to reference the report

- GIVEN an anonymous report is submitted
- WHEN the case is processed
- THEN it receives the same AI triage as any other report

**Notes:** Anonymous reports receive a slightly lower base trust score (0.4 vs 0.6 for verified). This is factored into severity classification but does not block FLASH classification if other evidence supports it.

---

### FR-005 · AI field extraction
**Domain:** AI Processing
**Priority:** MUST
**User Story:** As a `operator`, I want the AI to extract structured fields from raw reports automatically, so that cases are ready for review without manual data entry.

**Acceptance Criteria:**
- GIVEN a raw text or voice transcript report
- WHEN QW-01 extraction runs
- THEN the output contains: person_name, age_estimate, gender, clothing_desc, last_seen_location, last_seen_time, circumstance, language_detected, extraction_confidence

- GIVEN a report where name cannot be determined
- WHEN extraction runs
- THEN person_name returns null (not invented)

- GIVEN extraction_confidence is below 0.5
- WHEN the case is created
- THEN status is set to `pending_review` and routed to ops dashboard

---

### FR-006 · Severity classification
**Domain:** AI Processing
**Priority:** MUST
**User Story:** As an `operator`, I want the AI to classify every case as FLASH, PRIORITY, or ROUTINE, so that I know which cases to act on immediately.

**Acceptance Criteria:**
- GIVEN a report involving a child abduction in any LGA
- WHEN QW-02 classification runs
- THEN severity is FLASH regardless of other factors

- GIVEN a report of an adult missing with no violence indicators in a low-risk LGA
- WHEN QW-02 runs
- THEN severity is ROUTINE

- GIVEN a report mentions any high-risk LGA (Zamfara, Kaduna, Katsina, Borno, Yobe, Sokoto, Niger, Plateau, Kebbi)
- WHEN QW-02 runs
- THEN severity is at minimum PRIORITY

- GIVEN a FLASH classification
- WHEN the operator views it in the ops dashboard
- THEN an Approve Broadcast button is prominently displayed

---

### FR-007 · Anti-fake detection
**Domain:** AI Processing
**Priority:** MUST
**User Story:** As an `operator`, I want the AI to flag suspicious or recycled reports before broadcast, so that RAVENCRY does not spread misinformation.

**Acceptance Criteria:**
- GIVEN a report containing an image
- WHEN metadata shows EXIF date > 30 days before submission
- THEN authenticity_score is reduced and the case is held for review

- GIVEN a report with no specific location or time detail
- WHEN QW-04 runs
- THEN flags include "lacks_specificity"

**Notes:** V1 anti-fake relies on EXIF metadata analysis + Qwen textual pattern matching. Reverse image search is V2 (requires external API).

---

### FR-008 · FLASH alert broadcast
**Domain:** Alert Distribution
**Priority:** MUST
**User Story:** As a `subscriber`, I want to receive an SMS alert when a child is reported missing near me, so that I can help locate them.

**Acceptance Criteria:**
- GIVEN a FLASH case is approved for broadcast
- WHEN the broadcast pipeline runs
- THEN SMS is sent to all subscribers within 160km of last seen coordinates within 90 seconds

- GIVEN a subscriber is outside the 160km radius
- WHEN a FLASH broadcast fires
- THEN they do NOT receive an SMS (geofence is enforced)

- GIVEN an alert is broadcast
- WHEN a subscriber receives it
- THEN the SMS contains: person name, age, last seen location, case ID, and a sighting reply instruction

---

### FR-009 · Telegram alert channel
**Domain:** Alert Distribution
**Priority:** MUST
**User Story:** As a `subscriber` using Telegram, I want to receive FLASH and PRIORITY alerts in the RAVENCRY channel, so that I am informed about missing persons.

**Acceptance Criteria:**
- GIVEN a FLASH or PRIORITY case is approved
- WHEN broadcast fires
- THEN a formatted message is posted to the public Telegram channel with photo (if available)

- GIVEN a photo is unavailable or S3 fetch times out
- WHEN Telegram broadcast runs
- THEN a text-only message is sent as fallback (broadcast is not blocked)

---

### FR-010 · NAPTIP Amber Alert bridge
**Domain:** Integrations
**Priority:** SHOULD (downgraded from MUST — NAPTIP webhook API is undocumented)
**User Story:** As a `operator`, I want FLASH cases involving children to trigger the existing NAPTIP Amber Alert system, so that RAVENCRY extends government reach rather than replacing it.

**Acceptance Criteria:**
- GIVEN a FLASH case where victim age < 18
- WHEN broadcast is approved
- THEN a CAP-formatted payload is POSTed to the configured NAPTIP endpoint (mock for V1)

- GIVEN the NAPTIP endpoint is down or mocked
- WHEN the request fails
- THEN the failure is logged to DynamoDB and the ops team is notified via Telegram
- AND the RAVENCRY broadcast still proceeds (NAPTIP failure is non-blocking)

**Notes:** V1 uses webhook.site mock. CAP format ensures government-readiness. Real NAPTIP integration requires confirmed API access (V2).

---

### FR-011 · Sighting submission
**Domain:** Case Management
**Priority:** MUST
**User Story:** As a `sighter`, I want to report that I may have seen a missing person, so that I can contribute to finding them.

**Acceptance Criteria:**
- GIVEN a sighter receives a FLASH alert SMS with a case ID
- WHEN they reply "SIGHTING {case_id}" via SMS
- THEN a sighting record is created in the database

- GIVEN a sighter taps "Report Sighting" in the PWA
- WHEN they submit location + description
- THEN the sighting appears in the ops dashboard within 30 seconds

- GIVEN a sighting is submitted for a FLASH case
- WHEN trust_score > 0.8
- THEN an automatic notification is sent to the ops Telegram channel

---

### FR-012 · Geofenced subscriber alerts
**Domain:** Alert Distribution
**Priority:** MUST
**User Story:** As a `subscriber`, I want to only receive alerts relevant to my area, so that I am not overwhelmed with alerts from distant regions.

**Acceptance Criteria:**
- GIVEN a subscriber registered with Lagos LGA coordinates
- WHEN a FLASH alert fires for Kano
- THEN they do NOT receive the alert

- GIVEN a subscriber with no coordinates but state set to "Kaduna"
- WHEN a FLASH alert fires in Kaduna LGA
- THEN they receive the alert via state-level fallback matching

---

### FR-013 · PWA offline functionality
**Domain:** Frontend
**Priority:** MUST
**User Story:** As a `reporter` with intermittent internet, I want to complete a report form offline and have it send automatically when I reconnect, so that I do not lose my report.

**Acceptance Criteria:**
- GIVEN a reporter has previously loaded the PWA
- WHEN they lose internet connection
- THEN the app is still usable and shows cached alerts

- GIVEN a reporter submits a report while offline
- WHEN they reconnect
- THEN the queued report is automatically submitted via background sync

**Notes:** Background Sync API is best-effort (not supported on Safari/iOS). A manual "Retry" button is shown as fallback for unsupported browsers.

---

### FR-014 · LGA subscription management
**Domain:** Subscribers
**Priority:** MUST
**User Story:** As a `subscriber`, I want to subscribe and unsubscribe from alerts via USSD, WhatsApp, or the PWA, so that I control when and where I receive alerts.

**Acceptance Criteria:**
- GIVEN a user dials *384# and selects "Subscribe"
- WHEN they enter their LGA
- THEN a subscriber record is created and they receive a confirmation SMS

- GIVEN a subscriber replies STOP to any RAVENCRY SMS
- WHEN the system processes it
- THEN their record is set to active=false immediately

---

### FR-015 · Operator approval workflow
**Domain:** Case Management
**Priority:** MUST
**User Story:** As an `operator`, I want to review and approve FLASH cases before they broadcast, so that false alerts are never sent to the public.

**Acceptance Criteria:**
- GIVEN a FLASH case is classified by Qwen
- WHEN it lands in the ops dashboard
- THEN there is a prominent Approve and Suppress button
- AND the case detail shows: raw report, Qwen extraction, severity reason, anti-fake score, reporter trust score

> **Approve vs Suppress:** Approve sends the alert live (Telegram, SMS, NAPTIP, PWA push). Suppress kills it silently — used for hoaxes, recycled fake alerts, duplicates, and non-actionable reports like "my teenager ran away." ~80% of reports are approved, ~20% suppressed. This human checkpoint ensures false alerts never reach the public.

- GIVEN an operator approves a FLASH case
- WHEN approval is submitted
- THEN the broadcast pipeline fires within 10 seconds
- AND the approval is logged to DynamoDB with operator ID and timestamp

---

### FR-016 · Case lifecycle management
**Domain:** Case Management
**Priority:** MUST
**User Story:** As an `operator`, I want to mark cases as resolved or cold, so that the system reflects the current state of each incident.

**Acceptance Criteria:**
- GIVEN a case is resolved
- WHEN an operator marks it resolved
- THEN the case status changes to `resolved` and a "Person has been found" update is broadcast to subscribers who received the original alert

- GIVEN a case has no sightings or updates for 30 days
- WHEN the daily cold-case job runs
- THEN status changes to `cold` and it is removed from the active alerts feed

---

### FR-017 · OSINT ingestion
**Domain:** Data Ingestion
**Priority:** MUST
**User Story:** As an `operator`, I want the system to automatically surface kidnapping and missing person reports from Nigerian news and social media, so that community cases are not missed.

**Acceptance Criteria:**
- GIVEN Crucix runs a sweep
- WHEN GDELT or a news RSS feed contains a Nigeria kidnapping article
- THEN a draft case is created with status `pending_review`

- GIVEN an OSINT article is classified by QW-03
- WHEN `actionable: false`
- THEN it is discarded without creating a case

---

### FR-018 · Source health monitoring
**Domain:** Operations
**Priority:** SHOULD
**User Story:** As an `admin`, I want to see the health of all ingestion sources on a dashboard, so that I know if any sources have stopped feeding data.

**Acceptance Criteria:**
- GIVEN all sources are healthy
- WHEN the Crucix HUD loads
- THEN all sources show green status with last event timestamp

- GIVEN a source has not produced events in 60 minutes
- WHEN the dashboard refreshes
- THEN that source shows degraded status and sends a Telegram ops alert

---

### FR-019 · Telegram bot report intake `[ADDED]`
**Domain:** Report Submission
**Priority:** MUST
**User Story:** As a `reporter`, I want to submit a full missing person report via the RAVENCRY Telegram bot, so that I have an alternative to WhatsApp that is free and requires no phone number.

**Acceptance Criteria:**
- GIVEN a reporter sends /report to the Telegram bot
- WHEN they follow the guided prompts
- THEN a complete report is submitted with the same fields as WhatsApp intake

- GIVEN a reporter sends a photo via Telegram
- WHEN the bot receives it
- THEN the photo is uploaded to S3 and attached to the case

**Notes:** Telegram is easier to test than WhatsApp (no sandbox restrictions). Consider as primary demo channel.

---

### FR-020 · Case deduplication `[ADDED]`
**Domain:** Case Management
**Priority:** SHOULD
**User Story:** As an `operator`, I want the system to detect when multiple reports describe the same incident, so that duplicate cases do not clutter the queue.

**Acceptance Criteria:**
- GIVEN two reports with >90% similarity score (name + location + time)
- WHEN the second report is processed
- THEN it is merged into the existing case as a corroborating report

- GIVEN two reports with 70-90% similarity
- WHEN the second report is processed
- THEN a linked case is created and flagged for operator review

**Notes:** Uses pg_trgm fuzzy name matching + PostGIS distance + time window. See optimization doc Task 8D for algorithm.

---

## NON-FUNCTIONAL REQUIREMENTS

---

### NFR-001 · Alert latency
**Priority:** MUST
Report received → case in ops dashboard: ≤ 30 seconds (p99)
Operator approval → FLASH broadcast delivered: ≤ 60 seconds (p95)
**Note:** End-to-end report-to-broadcast time includes human approval and is not SLA-bound. Auto-approve mode available via `AUTO_APPROVE_FLASH=true` ENV flag for demo.

### NFR-002 · Availability
**Priority:** MUST
System uptime: ≥ 99.5% monthly
Alert engine (Crucix + n8n): must survive single service failure via Docker restart policy

### NFR-003 · Offline resilience
**Priority:** MUST
PWA must be usable with zero internet (cached alerts + queued submission) for at least 30 minutes

### NFR-004 · Privacy — no raw biometrics
**Priority:** MUST
Face images: processed into embedding vector (V2), source photo deleted within 72 hours (S3 lifecycle)
Subscriber phone numbers: stored AES-256-GCM encrypted (decryptable for SMS delivery). Encryption key in AWS Secrets Manager.
Reporter phone numbers: stored as SHA-256 hash only (for dedup, not delivery)
Location of safe houses and investigators: never logged or stored

### NFR-005 · Rate limiting
**Priority:** MUST
Public intake endpoints: max 3 requests per phone per hour
/api/reports: max 100 requests per IP per hour
USSD sessions: max 3 concurrent per phone

### NFR-006 · Language support
**Priority:** MUST
AI layer must handle: English, Hausa, Yoruba, Igbo, Nigerian Pidgin, and mixed/code-switched input
PWA UI must be available in: English, Hausa, Yoruba, Igbo

### NFR-007 · Low-bandwidth operation
**Priority:** MUST
PWA initial load: ≤ 500KB gzipped on first visit (3G) — Leaflet code-split to map page only
Alert card: no image lazy-load blocking text display
SMS messages: ≤ 160 characters (single SMS unit)

### NFR-008 · Audit trail
**Priority:** MUST
Every operator action (approve, suppress, case update) logged to DynamoDB with: operator_id, action, timestamp, IP address

### NFR-009 · False positive rate
**Priority:** SHOULD
Anti-fake detection + operator approval: combined false positive broadcast rate < 2%

### NFR-010 · Accessibility
**Priority:** SHOULD
PWA: WCAG 2.1 AA minimum
Colour contrast: all alert severity indicators must be distinguishable without colour alone (use icons + labels)

---

### NFR-011 · Concurrent report handling
**Priority:** MUST
System must handle ≥ 10 simultaneous report submissions without data loss.
Case ID generation must be collision-safe under concurrent INSERTs (guaranteed by `nextval()` sequence).

---

### NFR-012 · API error response format
**Priority:** MUST
All API endpoints must return consistent error format: `{ error: string, code: string, details?: object }`
HTTP status codes must follow REST conventions (400, 401, 404, 429, 500).

---

## OUT OF SCOPE (v1 Hackathon)

- Facial recognition from live camera feeds (V2)
- Drone integration (V2)
- Licence plate recognition (V2)
- Predictive hotspot AI model (V2)
- Cross-border ECOWAS expansion (V3)
- Radio/TV broadcast integration (V2)
- Insurance or enterprise API layer (V3)
- iOS native app (V2)
- Android native app (V2)
- Telecom CDR data integration (V3, regulatory approval required)

---

## CONSTRAINTS

| Type      | Constraint                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network   | Assume 2G/3G for all target users. No feature requiring >500KB payload for core functionality.                                                                                              |
| Language  | At minimum: English + Hausa for V1. Yoruba + Igbo in language selector but may have limited translation coverage.                                                                           |
| Device    | Core reporting functionality must be accessible via USSD and SMS. The system should not assume smartphone ownership or reliable internet connectivity in rural and underserved communities. |
| Legal     | No biometric data may be stored without explicit consent. Face images deleted post-processing.                                                                                              |
| Trust     | System must be operable without police involvement. Law enforcement integration is opt-in additive.                                                                                         |
| Hackathon | Vercel frontend deployment required. AWS RDS PostgreSQL or DynamoDB required. Qwen API must be demonstrably used.                                                                           |

---

## SUCCESS METRICS

| Metric                           | Target                     | How measured                           |
| -------------------------------- | -------------------------- | -------------------------------------- |
| Report-to-dashboard latency    | ≤ 30 seconds (p99)       | DynamoDB: `dashboard_at - received_at` |
| Approval-to-broadcast latency  | ≤ 60 seconds (p95)       | DynamoDB: `broadcast_at - approved_at` |
| SMS delivery rate                | ≥ 95%                      | Africa's Talking delivery report       |
| False positive alert rate        | < 2%                       | Suppressed / total approved ratio      |
| Multilingual extraction accuracy | ≥ 80% on test suite        | `__tests__/` pass rate                 |
| PWA Lighthouse score             | ≥ 90 PWA, ≥ 85 Performance | CI Lighthouse run                      |
| USSD completion rate             | ≥ 70% of started sessions  | AT session logs                        |
