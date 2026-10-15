# RAVENCRY Article Series — Master Plan
## 6-part technical documentary series
### Last updated: 2026-07-16

---

## Purpose

This file is the single source of truth for generating the RAVENCRY article series. Every article prompt, every reference file, and every cross-link is documented here. No hallucinating. Every claim must be traceable to a file in this repo.

---

## Series Overview

Six articles. Each stands alone but naturally references the next. Designed to be read in order, but each makes sense independently.

```
1. Alibaba Cloud → 2. Architecture → 3. Prompting → 4. Future → 5. Anti-Fake → 6. Security
```

| # | Article | Focus | Primary Sources |
|---|---------|-------|----------------|
| 1 | Moving to Alibaba Cloud | ECS, Terraform, cross-cloud strategy | `infra/aliyun/*`, `steps_aliyun.md`, `hackathon_context.md` |
| 2 | Every Service in Its Place | Architecture decisions, service inventory | `articles/02-what-we-built.md`, `docker-compose.yml`, Dockerfiles, `Caddyfile` |
| 3 | Teaching Machines Five Languages | Prompt engineering methodology, Kiro system, tools | `skills/qwen-multilingual.md`, `articles/04-our-qwencloud-journey.md`, `prompt-system/*` |
| 4 | After the Hackathon | Roadmap, V2/V3 vision, remaining tasks | `features.md`, `step_qwencloud.md`, `ravencry_opus_optimization.md` |
| 5 | Trust-by-Default | Anti-fake pipeline design, QW-04 philosophy | `services/llm/src/prompts/antifake.ts`, `articles/04-our-qwencloud-journey.md` |
| 6 | The Doors We Left Open | Security model, exposed endpoints, hardening plan | `Caddyfile`, `docker-compose.yml`, `README.md`, `ravencry_opus_optimization.md` |

---

## Global Rules — Applied to Every Article

### Writing Rules — applied to every article before delivery

This merges `prompt-system/skills/anti-ai-writing.md` and the Wikipedia "Signs of AI Writing" removal prompt from `prompt-system/prompt.md`. The goal is better writing, not evading detection.

**Content**

- Never exaggerate importance. Replace statements implying something is revolutionary, critical, game-changing, elegant, seamless, powerful, or transformative — unless the article proves it.
- Remove promotional language.
- Replace vague praise with observable facts. Instead of "clean architecture", write "one VPC, one VSwitch, one ECS instance, and one EIP."
- No canned promotional language, no travel-brochure words (`boasts`, `nestled`, `vibrant`), no "commitment to excellence".

**Specificity**

Every paragraph should contain something concrete: commands, filenames, errors, metrics, timestamps, configuration, decisions, tradeoffs, observations. If a sentence is generic, rewrite or delete it.

**Vocabulary — banned words and phrases**

- All eras: `delve`, `tapestry` (figurative), `testament` ("a testament to"), `underscore` (verb), `showcasing`, `fostering`, `vibrant`, `crucial`, `pivotal`, `meticulous`, `boasts`, `bolstered`, `emphasizing`, `enhance`, `highlighting`, `intricate`, `interplay`, `garner`, `enduring`
- No "serves as" / "stands as" — use "is". No "features" (meaning "has") — use "has".
- Simple words: `wrote` not `authored`, `used` not `utilized`, `moved` not `relocated`, `tried` not `attempted`, `died` not `passed away`.
- No "-ing" phrase analysis: "highlighting the importance...", "underscoring the significance...", "emphasizing the role of..."

**Transitions — remove AI patterns**

Delete: In summary, Overall, In conclusion, Additionally, Furthermore, Moreover, Importantly, Notably, It is worth noting, It is important to note, This highlights, This demonstrates, This underscores, Needless to say, Moving forward, As discussed earlier. Only keep transitions that genuinely improve readability.

**Hedging — remove AI uncertainty**

Delete `may`, `might`, `could`, `can be`, `helps`, `aims to`, `designed to`, `intended to` — unless uncertainty is actually required.

**Weasel language — replace with evidence**

Replace `some people say`, `many believe`, `widely regarded`, `industry standard`, `best practice`, `robust`, `powerful`, `flexible`, `scalable` with concrete evidence or remove them.

**Voice**

