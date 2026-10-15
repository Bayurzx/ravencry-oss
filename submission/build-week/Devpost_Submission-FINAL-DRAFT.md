# RAVENCRY — OpenAI Build Week Devpost Submission

> Finalise the bracketed Devpost fields, then rewrite this in the team's own
> voice before pasting it into Devpost. The facts, model names, and safety
> claims below match the implementation and demo.

## Project name

RAVENCRY

## Elevator pitch

RAVENCRY with Codex. Reports become evidence. Humans make the call.
---

## Inspiration

Before RAVENCRY had a database, it had a bird.

We watched the raven: alert, social, watchful. A raven does not make a warning
for itself. Its call makes the flock look again. That image stayed with us
because a missing-person report is also a call that asks a community to look.
In Nigeria, those calls arrive through different people, different languages,
and different levels of certainty. A worried family member may know one thing.
A witness may see another. A radio mention or OSINT signal may point somewhere
else entirely.

The temptation is to move faster than the uncertainty. That is how a useful
warning becomes noise, panic, or harm. We wanted to build the moment before
the alert: a place where someone can lay the evidence out, see where it agrees,
see where it breaks apart, and make a responsible human decision.

RAVENCRY began as a multi-channel reporting and alerting system in our Qwen
hackathon work. For OpenAI Build Week, we asked a sharper question: what should
happen when the reports do not agree? The answer became the Evidence Briefing
Desk.

---

## What it does

The Evidence Briefing Desk has two honest modes:

1. **Repeatable safety demo.** Three deterministic cases make the operator
   decision obvious: corroborated evidence is ready for human review,
   conflicting locations are held, and thin evidence asks for more information.
2. **Live case-record mode.** A server route reads a real RAVENCRY case,
   person, and sighting ledger, redacts sensitive reporter data, and preserves
   whether a source came from a report, sighting, or OSINT signal.

For a live case, the browser asks our server to prepare a structured briefing.
The server sends the redacted ledger to the OpenAI API and returns a source
linked summary, corroborated facts, conflicts, unanswered questions, and
verification steps. Every cited source ID is checked against that case's ledger
before the result reaches the browser.

The Desk has a visible human decision gate:

- Fatima's report, sighting, and OSINT evidence produce
  `ready_for_human_review`.
- Yusuf's Kaduna Central Mosque and Kawo Bus Stop claims produce
  `hold_for_more_evidence`; approval stays unavailable.
- Chioma's one low-detail report also stays on hold.

The model can explain the evidence; it cannot authorize, send, suppress, or
broadcast an alert. Even recording a human review visibly confirms: **“No
alert was sent by this desk.”**

---

## How we built it

For Build Week, we built the new Desk as a traceable extension on a separate branch.

- **Source bridge:** an Express endpoint constructs a typed evidence ledger
  from RAVENCRY case, person, and sighting records. It excludes raw reports and
  reporter phone data, and labels OSINT provenance rather than flattening it
  into an anonymous sighting.
- **Structured server briefing:** a second server endpoint calls the OpenAI
  API with `gpt-4o-mini`, a strict JSON Schema, a 20-second timeout, and no
  client-provided prompt or ledger. `OPENAI_API_KEY` exists only on the server;
  a same-origin Next.js proxy means it never reaches the browser.
- **Safety controls outside the model:** strict validation rejects blank,
  uncited, or unknown-source output. A deterministic server policy calculates
  whether corroboration is sufficient and blocks contradictory locations. The
  model response is never used to decide approval eligibility.
- **Operator interface:** a Next.js Evidence Briefing Desk renders source cards,
  readable citation chips, unanswered questions, briefing state, and an
  explicit approval gate. The original fixture route stays public and
  repeatable; the live case route never silently falls back to fixtures.
- **Verification:** we built the web production bundle, type-checked the API,
  and made live requests for Fatima, Yusuf, and Chioma. All three returned only
  valid ledger citations, required human approval, and exposed no key, provider
  details, internal URL, raw report, or reporter phone.

### How Codex and GPT-5.6 accelerated our Build Week work

We used Codex with GPT-5.6 as an active development collaborator, not as a
runtime feature. It helped us map a large existing monorepo, define the shared
evidence contract, isolate the live source bridge from deterministic demo
fixtures, identify the server-only key boundary, and review the failure modes
that matter in an operator decision surface. It also helped turn our checks,
Git trail, and screen-recording plan into a reproducible submission packet.

