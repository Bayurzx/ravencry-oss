# Article 3: Teaching Machines Five Languages
## Prompt, instructions, reference materials, and research
### Generated: 2026-07-15

---

## Suggested Titles

Primary:
**"Teaching Machines Five Languages: Our Prompt Engineering Journey"**

Alternatives:
- "Hausa, Yoruba, Igbo, Pidgin, English: Writing Prompts That Actually Work"
- "The Kiro System: How We Engineered Prompts for a Multilingual Safety System"

---

## Article Purpose

A deep dive into the prompt engineering methodology behind RAVENCRY. This is not a Qwen tutorial. It's a story about how we built a system of prompts, skills, and specs — the "Kiro" prompt system — that let multiple LLMs (including Qwen, GPT-4o, DeepSeek, and Gemini) handle safety-critical classification across five Nigerian languages. The focus is on methodology: what patterns worked, what broke, how we systematized prompt writing, and the tools we built to manage it all.

---

## Writing Instructions

### Required Reading (read BEFORE writing)

1. `prompt-system/articles/master-plan.md` — global rules, anti-AI checklist, cross-linking map, tone, voice, scene, settings
2. `prompt-system/skills/anti-ai-writing.md` — full anti-AI writing rules
3. `prompt-system/skills/qwen-multilingual.md` — THE key file: tested Qwen patterns, language-specific edge cases, model selection guide, token usage
4. `prompt-system/skills/nigeria-context.md` — Nigeria ground truth, language distribution, Hausa/Pidgin keywords
5. `prompt-system/CONTENT_INDEX.md` — full Kiro system structure (prompts, specs, skills)
6. `prompt-system/prompts/00-master-context.md` — the master prompt that starts every session
7. `prompt-system/prompts/06-qwen-triage.md` — QW-01 through QW-04 full system prompts
8. `services/llm/src/prompts/extract.ts` — production QW-01 prompt (multilingual extraction)
9. `services/llm/src/prompts/classify.ts` — production QW-02 prompt (severity classification)
10. `services/llm/src/prompts/osint.ts` — production QW-03 prompt (OSINT classification)
11. `services/llm/src/prompts/antifake.ts` — production QW-04 prompt (anti-fake detection)
12. `articles/03-what-we-learned.md` — "Schema exists in four places" and "LLM-agnostic from day one"
13. `articles/04-our-qwencloud-journey.md` — Qwen model comparison table, token usage patterns, prompt engineering discoveries
14. `step_qwencloud.md` — agent architecture, multilingual support table
15. `ravencry_opus_optimization.md` — Task 4 (LLM task allocation), trust scoring formula

> **Validity warning:** `articles/04-our-qwencloud-journey.md` and `ravencry_opus_optimization.md` were written during the June 2026 hackathon. Qwen model pricing and capabilities change frequently. Verify current model names, pricing, and benchmark claims against the DashScope console or Qwen GitHub before writing. The production prompts in `services/llm/src/prompts/*.ts` are the authoritative source — they are what actually runs.

### Research Before Writing (online)

1. **Qwen model family (July 2026)** — Current models: qwen-turbo, qwen-plus, qwen-max. Capabilities, benchmark scores, multilingual performance. Check DashScope docs or Alibaba Cloud AI page.
2. **Nigerian language NLP landscape (2026)** — Any new models, datasets, or benchmarks for Hausa, Yoruba, Igbo, Nigerian Pidgin. Check papers on arXiv, Masakhane, AfricaNLP workshops.
3. **Prompt engineering best practices (2026)** — Current thinking on chain-of-thought, few-shot, structured output. Check OpenAI, Anthropic, Google prompt engineering guides.
4. **LLM evaluation for low-resource languages** — How do you benchmark when there are no standard test sets? Check research on cross-lingual transfer, zero-shot multilingual evaluation.
5. **OpenAI-compatible API standard (2026)** — The de facto standard that lets us swap providers. Check for any formal specification or major changes.

### Article Structure

**Opening (2 paragraphs)**
Start with the problem: five languages, code-switching, safety-critical classification, feature phones with no autocorrect. You can't just write "classify this text as FLASH, PRIORITY, or ROUTINE" and hope for the best. A mother reporting her missing child in Hausa doesn't get a second chance because the model hallucinated the location.

**Section: The four-prompt pipeline (~3 paragraphs)**
Walk through QW-01 through QW-04 as a system, not four isolated prompts. Extraction feeds classification. Classification feeds routing. Anti-fake runs in parallel. Each has a specific job, a specific output schema, and specific failure modes. Describe each one briefly:
- QW-01: unstructured text → structured fields (5 languages)
- QW-02: structured fields → FLASH/PRIORITY/ROUTINE
- QW-03: news article → actionable/not, tier
- QW-04: report + metadata → legitimate/hold_for_review

Reference: `services/llm/src/prompts/*`, `articles/04-our-qwencloud-journey.md`.

**Section: The patterns that worked (~4 paragraphs)**
Five tested patterns from `skills/qwen-multilingual.md`, each with a concrete example:

