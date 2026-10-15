I would keep the narrator's "character" identical across all four acts. The only thing that changes is the amount of energy. The audience should feel like the same engineer is walking them through the system from beginning to end. That consistency will also make it much easier to blend with your own recorded narration.

---

# ACT 1 — Architecture

### Main Prompt

Generate a single-speaker voice narration.

**Voice:**
Male, around 35–45 years old. Deep, warm, calm, and confident. Neutral international English accent.

**Style:**
Technical documentary narration. The speaker is an experienced engineer explaining a production system with quiet confidence. Every sentence should sound intentional and precise.

**Emotion:**
Measured curiosity. Calm authority. Quiet pride in solid engineering rather than excitement. The delivery should feel grounded and trustworthy.

**Pacing:**
Speak at a steady conversational pace.
Pause naturally between paragraphs.
Slightly emphasize technical terms without becoming dramatic.
Keep the rhythm smooth because this narration will be joined with separately recorded audio.

Do not sound like:

* A commercial
* A keynote presenter
* A news reporter
* An AI assistant
* An audiobook narrator

### Scene

A clean engineering workspace. Large architecture diagrams fill multiple monitors. Infrastructure diagrams, service boundaries, and database schemas are visible. The atmosphere is calm, methodical, and professional.

### Sample Context

The audience has just understood the problem. Now the narrator begins explaining how the system is actually built, moving carefully through the architecture layer by layer.

### Recommended Settings

* **Accent:** Neutral
* **Style:** Empathetic
* **Pace:** Natural

| Time | Voiceover                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:08 | "Everything runs on PostgreSQL with PostGIS. That's our source of truth — persons, cases, subscribers, alerts, sightings, even session state and rate limiting. The geospatial queries for subscriber geofencing run right there in the database." |
| 0:16 | "Infrastructure is provisioned declaratively via Terraform — ECS compute, VPC, security groups. One command to stand up the entire environment. Reproducible, auditable, infrastructure-as-code."                                                  |
| 0:24 | "Fifteen deliberate migrations — not a generated schema. PostGIS for geofencing. Full referential integrity with foreign keys. Enum types for our state machine."                                                                                  |
| 0:31 | "Eleven Docker services orchestrated via Compose. Caddy handles TLS automatically. Every service is containerized — the entire stack starts with one command."                                                                                     |
| 0:36 | "PostgreSQL handles everything — structured data, geospatial queries, session state, rate limiting, audit logs. Single source of truth. No sprawl. Every migration is hand-written SQL, committed to the repo."                                    |
| 0:42 |                                                                                                                                                                                                                                                    |

---

# ACT 2 — AI Pipeline

### Main Prompt

Generate a single-speaker voice narration.

**Voice:**
Male, around 35–45 years old. Same voice and tone as the previous section.

**Style:**
Technical documentary narration with slightly more engagement as the intelligence of the system is revealed.

**Emotion:**
Focused. Curious. Analytical. The narrator sounds impressed by capability but never amazed by it. Confidence comes from engineering, not marketing.

**Pacing:**
Natural conversational rhythm.
Allow brief pauses after describing each processing stage.
Keep transitions smooth and continuous.

Do not sound like:

* A product advertisement
* A technology keynote
* A news broadcast
* An AI assistant

### Scene

The camera moves from architecture diagrams to the live AI pipeline. Reports flow into the system, languages are recognized, structured data appears, and classifications happen in real time.

### Sample Context

The infrastructure is now established. The narrator naturally shifts into explaining how intelligence is applied to every incoming report before it reaches human operators.

### Recommended Settings

* **Accent:** Neutral
* **Style:** Empathetic
* **Pace:** Natural

| Time | Voiceover                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:42 | "The AI pipeline runs on Qwen and processes reports in five Nigerian languages — Hausa, Yoruba, Igbo, Pidgin, and English — including code-switching."                                    |
| 0:48 | "Voice notes go through Whisper for transcription. Qwen extracts structured fields: name, age, location, circumstances."                                                                  |
| 0:54 | "A separate classification step determines severity — FLASH for child abductions and high-risk areas, PRIORITY for active cases, ROUTINE for lower-risk."                                 |
| 1:00 | "Anti-fake detection runs on every submission — recycled images, generic descriptions, missing specifics — all flagged before anything reaches the public."                               |
| 1:06 | "Here's a Hausa report — 'My son Ibrahim, 9 years old, was taken in Kano yesterday morning.' Qwen extracts the name, age, location, and circumstance — all structured, all in real time." |
| 1:18 |                                                                                                                                                                                           |

---

# ACT 3 — Full Flow

### Main Prompt

Generate a single-speaker voice narration.

**Voice:**
Male, around 35–45 years old. Maintain exactly the same vocal identity.

**Style:**
Documentary narration following a real operational sequence.

**Emotion:**
Quiet momentum. The narrator is walking the audience through events exactly as they happen. The growing importance comes naturally from the process itself, never from exaggerated delivery.

**Pacing:**
Natural pace.
Move slightly faster through procedural steps.
Slow down briefly when describing the public alert reaching nearby communities.
Maintain consistent vocal tone throughout.

Do not sound like:

* A commercial
* A movie trailer
* A sports commentator
* A news anchor

### Scene

The demonstration is now live. Reports move through the system, operators approve cases, alerts spread across multiple channels, and nearby communities begin receiving notifications within seconds.

### Sample Context

The architecture and AI pipeline are already understood. The narrator now follows a single report from submission through verification and public distribution so the audience can see the entire workflow unfold.

### Recommended Settings

* **Accent:** Neutral
* **Style:** Empathetic
* **Pace:** Natural