The deployed demonstration model is **`gpt-4o-mini`**. GPT-5.6 was used through
Codex to accelerate implementation and verification, not to generate an
untraceable live decision.

---

## Challenges we ran into

**A fluent answer is not evidence.** Our first risk was treating a convincing
summary as a safe one. We moved the approval rule outside the model, require
every finding to cite IDs from the server-built ledger, and reject malformed or
unknown citations.

**Provenance disappears easily.** A sighting and an OSINT signal can look alike
after a simple database join. We added explicit source kinds so the interface
can show where a claim came from instead of implying all sources have equal
weight.

**Live AI adds delay and a new failure mode.** The briefing call has a hard
timeout and a generic safe failure state. If it is unavailable, the Desk does
not invent a result or open approval.

**We had to extend without rewriting history.** RAVENCRY's prior Qwen
submission remains preserved by Git tags. We kept its claims and artifacts
separate from the new OpenAI Build Week evidence trail, model disclosure, and
demo.

---

## Accomplishments that we're proud of

- A complete vertical slice from real, redacted RAVENCRY records to a
  server-generated, source-linked briefing in the operator UI.
- Three repeatable cases that demonstrate the safe choice without needing the
  viewer to trust a black box.
- A server-only OpenAI integration with strict JSON Schema, source-citation
  validation, a timeout, and generic error handling.
- A deterministic human-approval policy that can hold a case even when the
  model produces a useful explanation.
- A responsive Desk that retains usable controls and wrapped source chips at a
  narrow mobile width.
- An honest demo boundary: neither the Evidence Briefing Desk nor the Voice
  Relay prototype sends an alert or contacts a real external emergency service.

---

## What we learned

**Safety needs an interface, not a disclaimer.** A small line of text is easy
to miss. A disabled approval control, visible conflicting locations, source
chips, and a repeated “no alert was sent” confirmation make the boundary part
of the product.

**The model should be constrained to its comparative advantage.** GPT is useful
for turning a ledger into an operator-readable explanation. It should not be
the source of truth for whether evidence is corroborated. The server can make
that rule auditable and deterministic.

**Separating a demo fixture from a live path increases trust.** The fixture is
fast and repeatable for a safety demonstration. The live route is explicit
about its data source and fails closed when the briefing is unavailable.

**Codex works best as a continuous collaborator.** The largest gains came from
using it throughout the work: understanding an unfamiliar codebase, turning
decisions into typed interfaces, reviewing edge cases, verifying builds, and
documenting exactly what was—and was not—built.

---

## What's next for RAVENCRY

- Replace the hackathon-only approval bypass with production authentication and
  operator roles before any real deployment.
- Add a review queue, case-history audit trail, and explicit retention controls
  for source records.
- Let operators provide structured verification outcomes, so a later briefing
  can distinguish confirmed facts from unanswered questions without rewriting
  the original record.
- Conduct security and privacy review before connecting any additional intake
  channel to the live ledger.
- Test the Desk with responders and community organisations to improve the
  language, source labels, and verification workflow without automating the
  decision to alert.

---

**RAVENCRY: Evidence first. Human decision always.**

---

## Built with *(up to 25 tags)*

```text
openai-api, next.js, react, typescript, node.js, express.js, postgresql,
docker, progressive-web-app, flutter, json-schema, rest-api, web-development,
mobile, safety, accessibility
```

### Tag reference for Devpost autocomplete

| Tag | Why it belongs |
| --- | --- |
| `openai-api` | Server-side structured evidence briefing with `gpt-4o-mini`. |
| `next.js`, `react` | Evidence Briefing Desk and same-origin proxy. |
| `typescript`, `node.js`, `express.js` | Typed API, ledger service, and safety policy. |
| `postgresql` | Existing RAVENCRY case, person, and sighting source records. |
| `docker` | Local PostgreSQL development environment. |
| `progressive-web-app` | Existing RAVENCRY web application. |
| `flutter`, `mobile` | Local-first Voice Relay companion demo. |
| `json-schema` | Strict model-output contract. |

