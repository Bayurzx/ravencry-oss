# Build Week submission evidence

## Baseline and extension trail

| Evidence | Verified value |
| --- | --- |
| Preserved Qwen baseline tags | `qwen-submission-2026-07-18`, `qwen-final-submission-2026-07-19` |
| Build Week branch | `build-week` |
| Live source bridge commit | `c10f7e9` |
| GPT ledger/briefing commit | `90a24ad` |
| Same-origin briefing proxy commit | `25a73d0` |
| Current uncommitted UI work | Live GPT briefing panel and styles; review and commit before submission |

## Verified runtime evidence — 2026-07-20

The end-to-end proxy returned structured `gpt-4o-mini` briefings for Fatima,
Yusuf, and Chioma. Each response had valid ledger source IDs, no blank fact or
conflict fields, `human_approval_required: true`, and no key/provider/internal
URL leakage.

| Case | Decision |
| --- | --- |
| `NR-2026-000001` / Fatima | `ready_for_human_review` |
| `NR-2026-000002` / Yusuf | `hold_for_more_evidence` |
| `NR-2026-000003` / Chioma | `hold_for_more_evidence` |

Web production build and API TypeScript check passed during this verification.

## Final owner checklist

- [ ] Review the live Desk diff, then commit only Build Week changes.
- [ ] Update the main README using `readme-build-week-section.md`, preserving
  the distinction between the Qwen baseline, Codex/GPT-5.6 development work,
  and `gpt-4o-mini` runtime briefing.
- [ ] Record the insert using `live-briefing-directors-script.md` and splice it
  into the public Build Week video. Keep final duration below three minutes.
- [ ] Run `manual-live-briefing-check.md` once immediately before recording.
- [ ] Run `/feedback` in the primary Build Week Codex task and paste the exact
  Session ID here: `TBD`.
- [ ] Create/update the separate OpenAI Build Week Devpost entry; do not reuse
  the Qwen submission text as if it described this extension.
- [ ] Add/confirm every team member and their accepted invitation.
- [ ] If the repository is private, grant the required judging accounts access
  before the deadline.
- [ ] Verify the public YouTube URL, repo URL, model-use narrative, and manual
  test instructions from a clean browser session.