1. Explicit language permission: "You will receive reports in Hausa, Yoruba, Igbo, Nigerian Pidgin, English" prevents the model from assuming English and translating first.
2. Proper noun protection: "Do not normalize, translate, or 'correct' Nigerian names. Kasuwan Shanu is a place — preserve it." Without this, "Kasuwan Shanu" becomes "Cattle Market".
3. Null over inference: "If you cannot confidently determine a field, return null. Do not invent information." For safety systems, a missing field is better than a hallucinated one.
4. Pidgin code recognition: Explicit examples prevent the model from treating Pidgin as misspelled English. "dem don carry am" = "they took him/her", not a typo.
5. Hausa transliteration variants: "an sace", "an yi garkuwa", "sun tafi da shi" all mean abduction. List variants explicitly.

Reference: `prompt-system/skills/qwen-multilingual.md` Sections 2 and 3.

**Section: The edge cases that almost broke us (~3 paragraphs)**
Concrete examples with actual input/output:

- Age extraction: "small girl, maybe primary 3" → age_estimate: 8 (inferred from school year). The prompt had to be taught Nigerian school years.
- Location at LGA level: Qwen returns town names, not LGAs. Had to add explicit LGA examples to the prompt.
- Code-switching: "My pikin don disappear, a ganshi a Kasuwan" — Pidgin + Hausa in one sentence. Qwen handled this best of all models tested.
- The model comparison table from `articles/04-our-qwencloud-journey.md`: Qwen vs GPT-4o vs DeepSeek vs Gemini on Hausa, Yoruba, Igbo, Pidgin.

Reference: `prompt-system/skills/qwen-multilingual.md` Section 3, `articles/04-our-qwencloud-journey.md` Qwen-specific findings.

**Section: The Kiro prompt system (~3 paragraphs)**
How we managed the complexity of multiple prompts across multiple LLMs. The system: `prompts/` for session-starting instructions, `specs/` for living documents (requirements, design, todo), `skills/` for reusable domain knowledge (Nigeria context, Qwen patterns, Crucix patterns, anti-AI writing). The `CONTENT_INDEX.md` as the entry point for any LLM or human contributor. Why this matters: when you're iterating prompts at 3am during a hackathon, you need to know which file is authoritative.

Reference: `prompt-system/CONTENT_INDEX.md`, `prompt-system/prompts/*`, `prompt-system/specs/*`.

**Section: LLM-agnostic by design (~2 paragraphs)**
Four providers, one env var. The 30 minutes of abstraction work up front that paid off. The demo pitch: "Swap `LLM_PROVIDER` from `qwen` to `openai` and the entire pipeline runs on GPT-4o. Zero code changes." Why this matters for a hackathon sponsored by Qwen Cloud but scored on AWS + Vercel where vendor neutrality counts.

Reference: `articles/03-what-we-learned.md` "LLM-agnostic from day one", `articles/04-our-qwencloud-journey.md`.

**Section: What we'd do differently (~2 paragraphs)**
- Test the Qwen API key first before building the provider abstraction
- More Nigerian language test cases (23 tests cover basic patterns; real-world reports have more variation)
- Qwen-specific prompt tuning earlier (prompts were written agnostic; Qwen benefits from more explicit structural examples)
- Token usage tracking from day one (would help demonstrate cost-efficiency)

Reference: `articles/04-our-qwencloud-journey.md` "What We'd Do Differently".

**Closing (1–2 paragraphs)**
Prompts are not configuration. They're code. They need testing, version control, and a deliberate methodology. For a safety-critical system operating in five languages, "write a good prompt" isn't enough. You need patterns, edge case handling, and a system that catches failures before they reach production.

Cross-link: "Next: where RAVENCRY goes after the hackathon..."

---

### Cross-Linking

- **Links from Article 2**: The architecture article explained what the LLM service does. This article explains how.
- **Links to Article 4**: "Next: the roadmap, what we learned, and where this goes from here."

---

### Voice & Tone Reminder

This is an engineer explaining craft. Not "prompt engineering is amazing." Not "AI is the future." More like: "Here's what we tried. Here's what broke. Here's what worked. Here's how we organized it so we wouldn't lose our minds at 3am." The narrator has spent hours staring at Qwen output and knows exactly which edge cases to worry about.

Use specific examples from the codebase. Show the actual prompt snippets. Show the actual Qwen output. Let the reader see the methodology, not just hear about it.

---

## Online Research URLs to Check

1. Qwen models on Alibaba Cloud: `https://www.alibabacloud.com/product/dashscope` or `https://dashscope.aliyuncs.com/`
2. Qwen GitHub: `https://github.com/QwenLM/Qwen` (latest models, benchmarks)
3. Masakhane NLP: `https://www.masakhane.io/` (African NLP research, datasets for Nigerian languages)
4. OpenAI prompt engineering guide: `https://platform.openai.com/docs/guides/prompt-engineering`
5. Anthropic prompt engineering: `https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview`
