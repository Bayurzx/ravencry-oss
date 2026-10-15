/**
 * Qwen Provider (DashScope API)
 * 
 * Hackathon default provider. Uses OpenAI-compatible SDK
 * pointed at DashScope international endpoint.
 * 
 * ENV:
 *   LLM_API_KEY=sk-...           (DashScope API key)
 *   LLM_MODEL=qwen-plus          (optional, default: qwen-plus)
 *   LLM_BASE_URL=https://...     (optional, default: DashScope intl)
 */

import OpenAI from 'openai';
import type {
  ILLMProvider,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './base';

const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export class QwenProvider implements ILLMProvider {
  readonly name = 'qwen';
  readonly defaultModel: string;
  readonly cheapModel = 'qwen-turbo';
  readonly accurateModel = 'qwen-plus';

  private client!: OpenAI;

  constructor() {
    this.defaultModel = process.env.LLM_MODEL || 'qwen-plus';
  }

  async init(): Promise<void> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('[qwen] LLM_API_KEY is required');

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL || DEFAULT_BASE_URL,
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
        console.warn('[qwen] Failed to parse JSON response:', content.slice(0, 200));
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
