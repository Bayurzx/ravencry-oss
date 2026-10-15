# SKILL: Qwen Multilingual Patterns
## Tested prompt engineering for Nigerian languages — reuse across all Qwen calls

---

## PURPOSE

This skill captures every lesson learned about making Qwen work reliably for Nigerian languages. It covers prompt construction, edge cases, failure modes, and the exact patterns that produce consistent structured output.

**When to use this skill:**
- Writing or debugging any Qwen prompt template
- Adding a new extraction field to QW-01
- Handling a language Qwen struggles with
- Debugging hallucinated or null field output
- Optimising for cost vs accuracy tradeoffs

---

## SECTION 1: QWEN API SETUP

### SDK Configuration (OpenAI-compatible)
```javascript
import OpenAI from 'openai'

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
})
```

### Model Selection Guide
```
qwen-turbo:
  Use for: OSINT classification (high volume), trust scoring, routine tasks
  Speed: ~1.5s per call
  Cost: lowest
  Multilingual: good for English + Hausa; weaker on Igbo

qwen-plus:
  Use for: FLASH case extraction, severity classification, anti-fake detection
  Speed: ~2.5s per call
  Cost: ~3x turbo
  Multilingual: strong on all 5 Nigerian languages, handles code-switching

qwen-max:
  Use for: complex reasoning, disputed classifications, V2 investigator assistant
  Speed: ~4s per call
  Cost: ~8x turbo
  Multilingual: best available

RULE: Use qwen-plus for anything that touches FLASH classification.
      Use qwen-turbo for everything else until cost becomes a concern.
```

### Always use `response_format: { type: 'json_object' }`
```javascript
const response = await qwen.chat.completions.create({
  model: 'qwen-plus',
  messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userInput }],
  response_format: { type: 'json_object' },
  temperature: 0.1,   // Critical: low temperature = consistent structured output
  max_tokens: 800     // Enough for all RAVENCRY response schemas
})
```

**Why temperature 0.1:**
Higher temperatures cause field values to vary on identical inputs. For safety-critical extraction (name, location, age), you need deterministic output. 0.1 is the sweet spot — allows minor linguistic flexibility without hallucination.

---

## SECTION 2: LANGUAGE-SPECIFIC PROMPT PATTERNS

### Pattern 1: Explicit Language Permission
Always tell Qwen it is allowed to handle non-English input. Without this, it may translate first (losing proper nouns) or refuse mixed-language input.

```
✅ CORRECT:
"You will receive reports in Hausa, Yoruba, Igbo, Nigerian Pidgin, English, 
or any mix of these languages. Process the input language as-is."

❌ WRONG:
[no language instruction — Qwen may assume English only]
```

### Pattern 2: Proper Noun Protection
Qwen will sometimes "correct" Nigerian place names or person names to English equivalents or common spellings. Prevent this explicitly.

```
✅ CORRECT:
"Extract proper nouns (names, places) exactly as written in the input.
Do not normalise, translate, or 'correct' spelling of Nigerian names.
Kasuwan Shanu, Sabon Gari, Rijiyar Zaki are Nigerian place names — preserve them exactly."

❌ WRONG:
[no instruction — "Kasuwan Shanu" becomes "Cattle Market" or "Kasuma Sanu"]
```

### Pattern 3: Null Over Inference
For safety systems, a null field is safer than a hallucinated value. Tell Qwen explicitly.

```
✅ CORRECT:
"If you cannot confidently determine a field from the input, return null for that field.
Do not invent information. It is better to return null than to guess."

❌ WRONG:
"Extract as much as possible" — this encourages guessing
```

### Pattern 4: Pidgin Code Recognition
Qwen sometimes fails to recognise Nigerian Pidgin as intentional language rather than misspelled English. Add explicit Pidgin examples.

```
✅ CORRECT:
"Nigerian Pidgin examples and their meanings:
- 'dem don carry am' = they took him/her (kidnapping)
- 'e don miss' = he/she is missing
- 'dem snatch am' = they snatched him/her
- 'e no dey house' = he/she is not at home
- 'make una help' = please help us
Treat these as valid descriptions, not typos."
```

### Pattern 5: Hausa Transliteration Variants
Hausa kidnapping terms appear in multiple transliterations. List the variants explicitly.

```
"In Hausa, kidnapping/abduction may be expressed as:
'an sace', 'an sace shi/ta', 'an yi garkuwa', 'sace su', 'an kwace',
'sun tafi da shi/ta', 'sun kawo garkuwa'
Treat any of these as circumstance = 'abduction'."
```

---

## SECTION 3: FIELD EXTRACTION EDGE CASES

### Age Extraction
```javascript
// Input variations Qwen must handle:
"yaro mai shekara 10"    → age_estimate: 10  (Hausa: "a boy of 10 years")
"ọmọ ọdun mejila"       → age_estimate: 12  (Yoruba: "child of 12 years")
"pikin wey be like 7"   → age_estimate: 7   (Pidgin approximate)
"small girl, maybe primary 3" → age_estimate: 8  (inferred from school year)
"elderly man"           → age_estimate: null, notes: "elderly"
"baby"                  → age_estimate: 1   (approximate)
"teenager"              → age_estimate: 15  (approximate midpoint)
```

