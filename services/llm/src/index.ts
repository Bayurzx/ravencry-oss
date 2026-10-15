import express from 'express';
import dotenv from 'dotenv';
import { getLLMProvider } from './client';
import { extractPrompt } from './prompts/extract';
import { classifyPrompt } from './prompts/classify';
import { osintPrompt } from './prompts/osint';
import { antifakePrompt } from './prompts/antifake';
import { validateExtractionOutput, validateClassifyOutput, validateOSINTOutput, validateAntiFakeOutput } from './validation/schema';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// LLM Provider (lazy-initialised on first request)
// ---------------------------------------------------------------------------
let providerReady = false;

async function ensureProvider() {
  if (!providerReady) {
    const provider = await getLLMProvider();
    providerReady = true;
    console.log(`[llm] Provider ready: ${provider.name} (model: ${provider.defaultModel})`);
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: process.env.LLM_PROVIDER || 'qwen',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /extract — QW-01: Extract person details from report text
// ---------------------------------------------------------------------------
app.post('/extract', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'missing_required_fields', fields: ['text'] });
      return;
    }

    await ensureProvider();
    const llm = await getLLMProvider();

    const result = await llm.complete({
      messages: [
        { role: 'system', content: extractPrompt.system },
        { role: 'user', content: extractPrompt.user(text, language || 'auto') },
      ],
      temperature: 0.1,
      maxTokens: 500,
      jsonMode: true,
    });

    const parsed = result.parsed || {};

    // Post-LLM validation: catch malformed output before downstream consumers see it
    const validationErrors = validateExtractionOutput(parsed);
    if (validationErrors.length > 0) {
      console.warn('[llm] /extract validation warnings:', JSON.stringify(validationErrors));
    }

    // Ensure defaults for critical missing fields
    const output = {
      person_name: null,
      age_estimate: null,
      age_unit: null,
      gender: 'unknown',
      clothing_desc: null,
      distinguishing_features: null,
      circumstance: 'unknown',
      last_seen_location: null,
      last_seen_lga: null,
      last_seen_state: null,
      last_seen_time: null,
      reporter_relationship: null,
      num_victims: 1,
      weapons_mentioned: [],
      vehicle_mentioned: null,
      language_detected: 'unknown',
      confidence: 0,
      missing_critical_fields: [],
      ...parsed,
    };

    res.json(output);
  } catch (err: any) {
    console.error('Extract error:', err);
    res.status(502).json({ error: 'llm_error', code: 'ERR_LLM_EXTRACT', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /classify — QW-02: Severity classification (FLASH/PRIORITY/ROUTINE)
// ---------------------------------------------------------------------------
app.post('/classify', async (req, res) => {
  try {
    const { person, location } = req.body;
    if (!person || !location) {
      res.status(400).json({ error: 'missing_required_fields', fields: ['person', 'location'] });
      return;
    }

    await ensureProvider();
    const llm = await getLLMProvider();

    const result = await llm.complete({
      messages: [
        { role: 'system', content: classifyPrompt.system },
        { role: 'user', content: classifyPrompt.user(`Person: ${JSON.stringify(person)}\nLocation: ${JSON.stringify(location)}`) },
      ],
      temperature: 0.1,
      maxTokens: 300,
      jsonMode: true,
    });

    const parsed = result.parsed || {};

    // Post-LLM validation
    const validationErrors = validateClassifyOutput(parsed);
    if (validationErrors.length > 0) {
      console.warn('[llm] /classify validation warnings:', JSON.stringify(validationErrors));
    }

    // Safe defaults — never let downstream see undefined
    const output = {
      tier: 'ROUTINE' as const,
      reasoning: '',
      is_child: false,
      is_hotspot: false,
      escalating_factors: [] as string[],
      de_escalating_factors: [] as string[],
      recommended_action: 'operator_review' as const,
      operator_note: null,
      confidence: 0.5,
      ...parsed,
    };

    res.json(output);
  } catch (err: any) {
    console.error('Classify error:', err);
    res.status(502).json({ error: 'llm_error', code: 'ERR_LLM_CLASSIFY', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /classify-osint — QW-03: OSINT article classification
// ---------------------------------------------------------------------------
app.post('/classify-osint', async (req, res) => {
  try {
    const { headline, snippet, source } = req.body;
    await ensureProvider();
    const llm = await getLLMProvider();

    const result = await llm.complete({
      messages: [
        { role: 'system', content: osintPrompt.system },
        { role: 'user', content: osintPrompt.user(headline, snippet, source || 'unknown') },
      ],
      model: llm.cheapModel,
      temperature: 0.1,
      maxTokens: 300,
      jsonMode: true,
    });

    const parsed = result.parsed || {};
    const validationErrors = validateOSINTOutput(parsed);
    if (validationErrors.length > 0) {
      console.warn('[llm] /classify-osint validation warnings:', JSON.stringify(validationErrors));
    }

    const output = {
      actionable: false,
      tier: 'IGNORE' as const,
      create_draft_case: false,
      reasoning: '',
      ...parsed,
    };

    res.json(output);
  } catch (err: any) {
    console.error('OSINT classify error:', err);
    res.status(502).json({ error: 'llm_error', code: 'ERR_LLM_OSINT', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /check-authenticity — QW-04: Anti-fake detection
// ---------------------------------------------------------------------------
app.post('/check-authenticity', async (req, res) => {
  try {
    const { text, reporter_phone, similar_reports_count } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'missing_required_fields', fields: ['text'] });
      return;
    }

    await ensureProvider();
    const llm = await getLLMProvider();

    const result = await llm.complete({
      messages: [
        { role: 'system', content: antifakePrompt.system },
        { role: 'user', content: antifakePrompt.user(text, reporter_phone, similar_reports_count) },
      ],
      temperature: 0.1,
      maxTokens: 400,
      jsonMode: true,
    });

    const parsed = result.parsed || {};
    const validationErrors = validateAntiFakeOutput(parsed);
    if (validationErrors.length > 0) {
      console.warn('[llm] /check-authenticity validation warnings:', JSON.stringify(validationErrors));
    }

    // Safe defaults — trust by default (verdict: legitimate, score: 0.7)
    const output = {
      verdict: 'legitimate' as const,
      authenticity_score: 0.7,
      red_flags: [] as string[],
      green_flags: [] as string[],
      reasoning: '',
      ...parsed,
    };

    res.json(output);
  } catch (err: any) {
    console.error('Anti-fake error:', err);
    res.status(502).json({ error: 'llm_error', code: 'ERR_LLM_ANTIFAKE', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Root endpoint - Production-safe system info
// ---------------------------------------------------------------------------
app.get('/', async (_req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Public endpoints only - no internal details
  const publicEndpoints = [
    {
      method: 'GET',
      path: '/health',
      description: 'Service health check',
    },
    {
      method: 'POST',
      path: '/extract',
      description: 'Extract person details from report text',
      required_fields: ['text'],
    },
    {
      method: 'POST',
      path: '/classify',
      description: 'Severity classification',
      required_fields: ['person', 'location'],
    },
    {
      method: 'POST', 
      path: '/classify-osint',
      description: 'OSINT article classification',
      required_fields: ['headline', 'snippet', 'source'],
    },
    {
      method: 'POST',
      path: '/check-authenticity',
      description: 'Content authenticity verification',
      required_fields: ['text'],
    },
  ];

  // Production-safe response
  const response: any = {
    service: 'RAVENCRY LLM Service',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: publicEndpoints,
    docs: 'https://docs.ravencry.internal/api',
  };

  // Only add debug info in non-production
  if (!isProduction) {
    // Check environment (no values, just boolean)
    const envStatus: any = {};
    const requiredVars = ['LLM_API_KEY', 'LLM_PROVIDER', 'LLM_BASE_URL'];
    
    requiredVars.forEach(varName => {
      envStatus[varName] = {
        configured: !!process.env[varName],
      };
    });

    response.environment = {
      node_env: process.env.NODE_ENV || 'development',
      variables: envStatus,
      warnings: requiredVars.filter(v => !process.env[v]).length > 0 
        ? `${requiredVars.filter(v => !process.env[v]).length} required vars missing`
        : null,
    };

    // Provider connection check (only in dev)
    try {
      const provider = await getLLMProvider();
      response.provider = {
        connected: true,
      };
    } catch (err: any) {
      response.provider = {
        connected: false,
        error: err.message,
      };
    }
  }

  res.json(response);
});

// ---------------------------------------------------------------------------
// Start (skip in test mode — supertest manages its own lifecycle)
// ---------------------------------------------------------------------------
// vitest always sets VITEST=true; NODE_ENV may not be set in vitest runs
if (!process.env.VITEST) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧠 RAVENCRY LLM Service running on port ${PORT}`);
    console.log(`   Provider: ${process.env.LLM_PROVIDER || 'qwen'}`);
  });
}

export default app;
