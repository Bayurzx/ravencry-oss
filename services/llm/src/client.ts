/**
 * LLM Client Factory
 * 
 * Picks the correct provider based on LLM_PROVIDER env var.
 * All services import from here — never directly from a provider.
 * 
 * Usage:
 *   import { getLLMProvider } from './client';
 *   const llm = getLLMProvider();
 *   const result = await llm.complete({ messages: [...], jsonMode: true });
 */

import type { ILLMProvider } from './providers/base';

let _instance: ILLMProvider | null = null;

export async function getLLMProvider(): Promise<ILLMProvider> {
  if (_instance) return _instance;

  const provider = (process.env.LLM_PROVIDER || 'qwen').toLowerCase();

  switch (provider) {
    case 'qwen': {
      const { QwenProvider } = await import('./providers/qwen');
      _instance = new QwenProvider();
      break;
    }
    case 'openai':
    case 'deepseek': {
      // OpenAI-compatible provider works with DeepSeek, Together, etc.
      const { OpenAIProvider } = await import('./providers/openai');
      _instance = new OpenAIProvider();
      break;
    }
    case 'gemini': {
      const { GeminiProvider } = await import('./providers/gemini');
      _instance = new GeminiProvider();
      break;
    }
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: "${provider}". ` +
        `Supported: qwen, openai, deepseek, gemini`
      );
  }

  await _instance.init();
  console.log(`[llm] Provider initialized: ${_instance.name} (model: ${_instance.defaultModel})`);
  return _instance;
}

/**
 * Reset the cached provider instance.
 * Useful for testing or hot-reloading provider config.
 */
export function resetLLMProvider(): void {
  _instance = null;
}
