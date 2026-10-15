# Building the Ravencry Content Director skill

This repository contains a reusable Codex skill for turning Ravencry engineering work into 30–90 second short-form video scripts. Each script should teach a developer lesson; it should not claim reach or promise a broader impact it cannot show.

## What we learned from `bayurzxsmtp/claude-skills`

We studied the repository at commit `aa8d778811a557a2c28ccadda4cf3d0bd028a4cc`. Its useful design ideas are:

- make each skill a focused package with one `SKILL.md` entry point;
- write an intent-rich description so the agent knows when to activate it;
- keep the workflow in the skill and put reusable detail in small reference/template files;
- support portable packaging separately from the core instructions.

We adopted those ideas but wrote an original, Ravencry-specific workflow. In particular, the skill is intentionally lean, treats screen recordings as evidence for the narration, and blocks sensitive incident material. The upstream project has a broader multi-agent packaging system; this repository does not need to inherit that complexity for one skill.

## Repository layout

```text
skills/ravencry-content-director/
├── SKILL.md                         # Trigger description and content workflow
├── agents/openai.yaml                # Codex UI metadata
├── assets/short-form-script-template.md
└── references/short-form-patterns.md
```

`SKILL.md` stays procedural: choose one useful insight, write narration first, map the smallest supporting recording, then run a safety/quality check. The reference file contains hook and ending patterns; the template is a copyable production sheet. This separation keeps the activation instructions short while still making repeatable artifacts available.

## Design decisions

| Decision | Why it matters |
| --- | --- |
| One transferable lesson per video | A short cannot carry a tutorial, a launch announcement, and a product demo without becoming forgettable. |
| Voice-over first | Screen recordings establish proof; narration carries the tension, explanation, and takeaway. |
| Fixtures and sanitized material only | Ravencry handles sensitive reporting context. Marketing must never expose active cases, locations, personal data, credentials, raw OSINT, or operations screens. |
| Claims must be shown or framed as experiments | The recording should support the claim; do not invent results or metrics. |
| No automatic publishing or alert claims | The skill writes content only and preserves the project’s visible human-approval requirement for alerts. |

## Use it

The committed folder is the source of truth. To make it automatically available to a personal Codex installation, copy or link it into your Codex skills directory (usually `~/.codex/skills/`), then start a new task. Alternatively, provide the skill path and invoke it explicitly as `$ravencry-content-director`.

Example prompt:

```text
Use $ravencry-content-director to script a 60-second video about testing offline PWA sync from prompt-system/specs/todo.md. Teach one technique, use only a deterministic fixture, and end by teeing up the next failure mode.
```

## Extend it responsibly

Add a reference only when it captures repeatable, non-obvious guidance. Add a script only when a deterministic task is repeatedly performed. Keep secrets and private data out of every skill artifact; Git ignore rules protect version control, not an agent that can read the workspace.

When the team develops an approved brand voice or publishing policy, add it as a small reference file and link it from `SKILL.md`. Prefer concrete community actions—notice, verify, hand off—to abstract claims about Ravencry's impact. Do not hard-code platform metrics, follower promises, or temporary trends as permanent instructions.

## Validate changes

Run the bundled validator after editing:

```powershell
python C:\Users\USER\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills\ravencry-content-director
```

Then forward-test with a real but sanitized Ravencry topic. A successful result has a specific three-second hook, a timestamped narration-led script, one concrete developer takeaway, a safe recording plan, and an honest closing line.
