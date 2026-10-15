# RAVENCRY — Director's Script: OpenAI Build Week Demo

## `submission/build-week/BUILD-WEEK-DIRECTORS-SCRIPT.md` · v2.0 · 2026-07-20

> **Target:** OpenAI Build Week · Evidence Briefing Desk extension  
> **Total running time:** 2:25–2:40 (target 2:34)  
> **Format:** 1080p, 16:9, 30fps. Record screen clips with Windows `Win + Alt + R`; edit in Canva.  
> **Voiceover:** Record separately, then align to the on-screen timings.  
> **Rule:** Runtime briefing uses `gpt-4o-mini`. Codex/GPT-5.6 accelerated the Build Week development work; do not call GPT-5.6 the deployed runtime model.

---

## PRE-FLIGHT CHECKLIST (10 minutes before recording)

- [ ] Close notifications, hide bookmarks, use browser zoom 100%, and use a clean dark terminal.
- [ ] Have your existing Canva cold-open and closing assets ready.
- [ ] Have the mobile developer's **20-second maximum** Voice Relay clip ready. It must show **queued for human review**, not sent/delivered/broadcast.
- [ ] Keep the mobile clip separate from the Desk: it is a local-first companion demo, not a claim that it writes into the live case ledger.
- [ ] Docker PostgreSQL is running and contains the three demo records.
- [ ] API terminal is started with the server-only environment loaded. Never show `.env`, the key, or terminal environment values.
- [ ] Web terminal is started with `RAVENCRY_API_URL=http://localhost:3003`.
- [ ] Browser tabs are pre-opened, in this order:
  - Voice Relay video clip (or the teammate's supplied recording)
  - `http://localhost:3000/evidence-desk`
  - `http://localhost:3000/evidence-desk/case/NR-2026-000001`
  - `http://localhost:3000/evidence-desk/case/NR-2026-000002`
  - a terminal with successful `npm run build` / `npx tsc --noEmit` output already visible
- [ ] Confirm Fatima and Yusuf live briefings once before recording. Record model wait time as a separate clip and cut it out if needed; never fake a response.
- [ ] Dry-run the voiceover once. Keep the final upload under three minutes.

---

## SHOT-BY-SHOT BREAKDOWN

---

### ACT 0 — COLD OPEN (0:00–0:06, ~6s)

> **SPEED: 1×. VISUAL: Reuse your existing Canva opening asset.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 0:00–0:06 | Black / Canva opening asset. Text: **“When reports conflict, speed alone is not enough.”** | “In the first hours of a missing-person case, the hard part is not just receiving a report. It is knowing what evidence can be trusted.” |

---

### ACT 1 — VOICE RELAY, LOCAL-FIRST INTAKE (0:06–0:26, ~20s)

> **SPEED: 1×. VISUAL: Use the mobile teammate's supplied clip. Do not show it as a live Desk integration.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 0:06–0:15 | Show the mobile app entering the text/voice sighting, language, location, and consent state. | “Voice Relay is our local-first companion for a sighting captured as text or voice, with language, location, and consent kept with the report.” |
| 0:15–0:22 | Submit and hold on the queue result: **Saved for human review** / **queued for human review**. | “It queues the report for human review. It does not claim delivery, contact emergency services, or trigger an alert.” |
| 0:22–0:26 | Hold on the safe result, then cut cleanly to the browser. | “That safety boundary carries through the rest of RAVENCRY.” |

---

### ACT 2 — DETERMINISTIC DECISION DESK (0:26–1:14, ~48s)

> **SPEED: 1×. VISUAL: Record the existing fixture Desk sequence again.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 0:26–0:31 | Open `/evidence-desk`; click **Reset demo to corroborated case**. Keep Fatima and the three source cards visible. | “The Evidence Briefing Desk brings fragmented reports into one source-linked briefing for a responder.” |
| 0:31–0:42 | Move through the report, sighting, and community/OSINT source cards. Pause on Fatima and Sabon Gari. | “Here, independent sources converge on Fatima and Sabon Gari. The Desk separates evidence from the questions that remain.” |
| 0:42–0:51 | Show **Ready for human review**, corroborations, and the enabled approval control. | “The safe decision is obvious: this case is ready for a human review, not an automatic broadcast.” |
| 0:51–0:57 | Click approval. Pause on **No alert was sent by this desk.** | “Recording the review does not send an alert. The existing approved workflow remains a separate human step.” |
| 0:57–1:08 | Switch to **Conflicting locations**. Show Kaduna Central Mosque, Kawo Bus Stop, and disabled approval. | “When locations conflict, RAVENCRY exposes both claims, asks for verification, and blocks approval.” |
| 1:08–1:14 | Reset to Fatima. Hold on operator gate. | “The demo is resettable because a safety-critical decision must be repeatable.” |

---

### ACT 3 — LIVE, CITED GPT BRIEFING (1:14–2:01, ~47s)

> **SPEED: 1× on the result. Record loading separately and cut excess waiting.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 1:14–1:20 | Open Fatima's live path: `/evidence-desk/case/NR-2026-000001`. Hold on **RAVENCRY case-record mode** and **Prepare server-side evidence briefing**. | “The same Desk also has a live case-record path, backed by RAVENCRY’s redacted report, sighting, and OSINT ledger.” |
| 1:20–1:27 | Click **Prepare server-side evidence briefing**. Show a brief loading moment. | “The browser calls our server. The server reads that ledger and requests a structured briefing; the key never reaches the browser.” |
| 1:27–1:39 | Pause on the GPT-assisted summary, readable source chips, model label, and green **Ready for human review** decision. | “For Fatima, every generated finding cites a visible source. The server independently confirms that corroborated evidence is ready for a human review.” |
| 1:39–1:44 | Show **Human approval is still required. This desk did not send an alert.** Optionally click the enabled approval control. | “The model explains evidence. It does not authorize or send an alert.” |
| 1:44–1:56 | Cut to Yusuf: `/evidence-desk/case/NR-2026-000002`. Generate the briefing and pause on the conflict / red hold decision. | “For Yusuf, conflicting locations hold the case. The server’s deterministic safety policy keeps approval unavailable.” |
| 1:56–2:01 | Hold on the disabled approval control and source chips. | “Uncertainty stays visible, traceable, and human-owned.” |

---

### ACT 4 — HOW WE BUILT AND VERIFIED IT (2:01–2:24, ~23s)

> **SPEED: 1.25× on terminal scroll. Do not show secrets, `.env`, or raw model prompts.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 2:01–2:09 | Show the clean `npm run build` output for `apps/web`, then `npx tsc --noEmit` for `services/api`. | “We used Codex and GPT-5.6 throughout Build Week to map the existing codebase, define the evidence contract, build the live bridge, and verify the product.” |
| 2:09–2:17 | Show `git log --oneline` with the Build Week commits or the `submission/build-week/` evidence folder. | “The Qwen submission baseline is preserved. The new work is a traceable extension with typed source records, strict citation validation, and a visible human gate.” |
| 2:17–2:24 | Return to the live Desk safety decision. | “The demonstrated runtime briefing model is gpt-4o-mini. Codex and GPT-5.6 accelerated the development and verification work.” |

---

### ACT 5 — CLOSE (2:24–2:34, ~10s)

> **SPEED: 1×. VISUAL: Reuse your existing Canva ending asset.**

| Time | Visual | Voiceover |
| --- | --- | --- |
| 2:24–2:34 | Canva ending. Text: **“RAVENCRY — Evidence first. Human decision always.”** | “RAVENCRY helps responders act on evidence, not assumption. Every source stays visible. Every alert remains human.” |

---

## SPEED-UP MAP

| Section | Speed | Why |
| --- | --- | --- |
| Cold open / close | 1× | Use the existing visual assets cleanly. |
| Voice Relay | 1× | The safety copy must remain readable. |
| Fixture Desk | 1× | The operator decision is the core story. |
| Live briefing | 1× on result | Do not accelerate source chips or safety decision. |
| Build proof | 1.25× terminal scroll | Keep the proof readable without wasting time. |

---

## RECORDING CUES — WINDOWS GAME BAR

1. Open the exact tab or clip named in the next row above.
2. Take a breath, move the cursor to a neutral corner, then press **`Win + Alt + R`**.
3. Wait one second before the first click. Perform only the actions in that row.
4. Press **`Win + Alt + R`** again to stop. Name the clip by act and take, for example `BW-ACT3-Fatima-take1.mp4`.
5. Record Fatima and Yusuf as separate clips. Canva can cut out model waiting without misrepresenting the generated result.

## WHAT NOT TO SHOW OR SAY

- No API key, `.env`, raw reporter phone, raw report, or provider error.
- No phrase implying the Voice Relay prototype is already writing into the live Desk database.
- No phrase saying GPT-5.6 is the runtime model; it is `gpt-4o-mini`.
- No phrase claiming that the Desk sent, approved, or broadcast an alert.
- No unscripted live terminal typing if a clean pre-recorded build result is clearer.

---

## COMPILED VOICEOVER SCRIPT

> Read calmly. This is approximately 330–360 words, fitting the target running time with breathing room for screen actions.

In the first hours of a missing-person case, the hard part is not just receiving a report. It is knowing what evidence can be trusted.

Voice Relay is our local-first companion for a sighting captured as text or voice, with language, location, and consent kept with the report. It queues the report for human review. It does not claim delivery, contact emergency services, or trigger an alert.

The Evidence Briefing Desk brings fragmented reports into one source-linked briefing for a responder. Independent sources converge on Fatima and Sabon Gari. The Desk separates evidence from the questions that remain. This case is ready for a human review, not an automatic broadcast. Recording the review does not send an alert. The existing approved workflow remains a separate human step.

When locations conflict, RAVENCRY exposes both claims, asks for verification, and blocks approval. The demo is resettable because a safety-critical decision must be repeatable.

The same Desk also has a live case-record path, backed by RAVENCRY's redacted report, sighting, and OSINT ledger. The browser calls our server. The server requests a structured briefing, and the key never reaches the browser.

For Fatima, every generated finding cites a visible source. The server independently confirms that corroborated evidence is ready for a human review. The model explains evidence. It does not authorize or send an alert.

For Yusuf, conflicting locations hold the case. The server's deterministic safety policy keeps approval unavailable. Uncertainty stays visible, traceable, and human-owned.

We used Codex and GPT-5.6 throughout Build Week to map the existing codebase, define the evidence contract, build the live bridge, and verify the product. The demonstrated runtime briefing model is gpt-4o-mini.

RAVENCRY helps responders act on evidence, not assumption. Every source stays visible. Every alert remains human.
