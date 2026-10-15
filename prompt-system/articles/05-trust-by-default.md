# Article 5: Trust-by-Default
## Prompt, instructions, reference materials, and research
### Generated: 2026-07-15

---

## Suggested Titles

Primary:
**"Trust-by-Default: Designing the Anti-Fake Pipeline for a Safety-Critical System"**

Alternatives:
- "Why We Chose Trust-by-Default: RAVENCRY's Anti-Fake Design Philosophy"
- "Three Red Flags: How QW-04 Decides What's Real"

---

## Article Purpose

A focused deep dive into the design philosophy behind RAVENCRY's anti-fake detection system (QW-04). This is an article about a single decision — trust-by-default — and why it was the right call for a safety-critical system where false negatives (not broadcasting a real abduction) are catastrophic and false positives (broadcasting a hoax) are bad but survivable.

The article explains the QW-04 prompt architecture, the three-red-flag threshold, the trust score formula, why the system defaults to 0.7 (legitimate) instead of 0.5 (neutral), and the Nigerian-specific fake alert signatures QW-04 was trained to detect.

---

## Writing Instructions

### Required Reading (read BEFORE writing)

1. `prompt-system/articles/master-plan.md` — global rules, anti-AI checklist, cross-linking map, tone, voice, scene, settings
2. `prompt-system/skills/anti-ai-writing.md` — full anti-AI writing rules
3. `services/llm/src/prompts/antifake.ts` — production QW-04 system prompt (THE key file)
4. `articles/04-our-qwencloud-journey.md` — trust-by-default design, autonomy rules table, QW-04 anti-fake section
5. `ravencry_opus_optimization.md` — FR-007 anti-fake/reverse image search, NFR-009 false positive rate, Task 8 trust scoring
6. `step_qwencloud.md` — autonomy rules table, agent society architecture
7. `prompt-system/skills/qwen-multilingual.md` — Section 4 (severity classification edge cases, always-FLASH triggers)

> **Validity warning:** `articles/04-our-qwencloud-journey.md` was written during the June 2026 hackathon. Anti-fake patterns and trust scoring were theoretical at that stage — QW-04 prompts were untested with real hoax patterns. The production prompt in `services/llm/src/prompts/antifake.ts` is what actually runs. Claims about Nigerian fake alert signatures should be cross-referenced against current (July 2026) misinformation research.

### Research Before Writing (online)

1. **False positive vs false negative tradeoffs in emergency systems** — Research how Amber Alert, earthquake early warning, tsunami warning, and other safety-critical systems handle this tradeoff. Check academic papers on alert system design.
2. **Nigerian fake news / misinformation patterns (2026)** — Common hoax patterns on WhatsApp and social media in Nigeria. Recycled images, fabricated kidnapping reports, coordinated misinformation campaigns.
3. **Content authenticity tools (2026)** — Google Vision API, TinEye, EXIF metadata analysis. Current state of reverse image search APIs. Deepfake detection tools.
4. **Trust scoring in citizen reporting systems** — How do Ushahidi, CrowdStrike, or similar platforms handle trust? Check academic papers on crowdsourced crisis mapping trust models.
5. **LLM-based content moderation (2026)** — How are LLMs being used for misinformation detection? Check OpenAI, Anthropic, and academic papers on LLM-as-judge for content moderation.

### Article Structure

**Opening (2 paragraphs)**
Start with the core tension: every minute a real FLASH alert is delayed, a child stays missing. Every hoax that gets broadcast erodes trust in the system. You can't optimize for both. You have to choose which failure you can live with. We chose to live with false positives.

**Section: The math of trust-by-default (~3 paragraphs)**
Explain the decision in engineering terms:
- QW-04 default score: 0.7 (legitimate), not 0.5 (neutral)
- Only 3+ strong red flags trigger `hold_for_review`
- Infrastructure failure never blocks: if QW-04 errors, score defaults to legitimate
- Rate limiting fails open: if DynamoDB is down, reports proceed anyway
- All prompt engineering biased toward action: if uncertain, escalate rather than suppress

The formula: false positive = bad. false negative = catastrophic. Default to trust.

Reference: `articles/04-our-qwencloud-journey.md` trust-by-default design section, `step_qwencloud.md` autonomy rules table.

