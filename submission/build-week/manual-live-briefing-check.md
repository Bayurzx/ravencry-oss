# Manual product check — live GPT briefing

Run this before recording the Build Week insert and again before submission.

## Safety boundary

`OPENAI_API_KEY` is server-only. Do not add it to a `NEXT_PUBLIC_` variable,
commit it, paste it into a browser console, or show it in the video.

## Local run

Open one terminal at the repository root and load the existing local server
environment. The `.env` file is intentionally not changed by this guide.

```powershell
loadenv .env
cd services\api
$env:DATABASE_URL = '<your local database URL>'
$env:DB_SSL = 'false'
$env:AUTO_APPROVE_FLASH = 'true'
$env:PORT = '3003'
npx tsx src/index.ts
```

In a second terminal:

```powershell
cd apps\web
$env:RAVENCRY_API_URL = 'http://localhost:3003'
npm run dev
```

Open these pages:

- `http://localhost:3000/evidence-desk` — deterministic fixture demo.
- `http://localhost:3000/evidence-desk/case/NR-2026-000001` — Fatima.
- `http://localhost:3000/evidence-desk/case/NR-2026-000002` — Yusuf.
- `http://localhost:3000/evidence-desk/case/NR-2026-000003` — Chioma.

## Expected live outcomes

| Case | Expected server decision | Approval control | What to inspect |
| --- | --- | --- | --- |
| Fatima | `ready_for_human_review` | Available only after briefing succeeds | report, witness, and OSINT source chips; no alert sent claim |
| Yusuf | `hold_for_more_evidence` | Disabled | conflicting locations and visible source chips |
| Chioma | `hold_for_more_evidence` | Disabled | missing evidence / unanswered questions |

## Checks

- [ ] Clicking **Prepare server-side evidence briefing** shows loading, then a
  model name, timestamp, summary, cited facts/conflicts, questions, and checks.
- [ ] Every source chip maps to a ledger source name; there is no unexplained
  source or raw reporter information.
- [ ] Fatima becomes eligible for human review only after a successful server
  response. Clicking approval says **No alert was sent by this desk.**
- [ ] Yusuf and Chioma remain unavailable for approval after their briefings.
- [ ] Stop the API or unset the key temporarily: the page shows only the safe
  **Briefing unavailable** message and no provider details.
- [ ] At 390px browser width, chips wrap, no content is clipped, and all buttons
  remain usable.
- [ ] `/evidence-desk` still has the three deterministic fixture scenarios and
  does not call the live briefing endpoint.

## Command-level smoke check

With both services running, this proves the browser-facing same-origin proxy:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/evidence-desk/cases/NR-2026-000001/brief
```

Expected fields include `operator_decision`, `human_approval_required`,
`corroborated_facts`, and source IDs. Never include the API key in the command
or in its output capture.
