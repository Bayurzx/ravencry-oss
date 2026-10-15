# RAVENCRY Evidence Briefing Desk

RAVENCRY helps a responder face the difficult moment before an alert: several
reports exist, they may not agree, and acting quickly is not the same as acting
well.

The Evidence Briefing Desk turns a case record, sightings, and OSINT signals
into a source-linked briefing that a human can inspect. It makes corroboration,
conflicts, unanswered questions, and the human decision boundary visible.

> **Product promise:** the model can explain the evidence. It cannot authorize,
> send, suppress, or broadcast an alert.

## What is in this Build Week extension

The project has two deliberately different paths.

| Path | Purpose | Needs credentials? |
| --- | --- | --- |
| `/evidence-desk` | Deterministic fixture demo with three repeatable safety states. | No |
| `/evidence-desk/case/[caseId]` | Live case-record view with a server-generated, cited briefing. | Yes, server-side only |

The fixture route is the fastest way to see the product promise. The live route
proves the vertical slice without pretending that a fixture is live data.

```mermaid
flowchart LR
  A[Redacted case record] --> D[Server-built evidence ledger]
  B[Sighting records] --> D
  C[OSINT signals] --> D
  D --> E[Strict GPT briefing]
  D --> F[Deterministic safety policy]
  E --> G[Evidence Briefing Desk]
  F --> G
  G --> H[Visible human review gate]
  H --> I[Separate existing alert workflow]
```

## The three safety states

The Desk includes deterministic fixtures and corresponding live demonstration
records. They make the correct operator response clear without relying on an
unexplained model score.

| Case | Evidence state | Expected decision | Approval control |
| --- | --- | --- | --- |
| Fatima, `NR-2026-000001` | Report, sighting, and OSINT signal converge on Fatima and Sabon Gari. | `ready_for_human_review` | Available only after a successful briefing |
| Yusuf, `NR-2026-000002` | Kaduna Central Mosque conflicts with Kawo Bus Stop. | `hold_for_more_evidence` | Unavailable |
| Chioma, `NR-2026-000003` | One low-detail report, no corroborating sighting. | `hold_for_more_evidence` | Unavailable |

Even the Fatima flow remains human-owned. Recording a review displays **“No
alert was sent by this desk.”** It does not dispatch a message or call an
external service.

## Architecture

### Source ledger

`GET /api/ops/cases/:id/evidence` builds an `EvidenceReadResponse` from the
existing RAVENCRY case, person, and sighting records.

- The case report appears once as evidence. The adapter does not fabricate a
  duplicate record.
- A sighting received through the OSINT channel remains `osint` and is labelled
  **OSINT signal** in the Desk.
- Reporter phone data and raw report text are excluded.
- Missing age remains missing. The UI renders **age not reported**, never
  **age 0**.
- Unanswered questions are generated deterministically from the ledger.

| File | Responsibility |
| --- | --- |
| `services/api/src/lib/evidence-ledger.ts` | Builds the redacted, typed ledger. |
| `services/api/src/routes/ops.ts` | Exposes the evidence and briefing routes. |
| `apps/web/evidence-desk/adapters.ts` | Maps an authorized ledger to the Desk scenario shape. |
| `apps/web/evidence-desk/EvidenceDesk.tsx` | Renders fixture and live Desk states. |
| `apps/web/app/evidence-desk/case/[caseId]/page.tsx` | Fetches live evidence on the Next.js server. |

### Server-side GPT briefing

`POST /api/ops/cases/:id/brief` is the only route that calls OpenAI. It accepts
no browser-supplied ledger or prompt. It builds the ledger on the server and
uses `OPENAI_API_KEY` only there.

The route uses:

- `gpt-4o-mini` by default, configurable with `OPENAI_MODEL`.
- Strict JSON Schema output, with no fallback values for blank fields.
- Exact source ID validation against the current ledger.
- A 20-second timeout.
- A generic `briefing_unavailable` response for every provider, parse, schema,
  or timeout failure.

The model generates a readable explanation. It does not determine whether a
case can move forward. `applySafetyPolicy` evaluates the ledger directly:

1. More than one distinct location claim holds the case.
2. A non-identity claim corroborated by two or more evidence items makes the
   case ready for human review.
3. Otherwise, the case remains on hold.

### Browser key boundary

The client posts only to this same-origin Next.js route:

```text
POST /api/evidence-desk/cases/[caseId]/brief
```

The proxy forwards the request to the Express API and returns only the safe,
structured briefing response. It never exposes `OPENAI_API_KEY`, internal API
URLs, raw reporter data, raw reports, or provider error details to the browser.

## Run it locally

### Prerequisites

- Node.js and the dependencies already installed for `apps/web` and
  `services/api`.
- Docker Desktop for the local PostgreSQL demonstration database.
- A local server environment containing `OPENAI_API_KEY` for the live briefing
  route. Do not commit it and never use a `NEXT_PUBLIC_` variable for it.
- The three seeded demonstration records in local PostgreSQL.

### 1. Run the credential-free fixture Desk

```powershell
cd apps\web
npm run dev
```

