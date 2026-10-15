# OpenAI Build Week 2026 — Execution Board

> **Single source of truth for this submission.** Update task status and the
> evidence link or commit after every completed task. This board is intentionally
> separate from `specs/todo.md`, which records the pre-existing RAVENCRY/Qwen
> work.

## Submission decision

- **Project:** RAVENCRY, meaningfully extended with the **Evidence Briefing Desk**.
- **Track:** Apps for Your Life.
- **Product promise:** turn fragmented multilingual reports, sightings, and OSINT
  into a source-linked case brief that a human responder reviews before an alert
  can be issued.
- **Non-negotiables:** no autonomous broadcast, no facial recognition, no
  untraceable model claims, and no feature that cannot be demonstrated live or
  from deterministic fixtures.
- **Deadline:** Tuesday, 21 July, 5:00 PM PDT / Wednesday, 22 July, 1:00 AM WAT.

## Repository and evidence rules

- Preserve the Qwen submission with a Git tag before Build Week feature work.
- Build the extension in this repository and on a Build Week integration branch;
  do **not** create a disconnected second project or a standalone Flutter app.
- Keep all implementation commits dated after 13 July 2026, and make the commits
  describe the feature rather than documentation-only changes.
- Use one pinned Codex thread for the majority of core functionality. Before
  submitting, run `/feedback` in that thread and copy the returned ID below.

| Evidence | Value | Owner | Status |
| --- | --- | --- | --- |
| Qwen preservation tag | `TBD` | Project lead | [ ] |
| Build Week branch | `TBD` | Project lead | [ ] |
| Primary Codex thread | `TBD` | Project lead + Codex | [ ] |
| `/feedback` Session ID | `TBD — copy exact value` | Project lead | [ ] |
| Build Week demo URL | `TBD` | Project lead | [ ] |
| Public/private repo test access | `TBD` | Project lead | [ ] |

## Scope contract — v1 only

### Inputs

1. A citizen report.
2. One or more sightings.
3. One or more OSINT items.

### Output: a reviewable evidence brief

The brief must show:

1. A chronological incident timeline.
2. Facts with source, capture time, and confidence.
3. Corroborations, contradictions, and unanswered questions.
4. Suggested verification steps and an operator decision gate.
5. The existing alert action remains unavailable until a human approves it.

### Explicitly out of scope

- New Flutter/mobile client, app-store release, or duplicate reporting flow.
- Prediction/heatmap claims, facial recognition, live police integration, or
  new third-party provider integrations.
- Rebuilding the existing PWA, USSD, notification, or OSINT systems.

## Critical path

| ID | Task | Owner | Depends on | Estimate | Status | Evidence / notes |
| --- | --- | --- | --- | ---: | --- | --- |
| BW-00 | Tag the current Qwen submission commit and create the Build Week integration branch. | Project lead | — | 15m | [ ] | Record tag and branch above. |
| BW-01 | Pin and rename the primary Codex thread: `Build Week — Evidence Briefing Desk`. Keep core implementation in this thread. | Project lead | — | 5m | [ ] | Thread is the `/feedback` evidence source. |
| BW-02 | Confirm the runtime-model decision and required credentials. The feature must be built with Codex/GPT-5.6; a GPT-5.6 runtime API is optional unless a valid API key and budget are confirmed. | Project lead + Codex | BW-01 | 20m | [ ] | Do not claim a runtime model that is not actually used. |
| BW-03 | Write the JSON brief contract, safety rules, and three deterministic case fixtures: corroborated, contradictory, and insufficient-evidence. | Codex + full-stack | BW-02 | 2h | [ ] | Schema and fixtures committed. |
| BW-04 | Implement the briefing service/API: assemble sources, generate/validate a structured brief, persist or return it, and fail safely. | Codex + full-stack | BW-03 | 5h | [ ] | Tests cover schema failure and missing evidence. |
| BW-05 | Implement the web Evidence Briefing Desk inside the existing web app: timeline, evidence ledger, contradictions, unknowns, and explicit human approval state. | Mobile dev + Codex | BW-03 | 5h | [ ] | Mobile-first browser screenshots, no Flutter dependency. |
| BW-06 | Wire one complete vertical slice: seeded report + sightings + OSINT -> brief -> operator approval -> existing alert flow. | Full-stack + Codex | BW-04, BW-05 | 4h | [ ] | One repeatable command or fixture script. |
| BW-07 | Add automated tests and a demo-reset path. Verify the project builds from a clean checkout. | Codex + full-stack | BW-06 | 3h | [ ] | Test output and setup instructions. |
| BW-08 | Run a hostile-demo rehearsal: missing source, contradictory location, model/API failure, and accidental double-approval. Fix only failures on the critical path. | Whole team | BW-07 | 2h | [ ] | Rehearsal notes and fixes committed. |
| BW-09 | Update README and `submission/` with a Build Week section that separates pre-existing RAVENCRY from this extension, explains Codex/GPT-5.6 collaboration truthfully, and gives judge test steps. | Codex + project lead | BW-07 | 2h | [ ] | Dated commits plus `/feedback` ID. |
| BW-10 | Record a sub-three-minute demo: report -> evidence brief -> human decision -> alert. Show one source/contradiction and one test result; do not narrate architecture for more than 20 seconds. | Project lead + mobile dev | BW-08, BW-09 | 3h | [ ] | Public YouTube URL. |
| BW-11 | Complete the Devpost draft, add all team members, share private repo access if needed, verify every link, then submit. | Project lead | BW-09, BW-10 | 1h | [ ] | Submission confirmation. |

## Ownership agreement

| Person | Primary responsibility | Must not own |
| --- | --- | --- |
| Project lead | Scope calls, credentials, Devpost, real-world demo rehearsal, final submit. | Last-minute feature expansion. |
| Full-stack developer | Data contract, API, fixture loading, tests, integration. | Rebuilding existing channels. |
| Mobile developer | Evidence Briefing Desk interaction design, responsive Next.js UI support, screenshots/video capture, mobile QA. | A parallel Flutter application. |
| Codex | Architecture, implementation support, test design, documentation, code review, and maintaining this board. | Inventing credentials, external accounts, or unverifiable claims. |

## Cut rules

- If BW-06 is not working by **Monday 20 July, 6:00 PM WAT**, remove optional
  persistence and generate the brief from deterministic fixtures.
- If runtime GPT-5.6 API access is not confirmed within 20 minutes, keep the
  existing supported provider for runtime behavior and document that Codex with
  GPT-5.6 built the extension. Do not spend hackathon time on billing setup.
- If a feature does not strengthen the one demo story, cut it.
- Freeze feature work after BW-08. The remaining time belongs to reliability,
  evidence, video, and submission.

## Daily checkpoint

At each checkpoint, post in the primary Codex thread:

1. Completed task IDs and commit hashes.
2. The one current blocker.
3. What will be cut if the next critical-path task slips.
