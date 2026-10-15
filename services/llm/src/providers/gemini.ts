/**
 * Google Gemini Provider
 * 
 * Uses the Gemini API directly (not the OpenAI-compatible endpoint).
 * 
 * ENV:
 *   LLM_API_KEY=AIza...          (Google AI Studio API key)
 *   LLM_MODEL=gemini-1.5-pro     (optional)
 */

import type {
  ILLMProvider,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './base';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements ILLMProvider {
  readonly name = 'gemini';
  readonly defaultModel: string;
  readonly cheapModel = 'gemini-2.5-flash';
  readonly accurateModel = 'gemini-2.5-pro';

  private apiKey!: string;

  constructor() {
    this.defaultModel = process.env.LLM_MODEL || 'gemini-2.5-flash';
  }

  async init(): Promise<void> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('[gemini] LLM_API_KEY is required');
    this.apiKey = apiKey;
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();

    // Convert OpenAI-style messages to Gemini format
    const systemInstruction = options.messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n');

    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: options.maxTokens ?? 800,
        ...(options.jsonMode !== false && {
          responseMimeType: 'application/json',
        }),
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[gemini] API error ${response.status}: ${err}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed: Record<string, unknown> | null = null;

    if (options.jsonMode !== false) {
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn('[gemini] Failed to parse JSON response:', content.slice(0, 200));
      }
    }

    return {
      content,
      parsed,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${GEMINI_BASE}/models?key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
