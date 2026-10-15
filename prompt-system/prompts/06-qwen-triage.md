# Prompt 06 — Qwen AI Triage Layer
## Multilingual extraction, severity classification, anti-fake detection

---

## INSTRUCTION TO AI

Build the complete Qwen-powered triage service for RAVENCRY. This is the AI brain of the system. Every report passes through this layer before anything is stored or broadcast.

Stack: Node.js service, Qwen API (`qwen-turbo` for speed, `qwen-plus` for accuracy on FLASH cases), deployed as a Docker container exposing a simple REST API.

---

## SERVICE STRUCTURE

```
services/qwen/
├── index.mjs          ← Express server, route definitions
├── client.mjs         ← Qwen API wrapper (handles retries, timeouts)
├── prompts/
│   ├── extract.mjs    ← QW-01: field extraction
│   ├── classify.mjs   ← QW-02: severity classification
│   ├── osint.mjs      ← QW-03: OSINT article classification
│   └── antifake.mjs   ← QW-04: fake/misinformation detection
├── validators/
│   ├── extract.mjs    ← JSON schema validation for QW-01 output
│   └── classify.mjs   ← Enum validation for QW-02 output
└── __tests__/
    ├── hausa.test.mjs
    ├── yoruba.test.mjs
    ├── igbo.test.mjs
    └── pidgin.test.mjs
```

---

## QW-01: REPORT FIELD EXTRACTION

### Endpoint: POST /extract

**Request:**
```json
{ "text": "string", "channel": "whatsapp|ussd|pwa|telegram|osint" }
```

**System prompt:**
```
You are a structured data extraction assistant for RAVENCRY — Nigeria's real-time anti-kidnapping and missing persons alert platform.

Your job is to extract structured information from reports submitted in ANY Nigerian language or dialect: Hausa, Yoruba, Igbo, Nigerian Pidgin, or English. Reports are often short, informal, emotionally written, and may mix multiple languages in a single message.

RULES:
1. Always respond with valid JSON only. No preamble, no explanation, no markdown code fences.
2. If a field cannot be determined, use null — never invent information.
3. For last_seen_time: convert relative times ("this morning", "yesterday 3pm", "last week Tuesday") to ISO 8601 if possible. If only partial info, return the raw string.
4. For last_seen_location: preserve the original place name exactly as given. Include LGA if mentioned.
5. For age: if given as a range ("around 10"), use the midpoint. If given as a descriptor ("small child", "young girl"), use an estimate in notes.
6. The circumstance field must be your best inference even from vague input.

RESPONSE SCHEMA (return this exact structure):
{
  "person_name": string | null,
  "age_estimate": number | null,
  "gender": "male" | "female" | "unknown",
  "clothing_description": string | null,
  "last_seen_location": string | null,
  "last_seen_location_lga": string | null,
  "last_seen_location_state": string | null,
  "last_seen_time": string | null,
  "distinguishing_features": string | null,
  "circumstance": "abduction" | "missing" | "witnessed_kidnapping" | "unknown",
  "reporter_relationship": string | null,
  "additional_context": string | null,
  "language_detected": "english" | "hausa" | "yoruba" | "igbo" | "pidgin" | "mixed",
  "extraction_confidence": number,
  "missing_critical_fields": ["name" | "location" | "time"]
}
```

**Test cases to include in `__tests__/`:**

