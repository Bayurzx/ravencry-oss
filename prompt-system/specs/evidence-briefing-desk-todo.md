# RAVENCRY Evidence Briefing Desk — Build Todo

> **Purpose:** Single source of truth for the new OpenAI Build Week extension.
> This is separate from the Qwen-era `todo.md` and from the mobile developer's
> Voice Relay todo. Update the status, proof, and owner whenever a task changes.

## What we are building

**Evidence Briefing Desk** turns a missing-person report, one or more sightings,
and OSINT signals into a reviewable case brief for a human responder.

It is deliberately **not** an autonomous alerting system. Every public alert
remains behind a visible human decision.

The demo story is:

```text
Report + sighting + OSINT
        ↓
Source-linked timeline
        ↓
Corroborations / contradictions / unknowns
        ↓
Human responder decides whether the existing alert workflow may proceed
```

## Code boundary

All feature implementation belongs in `apps/web/evidence-desk/`:

| File | Responsibility |
| --- | --- |
| `types.ts` | Typed evidence, claims, scenarios, and briefing contract |
| `fixtures.ts` | Three fictional deterministic cases |
| `briefing.ts` | Deterministic claim grouping, corroboration, conflict, and readiness logic |
| `EvidenceDesk.tsx` | Interactive desk UI and explicit human approval gate |
| `evidence-desk.module.css` | Self-contained desk styling |
| `README.md` | Local run and safety behavior |

`apps/web/app/evidence-desk/page.tsx` is the only integration file outside that
folder. It mounts the feature at `/evidence-desk`; it contains no business logic.

## Scope rules

- Use fictional deterministic data until the visual demo and manual verification
  are solid.
- No database migration, credentials, new external API, facial recognition,
  prediction, or automatic broadcast.
- Prefer repeatable manual integration checks over broad unit-test work.
- Add an automated check only if it prevents a concrete demo failure.
- Do not claim that GPT-5.6 is the deployed runtime model unless we actually add
  and verify that integration. The Build Week extension is being built with
  Codex/GPT-5.6.

## Task board

### ED-00 — Preserve the baseline

**Owner:** You

**Status:** [ ] TODO

- [x] Confirm which commit represents the submitted Qwen project.
- [x] Tag it, for example: `qwen-submission-2026-07-18`.
- [x] Switch implementation work to `build-week`.

**Proof:** Tag name recorded in `prompt-system/specs/build-week-2026.md`.

### ED-01 — Define the evidence contract and cases

**Owner:** Codex

**Status:** [x] DONE — 2026-07-18

- [x] Define typed evidence and claim records.
- [x] Create one corroborated case, one contradiction case, and one
  insufficient-evidence case.
- [x] Include timestamps, language, source names, confidence, and evidence IDs.

**Proof:** `apps/web/evidence-desk/types.ts` and `fixtures.ts`.

### ED-02 — Assemble a reviewable brief

**Owner:** Codex

**Status:** [x] DONE — 2026-07-18

- [x] Group claims by type and value.
- [x] Identify independently corroborated claims.
- [x] Identify conflicting values for the same claim type.
- [x] Produce unanswered questions, recommended steps, and a readiness state.

**Proof:** `apps/web/evidence-desk/briefing.ts`.

### ED-03 — Build the operator experience

**Owner:** Codex

**Status:** [x] CODE COMPLETE; manual review pending

- [x] Scenario switcher for the three demo cases.
- [x] Evidence timeline with source, language, time, confidence, and claims.
- [x] Decision brief separating facts, corroborations, contradictions, and
  questions.
- [x] Human-only approval control; unavailable when evidence is conflicting or
  insufficient.
- [x] Responsive, RAVENCRY-consistent styling.

**Proof:** `EvidenceDesk.tsx` and `evidence-desk.module.css`.

### ED-04 — Run the first manual product check

**Owner:** You + Codex

**Status:** [x] DONE — 2026-07-18 (time_window fix applied)

Run:

```powershell
cd apps\web
npm run dev
```

Open `http://localhost:3000/evidence-desk` and verify:

- [x] **Corroborated sighting:** the three sources share Fatima and Sabon Gari;
  approval becomes available. **FIXED (2026-07-18):** `briefing.ts` no longer
  treats different `time_window` values as contradictions.
- [x] **Conflicting locations:** Kaduna Central Mosque and Kawo Bus Stop appear
  as a conflict; approval is unavailable.