**Prompt addition:**
```
"For age: if given as a school year ('primary 3', 'JSS2'), estimate the age.
If given as a descriptor ('baby', 'small child', 'elderly'), provide a reasonable estimate
and note it is an estimate. Never return null for age when context allows estimation."
```

### Location Extraction
```javascript
// Qwen must extract the most specific location available:
"near the market"                    → last_seen_location: "near the market", lga: null
"Kasuwan Shanu Kano"                 → location: "Kasuwan Shanu", lga: "Kano Municipal", state: "Kano"
"Total filling station Ajah Lagos"   → location: "Total filling station, Ajah", lga: null, state: "Lagos"
"Abuja-Kaduna road near Katari"      → location: "Abuja-Kaduna road, near Katari", lga: null, state: null
"na Maiduguri Motor Park"            → location: "Maiduguri Motor Park", state: "Borno"
```

**Prompt addition:**
```
"Extract location at the most specific level available: landmark > street > area > LGA > state.
Nigerian LGA names are valid location values (e.g. 'Anka', 'Gwoza', 'Ikorodu').
Motor parks, markets, and filling stations are valid landmark references."
```

### Time Extraction
```javascript
// Relative time handling:
"this morning"     → last_seen_time: "[today] morning" (flag for server to resolve)
"lana dare"        → last_seen_time: "[yesterday] night" (Hausa)
"ana yau"          → last_seen_time: "[today]" (Hausa)
"yesterday 3pm"    → last_seen_time: "yesterday 15:00" (normalise to 24h)
"last week Tuesday"→ last_seen_time: "[relative: last Tuesday]"
"today 10am"       → last_seen_time: "[today] 10:00"
```

**Prompt addition:**
```
"For time: use 24-hour format where possible.
For relative times ('today', 'yesterday', 'this morning', 'lana dare' in Hausa):
  prefix with the relative indicator in brackets: '[today] 10:00', '[yesterday] evening'
The server will resolve relative times using the submission timestamp.
Do not attempt to generate an absolute ISO date for relative times."
```

---

## SECTION 4: SEVERITY CLASSIFICATION EDGE CASES

### Always-FLASH Triggers (never override these)
```javascript
const ALWAYS_FLASH = [
  // Child indicators
  "child", "children", "pikin", "yaro", "yarinya", "omo", "nwa",
  "baby", "infant", "toddler", "primary school", "nursery", "junior",
  "under 18", "age < 18",
  
  // School incidents
  "school bus", "school children", "students kidnapped", "students missing",
  "makaranta",  // Hausa: school
  
  // Mass kidnapping
  "multiple", "many people", "group of", "dozens", "hundreds",
  "bus full", "market attack",
  
  // Weapons confirmed
  "gunmen", "armed men", "bandits", "gun shot", "AK-47"
]
```

**Prompt addition:**
```
"ABSOLUTE RULE: If the victim is a child (under 18, or any child indicator word),
classify as FLASH regardless of all other factors.
There are no exceptions to this rule.
When in doubt about age, assume child and classify FLASH."
```

### High-Risk State Auto-escalation
```javascript
// States that auto-escalate to minimum PRIORITY
const HIGH_RISK_STATES = [
  "Zamfara", "Katsina", "Kebbi", "Sokoto", "Niger State",
  "Kaduna", "Borno", "Yobe", "Plateau", "Adamawa"
]

// Routes that auto-escalate to minimum PRIORITY
const HIGH_RISK_ROUTES = [
  "Abuja-Kaduna", "Kaduna-Abuja", "Minna-Birnin Gwari",
  "Okene-Lokoja", "Keffi-Lafia", "Jos-Barkin Ladi"
]
```

---

## SECTION 5: ANTI-FAKE DETECTION PATTERNS

### Nigerian-Specific Fake Alert Signatures
These patterns are commonly seen in hoax Nigerian WhatsApp kidnapping alerts:

```javascript
const FAKE_SIGNATURES = [
  // Emotional urgency without specifics
  /PLEASE SHARE URGENTLY/i,
  /SHARE TO ALL YOUR CONTACTS/i,
  /IF YOU SEE THIS CHILD/i,         // generic — no case ID
  
  // Generic child descriptions
  /wearing school uniform/i,         // too vague without colour/school name
  /about \d+ years old/i,            // combined with no name = suspicious
  
  // Recycled photo indicators
  // (detected via metadata, not text — but text can also hint)
  /happened in \d{4}/i,             // old date in text
  /since last year/i,
  
  // Suspicious distribution language
  /going viral/i,
  /police are looking for/i,         // RAVENCRY is not police — legitimate reports wouldn't say this
  /reward of \d+/i                   // ransom framing in public alert = suspicious
]
```