```javascript
// Hausa report
"An sace ɗana a kasuwar Sabon Gari Kano yau da safe. Sunansa Ibrahim, yana da shekara 9, yana sanya rigar makaranta mai launin shuɗi."
// Expected: name=Ibrahim, age=9, location="Sabon Gari, Kano", circumstance=abduction, language=hausa

// Yoruba report
"Omo mi sonu ni ọja Mile 12 Lagos lana alẹ. Orukọ rẹ ni Tolu, ọmọ ọdun 12, obirin."
// Expected: name=Tolu, age=12, gender=female, location="Mile 12, Lagos", language=yoruba

// Pidgin report
"Dem don kidnap my pikin for Kaduna-Abuja road near Katari. E be small boy, maybe 7 years. E dey wear red shirt. This morning 6am."
// Expected: name=null, age=7, gender=male, location="Kaduna-Abuja road, Katari", circumstance=abduction, language=pidgin

// Igbo report
"Ada m Chiamaka efu na ọ̀chà Onitsha. Ọ nọ n'afọ iri na abụọ, ọ na-eyi ákwá ọcha."
// Expected: name=Chiamaka, age=12 (approx), gender=female, location="Onitsha", language=igbo

// Mixed / code-switching
"My son Emeka (age 8) don miss since yesterday. I last see am at Total filling station Ajah Lagos around 4pm yesterday."
// Expected: name=Emeka, age=8, gender=male, location="Total filling station, Ajah, Lagos", language=mixed
```

---

## QW-02: SEVERITY CLASSIFICATION

### Endpoint: POST /classify

**Request:**
```json
{
  "extracted": { ...QW-01 output },
  "source_channel": "string",
  "reporter_verified": boolean
}
```

**System prompt:**
```
You are the severity classification engine for RAVENCRY — Nigeria's missing persons and anti-kidnapping alert platform.

Given a structured missing person or kidnapping report, classify it as FLASH, PRIORITY, or ROUTINE.

CLASSIFICATION RULES (apply in order — first match wins):
- FLASH: Any of: confirmed child abduction | witnessed kidnapping | multiple victims | school bus / transport incident | reporter claims to have direct evidence | circumstances involve weapons
- PRIORITY: Any of: adult missing with violence indicators | missing >6 hours in high-risk LGA | missing person is elderly or has medical condition | high-risk route mentioned (Abuja-Kaduna, Kaduna-Abuja, etc.)
- ROUTINE: Adult missing with no violence indicators | circumstances unclear | report lacks location specificity

HIGH-RISK LGAs (auto-escalates to PRIORITY minimum):
Zamfara, Kaduna, Katsina, Kebbi, Sokoto, Niger, Borno, Yobe, Plateau

HIGH-RISK ROUTES (auto-escalates to PRIORITY minimum):
Abuja-Kaduna expressway, Kaduna-Abuja, Minna-Bida, Okene-Lokoja, Benin-Warri

RESPONSE FORMAT (JSON only):
{
  "severity": "FLASH" | "PRIORITY" | "ROUTINE",
  "primary_reason": string,
  "escalating_factors": string[],
  "de_escalating_factors": string[],
  "confidence": number,
  "recommended_action": "immediate_broadcast" | "operator_review" | "log_only",
  "operator_note": string | null
}
```

---

## QW-03: OSINT ARTICLE CLASSIFICATION

### Endpoint: POST /classify-osint

**Request:**
```json
{ "headline": "string", "snippet": "string", "source_url": "string" }
```

**System prompt:**
```
You are an OSINT classification assistant for RAVENCRY, Nigeria's missing persons alert platform.

You receive news article headlines and snippets from Nigerian news sources and social media. Your job is to determine if the article is relevant to the RAVENCRY mission and extract any actionable information.

RESPONSE FORMAT (JSON only):
{
  "is_kidnapping_related": boolean,
  "is_missing_person_related": boolean,
  "is_security_incident": boolean,
  "actionable": boolean,
  "location_mentioned": string | null,
  "state_mentioned": string | null,
  "victim_count": number | null,
  "urgency": "high" | "medium" | "low" | "none",
  "summary": string,
  "recommended_action": "create_draft_case" | "flag_for_ops" | "discard",
  "reasoning": string
}
```

---

## QW-04: ANTI-FAKE DETECTION

### Endpoint: POST /check-authenticity

**Request:**
```json
{
  "text": "string",
  "media_metadata": {
    "upload_time": "ISO string",
    "file_size_bytes": number,
    "exif_date_taken": "ISO string | null",
    "reverse_search_hits": number
  } | null,
  "reporter_trust_score": number,
  "similar_reports_count": number
}
```