- Keep the author's actual voice. Preserve first-person experiences.
- Prefer "I discovered...", "I noticed...", "I expected...", "I changed..." over generic explanations.
- Whenever the article explains something, ask: "Would someone who actually built this say this?" If not, rewrite using direct operational experience.
- Use contractions where natural: `don't`, `it's`, `can't`, `won't`.

**Structure**

- Do NOT force symmetry. Avoid formulaic Problem → Solution → Benefits → Challenges → Conclusion. Let sections vary naturally. Merge short sections, split long ones.
- No "Challenges" section at the end. No "Future Outlook" following a rigid template.
- No "Not only X, but also Y" constructions. No rule-of-three triads ("X, Y, and Z").

**Sentence style**

- Vary sentence length aggressively. Mix short, medium, and long. Avoid repetitive rhythms. Avoid consecutive sentences beginning the same way.
- Allow occasional asymmetry. Allow uneven paragraph lengths. Some one-sentence paragraphs are fine.
- Avoid making every paragraph equally polished — natural writing has rough edges.

**Repetition**

Detect repeated words and ideas. Especially remove repeated use of `clean`, `simple`, `small`, `useful`, `important`, `helpful`, `easy`, `nice`, `good`. Use more precise wording.

**Technical writing**

Do not simplify technical explanations. Preserve code, commands, configuration, filenames, architecture.

**Formatting**

- No em dashes (at most one, unspaced). Prefer commas, parentheses, colons, or sentence breaks.
- No curly/smart quotes — use straight `"..."` and `'...'`.
- Sentence case in all headings. No boldface for emphasis in body text.
- No emoji anywhere. No placeholder text. No knowledge-cutoff disclaimers.

**Citations**

- Every claim traceable to a file in this repo. No statistics without a source file.
- No invented quotes, metrics, or timelines. No hallucinated reference markers.
- Online research for pricing/specs must use current (July 2026) sources.
- No UTM parameters in URLs. No invented DOIs or ISBNs.

### Audio narration — voice, scene, and delivery

Used when articles are recorded as spoken narration alongside video or architecture walkthroughs.

**Tone:** Male, around 35–45 years old. Deep, warm, calm, and confident. Neutral international English accent.

**Style:** Technical documentary narration. The speaker is an experienced engineer explaining a production system with quiet confidence. Every sentence should sound intentional and precise.

**Emotion:** Measured curiosity. Calm authority. Quiet pride in solid engineering rather than excitement. The delivery should feel grounded and trustworthy.

**Pacing:** Steady conversational pace. Pause naturally between paragraphs. Slightly emphasize technical terms without becoming dramatic. Keep the rhythm smooth — this narration will be joined with separately recorded audio.

**Do NOT sound like:** a commercial, a keynote presenter, a news reporter, an AI assistant, an audiobook narrator.

**Scene:** A clean engineering workspace. Large architecture diagrams fill multiple monitors. Infrastructure diagrams, service boundaries, and database schemas are visible. The atmosphere is calm, methodical, and professional.

**Sample context:** The audience has just understood the problem. Now the narrator begins explaining how the system is actually built, moving carefully through the architecture layer by layer.

**Recommended recording settings:** Accent: Neutral · Style: Empathetic · Pace: Natural

---

## Cross-Linking Map

```
Article 1 ends with: "In the next piece, we'll walk through every service..."
Article 2 ends with: "Next: how we taught the system to think in five languages..."
Article 3 ends with: "Next: where this all goes after the hackathon..."
Article 4 ends with: "Next: the anti-fake pipeline and why we chose trust-by-default..."
Article 5 ends with: "Next: the doors we left open and the hardening plan..."
Article 6 ends with: "This is the final piece in the series. Start from Article 1..."
```

---

## Prompt Files

| Article | Prompt File |
|---------|-------------|
| 1 | `prompt-system/articles/01-alibaba-cloud.md` |
| 2 | `prompt-system/articles/02-architecture-decisions.md` |
| 3 | `prompt-system/articles/03-prompt-engineering.md` |
| 4 | `prompt-system/articles/04-post-hackathon.md` |
| 5 | `prompt-system/articles/05-trust-by-default.md` |
| 6 | `prompt-system/articles/06-security-model.md` |

---

## Reference File Inventory

All files an agent must read before writing any article. Organized by article relevance.

