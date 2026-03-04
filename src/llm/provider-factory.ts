import type { LLMConfig, LLMProvider } from '../types.js';
import type { Logger } from '../utils/logger.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';

export function createLLMProvider(config: LLMConfig, logger: Logger): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config, logger);
    case 'anthropic':
      return new AnthropicProvider(config, logger);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