Use Devpost's closest autocomplete spelling if a tag is unavailable. Do not add
`gpt-5.6` as a runtime-model tag: it accelerated development in Codex, while
the demonstrated runtime model is `gpt-4o-mini`.

---

## "Try it out" links

| Link | URL / instruction |
| --- | --- |
| Source repository | `https://github.com/ravencry-labs/ravencry` |
| Build Week guide | `submission/build-week/README.md` in the repository |
| Fixture Desk | Run the web app, then open `http://localhost:3000/evidence-desk`. It needs no OpenAI call. |
| Live Fatima check | Run the API, web app, and local PostgreSQL, then open `http://localhost:3000/evidence-desk/case/NR-2026-000001`. |
| Full local instructions | `submission/build-week/manual-live-briefing-check.md` in the repository |
| Public demo video | `[PASTE PUBLIC YOUTUBE URL]` |

The live evidence path is intended for a local judging checkout because it uses
the local demonstration database and a server-only API key. It must not be
tested by putting a key in the browser. The fixture page shows the full safe
operator flow without credentials.

---

## Project Media — Suggested Images

Upload the video first, then choose five or six stills that reinforce one clear
story rather than repeating the same interface.

| Priority | Image / clip frame | Caption |
| --- | --- | --- |
| 1 | Fatima fixture with all three source cards | “Three sources converge; the operator still makes the decision.” |
| 2 | Fatima live GPT briefing with readable source chips | “Every generated finding links back to a source in the ledger.” |
| 3 | Yusuf live briefing with Kaduna Central Mosque and Kawo Bus Stop visible | “A location conflict holds approval instead of hiding uncertainty.” |
| 4 | Approval confirmation | “Recording a human review does not send an alert.” |
| 5 | Voice Relay's queued-for-review state | “Local-first capture; no emergency-service contact or live Desk write.” |
| 6 | Clean `npm run build` and `npx tsc --noEmit` results | “The Build Week extension builds and type-checks.” |

Avoid screenshots of `.env`, terminal environment values, raw reports, reporter
data, API keys, or provider errors.

---

## Video demo link

**YouTube URL (public):** `[PASTE URL AFTER UPLOAD]`

Record from `submission/build-week/BUILD-WEEK-DIRECTORS-SCRIPT.md`. The target
length is 2:34 and the absolute maximum is three minutes. The final video must
state that Codex and GPT-5.6 accelerated development and verification, while
`gpt-4o-mini` is the runtime briefing model.

---

## Additional Devpost fields — complete before submitting

| Devpost field | Value / action |
| --- | --- |
| Submitter type | Select the option that accurately describes the team. |
| Country of residence | Select each submitter's actual country of residence. |
| Category | **Apps for Your Life** |
| Code repository | `https://github.com/ravencry-labs/ravencry` — if private, grant `testing@devpost.com` and `build-week-event@openai.com` access before the deadline. |
| Judge testing instructions | Point judges to `submission/build-week/manual-live-briefing-check.md`; state that the fixture Desk is credential-free and the live path needs a local server key only. |
| `/feedback` Session ID | `[019f7236-0bbe-7a53-8004-a61c7ebf4e12` |
| Optional upload | Include the Voice Relay source/README or a small ZIP only if it is the exact code shown in the video and is safe to distribute. |

## Final submission checklist

- [ ] Rewrite the public narrative in the team's own voice; retain the verified
  model and safety disclosures.
- [ ] Add all team members and confirm they accepted their Devpost invitations.
- [ ] Commit the final Build Week changes and verify the repository URL.
- [ ] Ensure the README calls out both Codex/GPT-5.6 development work and the
  actual `gpt-4o-mini` runtime model.
- [ ] Run `/feedback` in the primary Build Week Codex task and paste the exact
  returned Session ID.
- [ ] Upload the public YouTube demo and test it while signed out.
- [ ] If the repository is private, grant both required judge accounts access.
- [ ] Re-run the fixture and live manual checks immediately before final submit.

---

# Build Week feedback: browser control was exceptional; file-edit reliability was the biggest blocker

I used Codex as the primary collaborator for a time-constrained hackathon project with a small team(very small one). The standout feature was the in-app browser control: seeing the agent scroll, click, reset scenarios, and guide a real demo recording felt like having a capable copilot beside me, not just a chat assistant.

### What worked well