### Shared (read for all articles)
- `prompt-system/articles/master-plan.md` — THIS FILE: tone, voice, scene, anti-AI rules, cross-linking, reference inventory
- `prompt-system/skills/anti-ai-writing.md` — full anti-AI rules
- `README.md` — project overview, service table, architecture
- `hackathon_context.md` — key decisions, debugging discoveries, Alibaba attempt log
- `ravencry_opus_optimization.md` — architecture review, design decisions

> **Validity warning:** Some referenced documents were written during the June 2026 hackathon build phase. API endpoints, service statuses, and environment configs may have changed since. Always cross-check claims against the actual running code before writing. When in doubt, the code wins over the docs.

### Article 1 — Alibaba Cloud
- `infra/aliyun/main.tf` — full Terraform: VPC, ECS, SG, EIP, RAM
- `infra/aliyun/variables.tf` — instance type, region, SSH key config
- `infra/aliyun/user_data.sh` — first-boot Docker/Caddy/Node/psql install
- `infra/aliyun/outputs.tf` — outputs, deployment reminder
- `infra/aliyun/terraform.tfvars.example` — variable template
- `steps_aliyun.md` — full deployment guide, AWS→Aliyun mapping
- `notes.md` — aliyun CLI config notes
- `pending_fix.md` — production drift fixes

### Article 2 — Architecture
- `articles/02-what-we-built.md` — existing deep-dive (source of truth)
- `docker-compose.yml` — full 11-service production compose
- `docker-compose.dev.yml` — dev overrides
- `Caddyfile` — reverse proxy, subdomain routing, bot rejection
- `services/*/Dockerfile` (all 8) — multi-stage builds, non-root users, healthchecks
- `features.md` — CORE/V2/V3 feature map
- `step_qwencloud.md` — agent society architecture, communication patterns
- `issues.md` — live `docker compose ps` showing healthy services
- `diag_architect.md` — service inventory, data flows, DNS routing

### Article 3 — Prompting
- `prompt-system/skills/qwen-multilingual.md` — tested Qwen patterns for 5 languages
- `prompt-system/skills/nigeria-context.md` — ground-truth Nigeria reference
- `prompt-system/skills/crucix-patterns.md` — Crucix codebase conventions
- `prompt-system/CONTENT_INDEX.md` — full prompt/skill/spec ecosystem
- `prompt-system/prompts/00-master-context.md` — complete project brief
- `prompt-system/prompts/06-qwen-triage.md` — Qwen prompt templates
- `prompt-system/specs/requirements.md` — formal requirements
- `prompt-system/specs/design.md` — technical architecture
- `services/llm/src/prompts/extract.ts` — QW-01 production prompt
- `services/llm/src/prompts/classify.ts` — QW-02 production prompt
- `services/llm/src/prompts/osint.ts` — QW-03 production prompt
- `services/llm/src/prompts/antifake.ts` — QW-04 production prompt
- `articles/03-what-we-learned.md` — "Schema exists in four places"
- `articles/04-our-qwencloud-journey.md` — Qwen model comparison, token usage

### Article 4 — Post-Hackathon
- `features.md` — V2/V3 sections (facial recognition, LPR, drone feeds, etc.)
- `step_qwencloud.md` — priority-ranked remaining tasks (QC-02 through QC-09)
- `flow.md` — demo script for context
- `ravencry_opus_optimization.md` — technical debt items, algorithm optimization
- `specs/todo.md` — V2 backlog items

### Article 5 — Anti-Fake
- `services/llm/src/prompts/antifake.ts` — QW-04 system prompt
- `articles/04-our-qwencloud-journey.md` — trust-by-default design, red flag rules
- `ravencry_opus_optimization.md` — FR-007 anti-fake, NFR-009 false positive rate
- `step_qwencloud.md` — autonomy rules table, trust-by-default design section

### Article 6 — Security
- `Caddyfile` — bot scanner rejection, security headers, subdomain routing
- `docker-compose.yml` — env var exposure, port mappings
- `README.md` — service table, secrets section
- `db/migrations/008_subscribers.sql` — phone encryption design
- `db/migrations/010_operators.sql` — operator auth
- `ravencry_opus_optimization.md` — NFR-004 phone hash contradiction, circuit breaker
- `.env.example` — all exposed env vars
- `pending_fix.md` — Fix 2 (dotenv comment parsing), Fix 3 (config drift)
- `specs/design.md` — security design section (auth, RBAC, data retention)