**Prompt addition:**
```
"Nigerian-specific fake alert indicators (reduce authenticity_score by 0.15 each):
- Message contains 'SHARE URGENTLY' or similar viral language without specific facts
- No specific location beyond a state name
- No time given
- Child described only as 'school uniform' with no school name or colour
- Language matches known recycled WhatsApp alert templates
- No reporter contact or reference to how reporter knows the child

Legitimate reports typically include at least 2 of: specific location, time, clothing detail, reporter relationship."
```

---

## SECTION 6: RESPONSE VALIDATION PATTERNS

### Schema Validation (Node.js)
```javascript
import Ajv from 'ajv'
const ajv = new Ajv()

const extractionSchema = {
  type: 'object',
  required: ['gender', 'circumstance', 'language_detected', 'extraction_confidence'],
  properties: {
    person_name:           { type: ['string', 'null'] },
    age_estimate:          { type: ['number', 'null'], minimum: 0, maximum: 120 },
    gender:                { enum: ['male', 'female', 'unknown'] },
    clothing_description:  { type: ['string', 'null'] },
    last_seen_location:    { type: ['string', 'null'] },
    last_seen_location_lga:{ type: ['string', 'null'] },
    last_seen_state:       { type: ['string', 'null'] },
    last_seen_time:        { type: ['string', 'null'] },
    circumstance:          { enum: ['abduction', 'missing', 'witnessed_kidnapping', 'unknown'] },
    language_detected:     { enum: ['english', 'hausa', 'yoruba', 'igbo', 'pidgin', 'mixed'] },
    extraction_confidence: { type: 'number', minimum: 0, maximum: 1 },
    missing_critical_fields: { type: 'array', items: { type: 'string' } }
  }
}

const validate = ajv.compile(extractionSchema)

export function validateExtraction(output) {
  const valid = validate(output)
  if (!valid) {
    throw new Error(`Qwen extraction schema invalid: ${JSON.stringify(validate.errors)}`)
  }
  return output
}
```

### Fallback on Parse Failure
```javascript
export async function safeQwenExtract(text) {
  try {
    const raw = await qwenComplete({ system: EXTRACT_SYSTEM, user: text, model: 'qwen-plus' })
    return validateExtraction(raw)
  } catch (err) {
    // Log to DynamoDB for review
    await logQwenFailure({ text, error: err.message })
    // Return minimal safe fallback — do not crash the intake pipeline
    return {
      person_name: null,
      age_estimate: null,
      gender: 'unknown',
      circumstance: 'unknown',
      language_detected: 'unknown',
      extraction_confidence: 0,
      missing_critical_fields: ['name', 'location', 'time'],
      _fallback: true
    }
  }
}
```

---

## SECTION 7: COST OPTIMISATION

### Token Counting
Average token counts per RAVENCRY call:
```
QW-01 extraction (short WhatsApp text):  ~200 tokens in, ~300 out = 500 total
QW-01 extraction (voice transcript):     ~400 tokens in, ~300 out = 700 total
QW-02 classification:                    ~500 tokens in, ~200 out = 700 total
QW-03 OSINT:                             ~300 tokens in, ~150 out = 450 total
QW-04 anti-fake:                         ~400 tokens in, ~200 out = 600 total
```

Daily volume estimate (V1 hackathon scale):
```
~50 reports/day → QW-01: 50 × 700 = 35,000 tokens
~200 OSINT items → QW-03: 200 × 450 = 90,000 tokens
~50 classifications → QW-02: 50 × 700 = 35,000 tokens
Total: ~160,000 tokens/day
Qwen-plus cost: ~$0.16/day at standard pricing
```

### Batching Strategy (V2)
For OSINT classification (high volume, low urgency), batch headlines:
```javascript
// Instead of 1 API call per article headline:
// Send 10 headlines in one call

const systemPrompt = `Classify each of the following ${headlines.length} Nigerian news items.
Return a JSON array where each element corresponds to one headline.
Array index must match input index exactly.`

const userContent = headlines.map((h, i) => `[${i}] ${h.title}: ${h.snippet}`).join('\n')
```
This reduces OSINT API calls by ~10x.

---

## SECTION 8: DEBUGGING CHECKLIST

When Qwen returns unexpected output:

- [ ] Is `temperature` set to 0.1? (Higher temp = more variation)
- [ ] Is `response_format: { type: 'json_object' }` set? (Without it, Qwen may return markdown fences)
- [ ] Does system prompt explicitly say "JSON only, no preamble, no markdown"?
- [ ] Is the input text being passed as `user` content, not appended to `system`?
- [ ] For null fields: does prompt say "return null rather than guess"?
- [ ] For Nigerian places: does prompt say "preserve proper nouns exactly as written"?
- [ ] For Pidgin: does prompt include Pidgin examples?
- [ ] Is the field in the schema definition in the prompt? (Qwen ignores schema fields it wasn't shown)
- [ ] Check token usage — if hitting max_tokens limit, output is truncated (increase to 1200)
- [ ] Test on qwen-plus if qwen-turbo is giving poor results on a specific language