* Browser control was genuinely high-value. Codex could operate the web app during recording: show the evidence sources, click approval, demonstrate the “No alert was sent” safety confirmation, switch to a conflicting case, and reset the demo.
* The ability to ask Codex to prove browser control first, scrolling and moving the cursor, built trust before recording.
* Long-session context was useful. Codex retained the product goal, safety boundaries, branch, demo script, runtime model disclosure, and team constraints across a large Build Week task.
* Codex helped identify meaningful product and implementation issues:

  * missing age rendering as `age 0`
  * fabricated duplicate evidence records
  * lost OSINT provenance
  * client-side API-key risk
  * model output being incorrectly trusted for approval decisions
* It was especially useful for turning a vague product idea into an auditable safety boundary: source-linked claims, deterministic approval policy, no autonomous alerting, and a clear distinction between GPT-5.6 development assistance and `gpt-4o-mini` runtime use.
* It was strong at demo preparation: director scripts, manual test checklists, repeatable scenarios, README/Devpost evidence, and what not to show in a recording.
* I liked that Codex paused before transmitting real case data to OpenAI and asked for explicit authorization.
* And, most importantly, it encouraged me to be as honest as possible.

### Biggest issues

* The most damaging issue was file editing. Even after I set Codex to approval mode, restarted it, and ran it as administrator, simple edits to existing files repeatedly failed with a Windows sandbox error about split writable roots / restricted tokens.
* The failure mode was confusing: Codex could read files and create new files, but could not update the exact existing file I asked it to edit.
* This cost valuable hackathon time and created unnecessary duplicate files. Instead of updating a TODO, script, or Devpost draft in place, the workaround was often, "create another file and ask another agent to copy it."
* The approval UI did not make the limitation clear. “Approve” made me reasonably expect edits would work. It did not explain that the environment still could not modify existing workspace files.
* I had to troubleshoot permissions manually, restart Codex, run as admin, and repeatedly ask why a basic edit failed. The product should diagnose this itself.

### Browser-control friction

* Browser control was powerful, but it felt fragile. Sessions needed reconnecting/finalizing, and basic cursor movement or clicking could fail when an element was slightly off-screen or a locator was ambiguous.
* It would be much better if the browser had a persistent "agent is controlling this tab" mode, with clear take-control/release-control indicators.
* Recording workflows need first-class support. Codex could tell me when to press `Win + Alt + R`, but a "recording mode" that follows a script step-by-step, pauses for the human to start/stop recording, and keeps browser control active would be excellent.
* Browser actions can feel slow because each step requires a tool round-trip. For rehearsed demos, I would like an optional, reviewable action sequence: “scroll here → click this → wait → switch scenario,” then execute it smoothly.

### Context, verification, and team-workflow issues

* I worried about context-window exhaustion during a long project. Codex should expose a simple context-health view: what it currently remembers, active constraints, current branch, known environment limitations, and whether a new task/thread would actually help.
* I want stronger provenance for claims. If I paste output from another agent saying “build passed,” Codex should label that as reported evidence until it independently verifies it.
* A team handoff mode would help: create a clean offline package for another developer with scoped tasks, test fixtures, setup instructions, known limitations, and no risk of shared-repo conflicts.

### Requested improvements, in priority order

1. Fix Windows workspace editing reliability. If a file is readable inside the workspace, safe targeted patches should work consistently.
2. Add a preflight permission panel: “can read / can create / can modify existing / can run dev server / can control browser.”
3. Make approval settings accurately reflect real capabilities and explain blockers in plain English.
4. Make in-app browser control persistent, visibly active, and recording-friendly.
5. Add context/session health and a one-click `/feedback` Session ID workflow.
6. Add a structured team-handoff/export workflow.
7. Clearly distinguish independently verified results from pasted or inferred results.

The browser-control experience is the feature I would most want improved and expanded. It made Codex feel like an active build partner. File-edit failures were the opposite: they made a capable agent unable to complete basic work at the moment speed mattered most.

### Now lemme blow ya mind
This section is the only part that is AI free. The entire feedback was from codex (with the exception of minor edits). Kinda scary how much window context memory it has for a single thread. Kudos to the openai team, it's ability to know it's weakness and where to improve, I won't be surprised if the team is a couple of AI agent with grand awareness.

---

019f7236-0bbe-7a53-8004-a61c7ebf4e12