Open [http://localhost:3000/evidence-desk](http://localhost:3000/evidence-desk).
This route does not call OpenAI or require a database.

### 2. Start the local demonstration database

From the repository root:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d dev-postgres
```

The local database listens on port `5433`. Confirm that the three Build Week
cases exist before recording the live demo.

### 3. Start the API

In a separate terminal at the repository root, load the existing local server
environment with your normal secure method. The project lead uses
`loadenv .env`; do not paste or display secret values.

```powershell
loadenv .env
cd services\api
$env:DATABASE_URL = 'postgres://postgres:test@localhost:5433/ravencry'
$env:DB_SSL = 'false'
$env:AUTO_APPROVE_FLASH = 'true'
$env:PORT = '3003'
npx tsx src/index.ts
```

`AUTO_APPROVE_FLASH=true` is a hackathon-only authentication bypass for the
existing operator endpoints. It does not allow the Evidence Briefing Desk to
send an alert. With the flag disabled, the API uses its normal authentication
requirements.

### 4. Start the web app against the API

In another terminal:

```powershell
cd apps\web
$env:RAVENCRY_API_URL = 'http://localhost:3003'
npm run dev
```

Open the live paths:

```text
http://localhost:3000/evidence-desk/case/NR-2026-000001
http://localhost:3000/evidence-desk/case/NR-2026-000002
http://localhost:3000/evidence-desk/case/NR-2026-000003
```

Click **Prepare server-side evidence briefing**. The browser calls the
same-origin proxy, the server creates the briefing, and the UI shows validated
source chips, the operator decision, unanswered questions, and verification
steps.

## Manual product check

Run this sequence before the demo and before submission.

### Fixture route

- [ ] Fatima shows three source cards that converge on Fatima and Sabon Gari.
- [ ] **Ready for human review** and the review control are visible.
- [ ] Clicking the control shows **No alert was sent by this desk.**
- [ ] Yusuf shows Kaduna Central Mosque and Kawo Bus Stop as a conflict.
- [ ] Yusuf's approval control is unavailable.
- [ ] Chioma asks for more evidence and keeps approval unavailable.
- [ ] At a narrow phone width, source chips wrap, no content is clipped, and
  buttons remain usable.
- [ ] No button claims to send an alert or contacts a real external service.

### Live route

- [ ] Fatima becomes eligible for human review only after the server briefing
  succeeds.
- [ ] Yusuf and Chioma remain on hold after their server briefings.
- [ ] Each fact and conflict chip refers to a source in the visible ledger.
- [ ] Stopping the API or removing the server key produces only the safe
  **Briefing unavailable** state.
- [ ] Neither the browser nor the response exposes an API key, internal URL,
  raw report, reporter phone, or provider error detail.

You can also smoke-test the browser-facing proxy after both services are
running:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/evidence-desk/cases/NR-2026-000001/brief
```

Expected fields include `operator_decision`, `human_approval_required`,
`corroborated_facts`, and valid source IDs. Do not capture secret environment
values in terminal output or video.

## Codex and GPT-5.6 collaboration

Codex and GPT-5.6 accelerated the Build Week implementation and verification
work. They helped map the existing codebase, define the source contract,
identify the server-only key boundary, preserve OSINT provenance, remove a
duplicate adapter record, fix the missing-age display, design deterministic
safety rules, review the strict citation contract, and create the manual test
and demo evidence.

This is a development story, not a runtime-model claim. The demonstrated
runtime briefing model is **`gpt-4o-mini`**.

## Scope and safety boundaries

- The Desk does not autonomously send, approve, suppress, or broadcast alerts.
- The Desk does not use facial recognition.
- The fixture route is not represented as live data.
- The live route does not silently fall back to fixtures.
- Voice Relay is a separate local-first companion. It queues a report for human
  review and does not write to the live Desk ledger in this Build Week demo.
- The Qwen project baseline is preserved separately. This README describes the
  OpenAI Build Week Evidence Briefing Desk extension only.

## Submission evidence

| Evidence | Location |
| --- | --- |
| Director's script | `submission/build-week/BUILD-WEEK-DIRECTORS-SCRIPT.md` |
| Manual live check | `submission/build-week/manual-live-briefing-check.md` |
| Commit and verification trail | `submission/build-week/submission-evidence.md` |
| Devpost story draft | `submission/build-week/Devpost_Submission-STORY-DRAFT.md` |
| Primary Codex session ID | `019f7236-0bbe-7a53-8004-a61c7ebf4e12` |

RAVENCRY with Codex: Reports become evidence. Humans make the call.

## OpenAI Build Week 2026

This extension was built for **OpenAI Build Week**, 18–21 July 2026.

- **Track:** Apps for Your Life
- **Project:** RAVENCRY (existing missing-persons response system) extended with the Evidence Briefing Desk
- **Built with:** Codex · GPT-5.6 (development) · GPT-4o-mini (runtime)
- **Runtime briefing model:** `gpt-4o-mini` via strict JSON Schema, server-side only
- **Demo route:** `/evidence-desk` (fixtures) + `/evidence-desk/case/NR-2026-000001` (live)
- **Public URL:** [https://ravencry.cv](https://ravencry.cv) or [RAVENCRY](https://ravencry-web.vercel.app/)

The full Build Week submission and feature documentation: [apps/web/evidence-desk/README.md](apps/web/evidence-desk/README.md)

Feedback session ID: `019f7236-0bbe-7a53-8004-a61c7ebf4e12`
