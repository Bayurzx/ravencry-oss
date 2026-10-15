# README source — OpenAI Build Week extension

Adapt this verified material into the repository README in the team’s own voice.
Keep the Qwen Hackathon description separate from this Build Week extension.

## What changed for OpenAI Build Week

RAVENCRY was extended with the **Evidence Briefing Desk**: a responder-facing
screen that turns a case report, sightings, and OSINT signals into a
source-linked case brief. It makes corroboration, conflicts, and unanswered
questions visible before an operator can proceed with the existing alert
workflow.

The extension has two deliberately separate modes:

- `/evidence-desk` is a deterministic, public fixture demo with corroborated,
  conflicting, and insufficient-evidence cases.
- `/evidence-desk/case/[caseId]` is the live case-record path. It reads a
  redacted source ledger from RAVENCRY’s API and can request a server-side,
  structured briefing.

The live briefing path is:

```text
Browser Desk
  → same-origin Next.js proxy
  → RAVENCRY Express API
  → redacted case / sighting / OSINT ledger
  → gpt-4o-mini structured output
  → cited briefing + deterministic server decision
```

No OpenAI key is sent to the browser. The API uses `OPENAI_API_KEY` only in its
server environment. The briefing is source-cited and is rejected if it contains
unknown, blank, or malformed citations.

## Safety model

The language model explains the supplied ledger; it does not decide whether an
alert should be sent. Server-side deterministic rules decide whether the case
is ready for human review:

- multiple location values hold the case;
- a non-identity claim needs support from at least two evidence items;
- all outcomes retain `human_approval_required: true`.

The Desk itself never sends, approves, suppresses, or broadcasts an alert. Its
approval control records a local review state and explicitly states that no
alert was sent.

## Build Week verification

The verified cases are:

| Case | Server result |
| --- | --- |
| Fatima (`NR-2026-000001`) | `ready_for_human_review` |
| Yusuf (`NR-2026-000002`) | `hold_for_more_evidence` |
| Chioma (`NR-2026-000003`) | `hold_for_more_evidence` |

For all three, the returned source IDs resolved to the real ledger, no blank
fact/conflict fields were returned, and no key, internal URL, or provider error
was exposed to the browser-facing response.

## How Codex and GPT-5.6 were used

Codex was used throughout the Build Week extension to inspect the existing
monorepo, define the evidence contract, design deterministic fixture cases,
implement the source-ledger adapter and live API seam, build the responsive
Desk, identify safety boundaries, and run integration verification.

The key human-directed decisions were to keep the Qwen baseline separate, use
fixtures before introducing live data, retain a visible human approval gate,
validate citations, and move the runtime key entirely to the server.

Codex/GPT-5.6 accelerated development and verification. The demonstrated
runtime briefing model is **`gpt-4o-mini`**, not GPT-5.6. This distinction is
intentional and should be preserved in the Devpost submission and video.