**Section: What QW-04 actually looks for (~4 paragraphs)**
Walk through the production prompt from `services/llm/src/prompts/antifake.ts`. The Nigerian-specific fake alert signatures:

- Recycled images: old photos being passed off as current. QW-04 checks for temporal inconsistencies (clothing, weather, context).
- Impossible timelines: "just happened" in a location that's 6 hours away.
- Coordinated language: multiple reports using identical phrasing — a signature of organized hoaxes.
- Missing verifiable details: real reports tend to have specific, messy details. Fake ones are vague.
- Emotional manipulation: excessive urgency language without specifics.
- Format anomalies: all-caps, excessive punctuation, chain-message formatting.

Don't just list them. Explain why each one is a signal and how QW-04 weighs them.

Reference: `services/llm/src/prompts/antifake.ts`.

**Section: The autonomy rules (~2 paragraphs)**
How QW-04 fits into the autopilot pipeline:
- `AUTO_APPROVE_FLASH=true` + QW-04 verdict `legitimate` → broadcast immediately
- QW-04 verdict `hold_for_review` → block broadcast regardless of tier (safety gate)
- Operator approval mode (`AUTO_APPROVE_FLASH=false`): QW-04 verdict still runs and is displayed to operator
- The race condition guard: `UPDATE ... WHERE status = 'pending' RETURNING *`

Reference: `step_qwencloud.md` autonomy rules table, `articles/02-what-we-built.md` API gateway section.

**Section: What we didn't build yet (~2 paragraphs)**
Honest gaps:
- Reverse image search: Google Vision / TinEye integration for detecting recycled photos. This is the biggest gap — QW-04 can only analyze text and metadata, not images.
- EXIF metadata analysis: stripping and verifying image metadata.
- Cross-report correlation: detecting coordinated hoaxes by comparing reports at scale (not just within one report).
- Trust score history: building a per-reporter credibility score based on prior accuracy.
- The anti-fake pipeline exists, but it's mostly textual analysis. The visual layer is post-hackathon.

Reference: `ravencry_opus_optimization.md` FR-007, `articles/02-what-we-built.md` "What We Cut".

**Section: The philosophy (~2 paragraphs)**
This is the reflective section. Why trust-by-default isn't naivety — it's a deliberate engineering choice for a system where the cost of inaction exceeds the cost of action. Most systems default to skepticism. RAVENCRY inverts that because the domain demands it. A false alert wastes bandwidth and trust. A missed alert costs lives.

Compare briefly to other systems: spam filters default to blocking (false positives are annoying, false negatives are also annoying — symmetric cost). Earthquake early warning defaults to alerting (false positive scares people, false negative kills people — asymmetric cost). RAVENCRY is in the second category.

**Closing (1 paragraph)**
QW-04 is about 150 lines of prompt and validation code. It runs in about a second on qwen-plus. It costs fractions of a cent per check. And it's the last line of defense between a hoax and thousands of phones. Trust-by-default is not a bug. It's the feature.

Cross-link: "Next: the doors we left open and the security hardening plan..."

---

### Cross-Linking

- **Links from Article 4**: The roadmap article mentioned the anti-fake gap. This article explains the design philosophy behind it.
- **Links to Article 6**: "Next: the security model and what we intentionally left exposed during development."

---

### Voice & Tone Reminder

This is a design philosophy article. Not abstract theory — grounded in specific code. The narrator is explaining a deliberate choice, not defending it. The tone is: "Here's the tradeoff. Here's why we chose this side. Here's what the code looks like. Here's what we still need to build."

Use the word "catastrophic" exactly once. It's the most important word in the article and it loses meaning if repeated.

---

## Online Research URLs to Check

1. Google Vision API: `https://cloud.google.com/vision` (reverse image search, SafeSearch)
2. TinEye API: `https://services.tineye.com/TinEyeAPI` (reverse image search)
3. Content Authenticity Initiative: `https://contentauthenticity.org/` (C2PA standard for content provenance)
4. Ushahidi trust model: search academic papers on "ushahidi trust scoring crisis mapping"
5. False positive tradeoffs: search "false positive false negative asymmetric cost emergency warning systems"
