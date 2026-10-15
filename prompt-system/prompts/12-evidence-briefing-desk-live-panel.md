Implement the live GPT briefing panel in the existing Desk.

Do not edit `.env`, database schema, proxy route, or fixture behavior.

Modify only:
- apps/web/evidence-desk/EvidenceDesk.tsx
- apps/web/evidence-desk/evidence-desk.module.css

Use the existing same-origin endpoint:
POST /api/evidence-desk/cases/:caseId/brief

In `EvidenceDesk.tsx`:

1. Import `EvidenceBriefResponse` from `@/types`.

2. Add live-only state:
- briefing state: idle | loading | ready | error
- `serverBrief: EvidenceBriefResponse | null`

3. Only when `liveScenario` exists:
- replace the fake regenerate button behavior with:
  `Prepare server-side evidence briefing`
- POST to:
  `/api/evidence-desk/cases/${encodeURIComponent(scenario.caseId)}/brief`
- show a loading label while waiting;
- on failure show only:
  `Briefing unavailable. No alert was sent; review the source ledger manually.`
- never expose API/provider/internal error text.

4. Render a live-only panel after the case overview titled:
`GPT-assisted source briefing`

When a briefing is returned, show:
- `model` and local generated time;
- `operator_summary`;
- corroborated facts;
- conflicts;
- unanswered questions plus verification steps;
- `operator_decision` and `decision_reason`;
- fixed safety text:
  `Human approval is still required. This desk did not send an alert.`

5. For each fact and conflict, map `source_ids` against
`scenario.evidence` and render readable source-name chips.
Use `Unknown source` if an ID is unexpectedly missing; never crash.

6. Approval safety:
- Fixture mode remains exactly unchanged.
- In live mode, disable approval until a successful server briefing returns:
  `operator_decision === 'ready_for_human_review'`.
- Yusuf and Chioma must remain disabled.
- Fatima can become eligible only after the server briefing succeeds.
- Keep the existing “No alert was sent by this desk” disclaimer.

CSS:
- Add self-contained panel, source-chip, loading, error, and decision styles.
- At 390px width, all chips wrap and buttons remain usable.
- Green styling for ready-for-human-review; red/amber styling for hold state.

Verify:
1. `cd apps/web; npm run build`
2. Fatima live route → prepare briefing → cited panel visible → approval eligible.
3. Yusuf and Chioma → panel visible → approval unavailable.
4. `/evidence-desk` fixture page unchanged.
5. Narrow 390px viewport remains usable.