### 3A — Report via USSD (1:20–1:42, ~22s)

| Time | Voiceover                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1:20 | "A citizen reports through any channel. Here's USSD — for feature phones with zero internet. This reaches rural communities in the North where smartphones aren't common." |
| 1:25 | "Name, age, last known location, circumstances — four prompts. That's it. The report is in."                                                                               |
| 1:38 | "The case is created with status `pending_triage`. Now the AI takes over."                                                                                                 |
| 1:42 |                                                                                                                                                                            |

### 3B — AI Triage (1:42–1:55, ~13s)

| Time | Voiceover                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1:42 | "Qwen classifies this as FLASH — a child in Zamfara, a high-risk zone. The case status changes from pending_triage to pending_review. It's now in the operator queue." |
| 1:50 | "An operator reviews and approves. This triggers the broadcast pipeline — n8n orchestrates four parallel channels."                                                    |
| 1:55 |                                                                                                                                                                        |

### 3C — Broadcast Delivery (1:55–2:25, ~30s)

| Time | Voiceover                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1:55 | "Within seconds, the FLASH alert hits the Telegram alert channel — formatted with photo, case ID, last seen location, and instructions for reporting sightings." |
| 2:05 | "SMS goes out to all subscribers within a 160-kilometer geofence — using PostGIS `ST_DWithin` to target only people who can actually help in the search area."   |
| 2:12 | "The alert appears on the PWA alert feed in real time via SSE. Anyone near the search area sees it immediately. They can report a sighting with one tap."        |
| 2:20 | "Meanwhile, Crucix — our OSINT sweep engine — continuously polls five Nigeria-specific sources alongside citizen reports, creating a two-way intelligence loop." |
| 2:25 |                                                                                                                                                                  |

---

# ACT 4 — Craftsmanship & Closing

This deserves a noticeably different emotional treatment—but only by about **10–15%**. Don't suddenly become inspirational. Instead, sound like an engineer who has just finished demonstrating years of careful work.

### Main Prompt

Generate a single-speaker voice narration.

**Voice:**
Male, around 35–45 years old. Maintain exactly the same voice used throughout the documentary.

**Style:**
Reflective documentary narration.

**Emotion:**
Quiet satisfaction. Calm confidence. A subtle sense of purpose. The speaker believes the work matters but lets the demonstration speak for itself. Avoid sounding triumphant or promotional.

**Pacing:**
Speak slightly slower than the previous section.
Pause naturally after important engineering achievements.
Leave a slightly longer pause before saying "RAVENCRY."
Allow the final sentence to carry restrained optimism without becoming inspirational.
Maintain continuity with the opening narration.

Do not sound like:

* A startup pitch
* A commercial
* A motivational speaker
* A product launch
* An AI assistant

### Scene

The demonstration concludes. Architecture diagrams fade into the finished platform. Active alerts remain visible on the map as the system continues running. The room is quiet. The work speaks for itself.

### Sample Context

The audience has now watched the entire platform operate from beginning to end. The narrator closes by briefly reflecting on the engineering before returning emotionally to where the documentary began.

### Recommended Settings

* **Accent:** Neutral
* **Style:** Empathetic
* **Pace:** **The Drift**

| Time | Voiceover                                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2:25 | "Eleven Docker services, one command to deploy: `docker compose up -d`. Frontend on Vercel, compute on ECS, data on PostgreSQL with PostGIS."              |
| 2:32 | "Monorepo with shared TypeScript types, fifteen database migrations, and production Docker Compose. This is engineered to ship — not a weekend prototype." |
| 2:40 | "The hardest part isn't the disappearance. It's not knowing. And feeling like you're searching alone."                                                     |
| 2:46 | *(silence — let the text sit)*                                                                                                                             |
| 2:55 | "RAVENCRY — Report. Triage. Alert. Find. No one has to search alone."                                                                                      |

---

# Closing Voice-over (Cold Open Callback)

This should **not** be merged into Act 4.

It deserves its own generation because it mirrors the emotional weight of the opening. The audience now understands what those words mean—they've just seen RAVENCRY identify a case, classify it, geofence a 160 km radius, and alert thousands of people within seconds. The callback lands because the context has changed, not because the delivery becomes more dramatic.

### Main Prompt

Generate a single-speaker voice narration.

Use **exactly the same voice** established throughout the documentary.

**Voice:**
Male, around 35–45 years old. Deep, warm, calm, authentic. Neutral international English accent.

**Style:**
Cinematic documentary narration.

**Emotion:**
Reflective. Compassionate. Quiet hope. The grief remains, but it is no longer helpless. The speaker has just shown that a better response is possible. Let the hope remain understated.

**Pacing:**
Speak slowly.
Pause naturally after every sentence.
Leave slightly longer pauses after emotionally important lines.
Lower your voice slightly on **"It's not knowing."**
Allow the final sentence to lift very gently without sounding inspirational.

Do not sound like:

* A commercial
* A news reporter
* An AI assistant
* An audiobook narrator

### Scene

The system demonstration has ended. The operational screens slowly fade to black. The audience is left thinking not about technology, but about the families still waiting. The atmosphere is quiet, solemn, and deeply human.

### Sample Context

The audience has just watched the platform work from report submission to community-wide alerts. The narrator now returns to the opening reflection. The words are identical, but they carry new meaning because the audience has seen that people no longer have to search alone.

### Recommended Settings

* **Accent:** Neutral
* **Style:** Empathetic
* **Pace:** **The Drift**

This final callback should transition directly into a silent title card with **"So no one has to search alone."** The pause before the title card is as important as the narration itself, giving the audience a moment to connect the opening question with the demonstrated solution.