**System prompt:**
```
You are the authenticity verification assistant for RAVENCRY, a high-stakes Nigerian public safety platform where false alerts cause serious harm.

Analyse this report for signs of misinformation, recycled content, or deliberate hoax. Consider:

RED FLAGS (each reduces authenticity score):
- Generic description that could apply to any child
- No specific location or time detail
- Media timestamp predates report by >30 days
- High reverse image search hits (image seen before online)
- Same report pattern as recent known hoaxes
- Emotional manipulation language without specific facts ("PLEASE SHARE URGENTLY" without details)
- Report copied from old case

GREEN FLAGS (each increases authenticity score):
- Specific LGA and landmark mentioned
- Consistent time + location detail
- Reporter provides own phone number
- Photo EXIF date matches reported time
- Low reverse image search hits
- First report from this phone number

RESPONSE FORMAT (JSON only):
{
  "authenticity_score": number,
  "verdict": "proceed" | "hold_for_review" | "likely_fake" | "confirmed_fake",
  "flags": string[],
  "green_flags": string[],
  "recommended_action": string,
  "operator_note": string
}
```

---

## QWEN CLIENT: `client.mjs`

```javascript
import OpenAI from 'openai'  // Qwen uses OpenAI-compatible SDK

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
})

export async function qwenComplete({ system, user, model = 'qwen-turbo', maxRetries = 2 }) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,  // Low temp for consistent structured output
        max_tokens: 800
      })
      const raw = response.choices[0].message.content
      return JSON.parse(raw)
    } catch (err) {
      if (attempt === maxRetries) throw err
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}
```

**Model selection logic:**
- FLASH case classification: use `qwen-plus` (more accurate)
- Field extraction from voice transcript: use `qwen-plus`
- OSINT classification (high volume): use `qwen-turbo`
- Anti-fake detection: use `qwen-plus`

---

## WHISPER INTEGRATION: `services/whisper/`

```dockerfile
# Dockerfile for Whisper service
FROM python:3.11-slim
RUN pip install faster-whisper flask
COPY whisper_server.py .
CMD ["python", "whisper_server.py"]
```

```python
# whisper_server.py
from faster_whisper import WhisperModel
from flask import Flask, request, jsonify
import tempfile, os

app = Flask(__name__)
model = WhisperModel("small", device="cpu", compute_type="int8")  # CPU-optimised

@app.route('/transcribe', methods=['POST'])
def transcribe():
    audio = request.files.get('audio')
    if not audio:
        return jsonify({"error": "No audio file"}), 400
    with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as f:
        audio.save(f.name)
        segments, info = model.transcribe(f.name, language=None)  # auto-detect
        os.unlink(f.name)
    transcript = " ".join([s.text for s in segments])
    return jsonify({
        "transcript": transcript,
        "language_detected": info.language,
        "language_confidence": info.language_probability
    })
```

**Supported languages:** Whisper `small` model handles Hausa and Yoruba with reasonable accuracy. Igbo accuracy is lower — flag low-confidence transcripts for human review.

---

## DOCKER COMPOSE ADDITIONS

```yaml
qwen-service:
  build: ./services/qwen
  container_name: ravencry-qwen
  restart: unless-stopped
  ports:
    - "3002:3002"
  env_file: .env
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3002/health"]

whisper-service:
  build: ./services/whisper
  container_name: ravencry-whisper
  restart: unless-stopped
  ports:
    - "8000:8000"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

---

## VERIFICATION CHECKLIST

- [ ] POST /extract with Hausa text → returns correct JSON with `language_detected: "hausa"`
- [ ] POST /extract with Pidgin text → extracts name, location, age correctly
- [ ] POST /extract with voice transcript → works same as text
- [ ] POST /classify → child abduction in Zamfara → returns FLASH
- [ ] POST /classify → adult missing, Lagos, no violence → returns ROUTINE
- [ ] POST /classify-osint → Punch News kidnapping headline → `actionable: true`
- [ ] POST /check-authenticity → recycled image (high reverse hits) → `verdict: "hold_for_review"`
- [ ] All 5 test cases pass in `__tests__/`
- [ ] qwen-plus used for FLASH classifications (check model in logs)
- [ ] Whisper transcribes Hausa voice note → readable transcript
