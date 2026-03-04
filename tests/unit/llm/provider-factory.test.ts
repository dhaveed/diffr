import { describe, it, expect, vi } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import { createLLMProvider } from '../../../src/llm/provider-factory.js';
import { OpenAIProvider } from '../../../src/llm/openai-provider.js';
import { AnthropicProvider } from '../../../src/llm/anthropic-provider.js';
import { Logger } from '../../../src/utils/logger.js';
import type { LLMConfig } from '../../../src/types.js';

const logger = new Logger('debug');

const baseConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test',
  maxInputTokens: 16000,
  maxOutputTokens: 1500,
  temperature: 0.2,
};

describe('createLLMProvider', () => {
  it('creates OpenAI provider', () => {
    const provider = createLLMProvider(baseConfig, logger);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('creates Anthropic provider', () => {
    const provider = createLLMProvider({ ...baseConfig, provider: 'anthropic' }, logger);
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('throws for unsupported provider', () => {
    expect(() =>
      createLLMProvider({ ...baseConfig, provider: 'unsupported' as never }, logger),
    ).toThrow('Unsupported LLM provider');
  });
});
