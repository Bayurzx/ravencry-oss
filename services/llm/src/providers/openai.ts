/**
 * OpenAI-Compatible Provider
 * 
 * Works with: OpenAI, DeepSeek, Together AI, Groq, or any
 * service that implements the OpenAI chat completions API.
 * 
 * ENV:
 *   LLM_API_KEY=sk-...
 *   LLM_BASE_URL=https://api.openai.com/v1           (OpenAI)
 *   LLM_BASE_URL=https://api.deepseek.com/v1         (DeepSeek)
 *   LLM_BASE_URL=https://api.together.xyz/v1         (Together)
 *   LLM_MODEL=gpt-4o|deepseek-chat|...               (optional)
 */

import OpenAI from 'openai';
import type {
  ILLMProvider,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './base';

// Default model tiers per known provider
const PROVIDER_DEFAULTS: Record<string, { default: string; cheap: string; accurate: string }> = {
  'api.openai.com':    { default: 'gpt-4o-mini', cheap: 'gpt-4o-mini', accurate: 'gpt-4o' },
  'api.deepseek.com':  { default: 'deepseek-chat', cheap: 'deepseek-chat', accurate: 'deepseek-chat' },
  'api.together.xyz':  { default: 'meta-llama/Llama-3-70b-chat-hf', cheap: 'meta-llama/Llama-3-8b-chat-hf', accurate: 'meta-llama/Llama-3-70b-chat-hf' },
};

export class OpenAIProvider implements ILLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  readonly cheapModel: string;
  readonly accurateModel: string;

  private client!: OpenAI;

  constructor() {
    const baseURL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const host = new URL(baseURL).host;
    const defaults = PROVIDER_DEFAULTS[host] || PROVIDER_DEFAULTS['api.openai.com'];

    this.name = `openai-compatible (${host})`;
    this.defaultModel = process.env.LLM_MODEL || defaults.default;
    this.cheapModel = defaults.cheap;
    this.accurateModel = defaults.accurate;
  }

  async init(): Promise<void> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('[openai] LLM_API_KEY is required');

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    });
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 800,
      ...(options.jsonMode !== false && {
        response_format: { type: 'json_object' as const },
      }),
    });

    const content = response.choices[0]?.message?.content || '';
    let parsed: Record<string, unknown> | null = null;

    if (options.jsonMode !== false) {
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn(`[${this.name}] Failed to parse JSON response:`, content.slice(0, 200));
      }
    }

    return {
      content,
      parsed,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.cheapModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}
