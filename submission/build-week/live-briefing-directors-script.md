# Build Week — Live GPT briefing demo insert

**Length:** 35–50 seconds  
**Placement:** Immediately after the existing fixture-based Evidence Briefing
Desk segment in `submission/build-week-directors-script.md`.  
**Purpose:** Prove the extension is a live, source-linked vertical slice without
claiming that the model sends an alert.

## Before recording

1. Start the local database, API, and web app using the manual-check guide.
2. Confirm `OPENAI_API_KEY` is loaded only in the API terminal.
3. Open `/evidence-desk/case/NR-2026-000001` and make sure the page shows
   **RAVENCRY case-record mode**.
4. Keep the browser zoom at 100%. Start with no briefing generated.
5. If model latency creates a long pause, record the wait as a separate clip
   and cut it out. Do not fake the response or call the result deterministic.

| Time | On-screen direction | Audio / voiceover |
| --- | --- | --- |
| 0:00–0:05 | Open the **Fatima** live case page. Hold on **RAVENCRY case-record mode**, the three ledger sources, and **Prepare server-side evidence briefing**. | “The demo Desk used deterministic fixtures. This is the same interface connected to RAVENCRY’s redacted case ledger.” |
| 0:05–0:13 | Click **Prepare server-side evidence briefing**. Briefly show the loading state. | “The browser calls our own server. The server reads the redacted ledger, produces a structured briefing, and validates every cited source ID.” |
| 0:13–0:24 | Pause on the generated summary, source-name chips, and green **Ready for human review** server decision. | “For Fatima, the report, witness sighting, and OSINT signal corroborate the case. The server says only that it is ready for a human review.” |
| 0:24–0:30 | Show **Human approval is still required. This desk did not send an alert.** Then, optionally click the enabled approval control. | “This is not automatic outreach. Even here, a human review remains required and the Desk sends no alert.” |
| 0:30–0:41 | Cut to `/evidence-desk/case/NR-2026-000002`, generate the briefing, then pause on the conflicting-location content and red **Hold for more evidence** decision. | “For Yusuf, conflicting location evidence holds the case. The model can explain the evidence, but deterministic server rules keep approval unavailable.” |
| 0:41–0:47 | Hold on the disabled approval control and the source chips. | “Every conclusion remains tied to a visible source, and uncertainty stays visible to the responder.” |

## Recording checklist

- [ ] Fatima page visibly says **RAVENCRY case-record mode**.
- [ ] The generated panel identifies the runtime model as `gpt-4o-mini`.
- [ ] At least one fact shows readable source-name chips.
- [ ] Fatima shows **Ready for human review** only after the server briefing.
- [ ] Yusuf shows **Hold for more evidence** and disabled approval.
- [ ] The safety note **This desk did not send an alert** is legible.
- [ ] Do not say “GPT-5.6 runs the product.” Runtime is `gpt-4o-mini`.
- [ ] Do say Codex/GPT-5.6 accelerated the Build Week implementation, if that
  story is included elsewhere in the video.
