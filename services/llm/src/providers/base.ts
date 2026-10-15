/**
 * RAVENCRY LLM Provider Interface
 * 
 * This is the abstraction layer that makes RAVENCRY LLM-agnostic.
 * All AI operations go through this interface. Swap providers by
 * changing LLM_PROVIDER env var — no other code changes needed.
 * 
 * Supported providers:
 *   - qwen     (Qwen API via DashScope — hackathon default)
 *   - openai   (OpenAI-compatible — also works with DeepSeek)
 *   - gemini   (Google Gemini API)
 * 
 * ENV:
 *   LLM_PROVIDER=qwen|openai|gemini
 *   LLM_API_KEY=sk-...
 *   LLM_BASE_URL=https://... (optional, override for DeepSeek etc.)
 *   LLM_MODEL=qwen-plus|gpt-4o|gemini-1.5-pro (optional, provider picks default)
 */

// ============================================================================
// Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  temperature?: number;      // default: 0.1 (low for deterministic extraction)
  maxTokens?: number;        // default: 800
  jsonMode?: boolean;        // default: true (response_format: json_object)
  model?: string;            // override per-call (e.g. use turbo for batching)
}

export interface LLMCompletionResult {
  content: string;           // raw response text
  parsed: Record<string, unknown> | null;  // parsed JSON (if jsonMode)
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;             // actual model used
  provider: string;          // qwen|openai|gemini
  latencyMs: number;         // wall-clock time
}

// ============================================================================
// Abstract Provider Interface
// ============================================================================

export interface ILLMProvider {
  /** Provider identifier */
  readonly name: string;

  /** Initialize the provider (validate API key, etc.) */
  init(): Promise<void>;

  /** Send a chat completion request */
  complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;

  /** Health check — returns true if API is reachable */
  healthCheck(): Promise<boolean>;

  /** Default model for this provider */
  readonly defaultModel: string;

  /** Model to use for high-volume/low-cost operations (e.g. OSINT batching) */
  readonly cheapModel: string;

  /** Model to use for safety-critical operations (e.g. FLASH classification) */
  readonly accurateModel: string;
}

// ============================================================================
// Model tier selection helper
// ============================================================================

export type ModelTier = 'cheap' | 'default' | 'accurate';

export function getModelForTier(provider: ILLMProvider, tier: ModelTier): string {
  switch (tier) {
    case 'cheap': return provider.cheapModel;
    case 'accurate': return provider.accurateModel;
    default: return provider.defaultModel;
  }
}

// ============================================================================
// Standard RAVENCRY extraction/classification types
// ============================================================================

export interface ExtractionResult {
  person_name: string | null;
  age_estimate: number | null;
  age_unit: 'years' | 'months' | null;
  gender: 'male' | 'female' | 'unknown';
  clothing_desc: string | null;
  distinguishing_features: string | null;
  circumstance: 'abduction' | 'missing' | 'witnessed_kidnapping' | 'unknown';
  last_seen_location: string | null;
  last_seen_lga: string | null;
  last_seen_state: string | null;
  last_seen_time: string | null;
  reporter_relationship: string | null;
  num_victims: number;
  weapons_mentioned: string[];
  vehicle_mentioned: string | null;
  language_detected: 'english' | 'hausa' | 'yoruba' | 'igbo' | 'pidgin' | 'mixed';
  confidence: number;
  missing_critical_fields: string[];
}

export interface ClassificationResult {
  tier: 'FLASH' | 'PRIORITY' | 'ROUTINE';
  reasoning: string;
  is_child: boolean;
  is_hotspot: boolean;
  escalating_factors: string[];
  de_escalating_factors: string[];
  recommended_action: 'immediate_broadcast' | 'operator_review' | 'log_only';
  operator_note: string | null;
  confidence: number;
}

export interface OSINTClassificationResult {
  actionable: boolean;
  tier: 'FLASH' | 'PRIORITY' | 'ROUTINE' | 'IGNORE';
  create_draft_case: boolean;
  reasoning: string;
}

export interface AntiFakeResult {
  verdict: 'legitimate' | 'suspicious' | 'hold_for_review' | 'likely_fake';
  authenticity_score: number;
  red_flags: string[];
  green_flags: string[];
  reasoning: string;
}