- [x] **Insufficient evidence:** one low-detail report asks for more information;
  approval is unavailable.
- [x] **Responsive check:** use browser device mode at a narrow phone width; no
  content is clipped and buttons remain usable.
- [x] **Safety check:** no button says an alert was sent or calls a real service.

**Definition of done:** You can show the three states without explanation and
each one makes the safe operator decision obvious.

### ED-05 — Make the demo path resettable

**Owner:** Codex

**Status:** [x] DONE — 2026-07-18

- [x] Add a one-click reset to the initial scenario state.
- [ ] Add a lightweight export/copyable brief summary for the demo — deferred;
  not on the critical path for Build Week demo.
- [x] Verify the human approval state resets when the scenario changes.

**Proof:** `EvidenceDesk.tsx` — `resetToCorroborated()` selects the first
scenario, clears approval, and shows the brief immediately. Scenario changes
already clear approval via `changeScenario()`.

**Definition of done:** A recording can be repeated from the same known state
without editing source code or data.

### ED-06 — Add one real RAVENCRY integration seam

**Owner:** Codex

**Status:** [x] DONE — 2026-07-18

- [x] Define an adapter interface that accepts report/sighting/OSINT inputs.
- [x] Keep the fixture adapter as the default for the demo.
- [x] Add a clearly labelled placeholder for mapping the existing API data into
  the contract; do not call an unverified production endpoint.

**Proof:** `apps/web/evidence-desk/adapters.ts` — `EvidenceDeskAdapter<TInput>`
interface, `ravencryInputAdapter` (typed placeholder, no network calls),
`fixtureEvidenceAdapter.getScenarios()` wired into `EvidenceDesk.tsx`.
Production build passes.

### ED-07 — Build and manual verification

**Owner:** Codex + you

**Status:** [x] DONE — 2026-07-19 (evidence-read endpoint added, build passes)

- [x] `npm run build` completed successfully in `apps/web`.
- [x] `GET /api/ops/cases/:id/evidence` endpoint added to `services/api/src/routes/ops.ts`.
  - Protected with `AUTO_APPROVE_FLASH` bypass guard (matches approve/suppress pattern).
  - Aggregates real `cases` + `persons` + `sightings` from PostgreSQL.
  - Deterministic unanswered questions (no LLM).
  - Reporter phone and raw report never returned.
- [x] `EvidenceDesk` accepts optional `liveScenario` prop. When present, hides fixture selector
  and shows "RAVENCRY case-record mode" badge. Null age renders as "age not reported."
- [x] `/evidence-desk/case/[caseId]` server page fetches from evidence endpoint,
  maps through `ravencryInputAdapter`, renders Desk with real data. Error state if API unavailable.
- [x] `/evidence-desk` stays fixture-backed and public.
- [x] `ravencryInputAdapter` no longer fabricates a duplicate case-record item;
  the endpoint includes the case report as the first evidence item.
- [ ] Capture a short screen recording of the corroborated and conflict paths.

**Proof:** `npm run build` passing, `npx tsc --noEmit` passing in `services/api`.
Aurora cases verified: NR-2026-000001 (Fatima, 2 sightings), NR-2026-000002 (Yusuf, 1 sighting),
NR-2026-000003 (Chioma, 0 sightings).

### ED-08 — Submission evidence

**Owner:** Codex + you

**Status:** [ ] TODO

- [ ] Add Build Week README section: baseline vs new work, feature behavior,
  setup, manual test steps, and truthful Codex/GPT-5.6 collaboration story.
- [ ] Retrieve `/feedback` ID from this primary Codex thread after core work.
- [ ] Record a <3-minute demo focused on the decision moment, not infrastructure.
- [ ] Confirm Devpost project, repo, video, and team-member checklist.

## Cut order

If time slips, cut in this order:

1. ED-06 live-data adapter; retain fixtures and explain the integration seam.
2. ED-05 brief export; retain reset and human gate.
3. Any cosmetic polish beyond responsive readability.

Do **not** cut the three scenarios, traceable source ledger, conflict handling,
or visible human approval gate. Those are the core judging story.

## Daily check-in format

```text
Evidence Desk — YYYY-MM-DD
Completed: ED-__
Proof: <build output / screenshot / commit>
Current blocker: <one concrete issue, or none>
Next: ED-__
Cut if delayed: <scope item>
```
