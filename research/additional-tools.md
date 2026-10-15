# RAVENCRY — Additional Tools & Open Source Reference
## Discovered resources not in the original stack. Add only what earns its place.

---

## IMMEDIATE (act on these before hackathon submission)

---

### pgvector
**What:** PostgreSQL extension for vector similarity search. Turns Aurora into a vector database — no separate Pinecone or Weaviate needed.
**Why RAVENCRY needs it:** The `face_embedding VECTOR(512)` column in `persons` table is inert without it. Enables sighting-to-person face matching at V2 with zero infrastructure change.
**Effort:** One line in migration `001_extensions.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Aurora PostgreSQL v3+ supports it natively. Add HNSW index when face data exists:
```sql
CREATE INDEX ON persons USING hnsw (face_embedding vector_cosine_ops);
```
**Action:** Add to T-011. Do it now — costs nothing, pays off at V2.
**Repo:** github.com/pgvector/pgvector | License: PostgreSQL (permissive)

---

### Common Alerting Protocol (CAP)
**What:** An OASIS/ITU XML standard for emergency alerts. One message format that distributes simultaneously across SMS, cell broadcast, radio, TV, Google Public Alerts, and any CAP-compatible government system.
**Why RAVENCRY needs it:** Nigeria already has a CAP implementation referenced in international records. If RAVENCRY emits FLASH alerts as CAP-formatted XML, they are immediately consumable by NAPTIP's system, NiMet, and any future cell broadcast infrastructure — without custom integration work per channel.
**Hackathon angle:** "RAVENCRY is CAP-compliant" is a one-line differentiator that signals government-readiness to judges. No other Nigerian safety app does this.
**Effort:** Low. CAP is well-documented XML. A Node.js serialiser is under 50 lines. Format the FLASH alert payload as CAP before posting to the NAPTIP webhook — same data, different envelope.
**Minimal CAP alert structure:**
```xml
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>{case_id}</identifier>
  <sender>ravencry@ravencry.ng</sender>
  <sent>{ISO_timestamp}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>en-NG</language>
    <category>Security</category>
    <event>Missing Person / Abduction</event>
    <urgency>Immediate</urgency>
    <severity>Extreme</severity>
    <certainty>Observed</certainty>
    <headline>{person_name}, {age}, last seen {last_seen_location}</headline>
    <description>{full_description}</description>
    <area>
      <areaDesc>{last_seen_lga}, {last_seen_state}</areaDesc>
      <circle>{lat},{lng} 160</circle>
    </area>
  </info>
</alert>
```
**Reference:** oasis-open.org/standard/cap | undrr.org/early-warnings-for-all/common-alerting-protocol

---

## V2 CANDIDATES (evaluate after hackathon)

---

### Ushahidi
**What:** Open-source crisis crowdsourcing and mapping platform. Born in Kenya 2008. Collects reports via SMS, web, email — geomaps them in real time. Used across Africa.
**Why relevant:** The most direct open-source precedent for RAVENCRY's citizen intake and sighting map. Battle-tested in African crisis contexts. Has a Nigerian community.
**What it lacks vs RAVENCRY:** No AI triage, no USSD, no alert broadcast, no multilingual LLM, no geofenced SMS.
**Use case:** Fork Ushahidi's map visualisation components for the RAVENCRY alert map instead of building from scratch. Or use it as the public-facing sighting submission layer in V2 when NGO partners need a familiar tool.
**Repo:** github.com/ushahidi/platform | License: AGPL-3.0
**Hosted option:** ushahidi.com (free tier available for pilots)

---

### Resgrid
**What:** Open-source AI-native Computer Aided Dispatch (CAD) platform for first responders. Manages calls, personnel, and unit dispatch through natural language on SMS, WhatsApp, Telegram, Slack, Discord, or web.
**Why relevant:** Natural language dispatch via Telegram is exactly what the RAVENCRY investigator/responder coordination layer needs. Handles: incident creation, unit status, personnel tracking, shift management, AVL (automatic vehicle location).
**Potential role:** Replace the custom Appsmith ops dashboard at V2. Instead of building case assignment and responder coordination from scratch, Resgrid handles it — and its Telegram integration means responders never need a separate app.
**Limitation:** Built on .NET/Windows stack. Self-hosting requires a Windows Server or Docker on Windows container. Evaluate whether this fits the EC2 Ubuntu setup before committing.
**Repo:** github.com/Resgrid/Core | License: Apache 2.0
**Hosted option:** resgrid.com (free plan, no contract)

---

### Sahana EDEN
**What:** World's most deployed open-source humanitarian information management system. MIT licence (as of May 2025 rebrand to Eden ASP). Core strength: beneficiary case management, multi-org coordination, missing persons tracking.
**Why relevant:** Sahana has a dedicated missing persons module with case lifecycle management more mature than anything we would build in a hackathon. Deployed in 50+ countries, 42 languages.
**Potential role:** At V2, when RAVENCRY partners with NGOs (Red Cross Nigeria, NAPTIP, civil society), Sahana becomes the shared case management backend — with RAVENCRY as the alert and intake layer that feeds into it.
**Not for hackathon:** Setup complexity is too high for a 3-day build. Evaluate post-submission as the long-term case management spine.
**Repo:** github.com/sahana/eden | License: MIT
**Foundation:** sahanafoundation.org

---

### OpenBroadcaster
**What:** Open-source suite for unattended broadcasting of emergency messages over radio, TV, streaming, and digital signage. Originally built for Africa via wind-up radio. CAP-compatible.
**Why relevant:** Enables the V2 "radio/TV broadcast" feature — automatically push RAVENCRY FLASH alerts to NTA, Channels TV, and Hausa radio stations. Pairs directly with the CAP layer above: if RAVENCRY emits CAP, OpenBroadcaster picks it up with no custom integration.
**Dependency:** Requires the CAP layer to be implemented first. Do CAP, then this.
**Repo:** github.com/openbroadcaster | License: AGPL-3.0

---

## REFERENCE ONLY (no action needed)

---

### FEMA IPAWS / CAP Editor (WMO)
Government-grade CAP tooling. Useful for understanding how NAPTIP's existing system likely expects CAP-formatted input. Not for self-hosting.
Reference: undrr.org/early-warnings-for-all/common-alerting-protocol

### FreeGenie
A Linux-based open-source missing persons database and tracker. Niche, low activity, not maintained at production quality. Noted for awareness only.

---

## CHANGELOG
| Date | Note |
|---|---|
| Initial | Created from research session. pgvector and CAP flagged as immediate actions. |
