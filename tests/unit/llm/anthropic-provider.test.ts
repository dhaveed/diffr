import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

import { MOCK_ANTHROPIC_RESPONSE } from '../../fixtures/llm-responses.js';
import { MOCK_REPO, MOCK_CHANGE_ENTRIES } from '../../fixtures/github-responses.js';
import { analyzeChanges, generateImpactSummary } from '../../../src/core/change-analyzer.js';
import type { ReleaseContext, LLMConfig } from '../../../src/types.js';
import { Logger } from '../../../src/utils/logger.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { AnthropicProvider } from '../../../src/llm/anthropic-provider.js';

const logger = new Logger('debug');
const config: LLMConfig = {
  provider: 'anthropic',
  apiKey: 'test-key',
  maxInputTokens: 16000,
  maxOutputTokens: 1500,
  temperature: 0.2,
};

function buildContext(): ReleaseContext {
  const changes = analyzeChanges(MOCK_CHANGE_ENTRIES);
  return {
    repository: MOCK_REPO,
    previousVersion: 'v1.0.0',
    newVersion: '1.1.0',
    changes,
    impactSummary: generateImpactSummary(changes),
  };
}

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates release notes', async () => {
    mockCreate.mockResolvedValue(MOCK_ANTHROPIC_RESPONSE);
    const provider = new AnthropicProvider(config, logger);
    const notes = await provider.generateReleaseNotes(buildContext());

    expect(notes).toContain('Features');
    expect(notes).toContain('Bug Fixes');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('uses specified model', async () => {
    mockCreate.mockResolvedValue(MOCK_ANTHROPIC_RESPONSE);
    const provider = new AnthropicProvider({ ...config, model: 'claude-sonnet-4-6-20250514' }, logger);
    await provider.generateReleaseNotes(buildContext());

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6-20250514' }),
    );
  });

  it('throws on empty response', async () => {
    mockCreate.mockResolvedValue({ content: [], usage: { input_tokens: 0, output_tokens: 0 } });
    const provider = new AnthropicProvider(config, logger);

    await expect(provider.generateReleaseNotes(buildContext())).rejects.toThrow(
      'Anthropic returned empty response',
    );
  });
});
