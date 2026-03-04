import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

import { MOCK_OPENAI_RESPONSE, MOCK_EMPTY_OPENAI_RESPONSE } from '../../fixtures/llm-responses.js';
import { MOCK_REPO, MOCK_CHANGE_ENTRIES } from '../../fixtures/github-responses.js';
import { analyzeChanges, generateImpactSummary } from '../../../src/core/change-analyzer.js';
import type { ReleaseContext, LLMConfig } from '../../../src/types.js';
import { Logger } from '../../../src/utils/logger.js';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

import { OpenAIProvider } from '../../../src/llm/openai-provider.js';

const logger = new Logger('debug');
const config: LLMConfig = {
  provider: 'openai',
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

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates release notes', async () => {
    mockCreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);
    const provider = new OpenAIProvider(config, logger);
    const notes = await provider.generateReleaseNotes(buildContext());

    expect(notes).toContain('Features');
    expect(notes).toContain('Bug Fixes');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('uses specified model', async () => {
    mockCreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);
    const provider = new OpenAIProvider({ ...config, model: 'gpt-4o' }, logger);
    await provider.generateReleaseNotes(buildContext());

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('throws on empty response', async () => {
    mockCreate.mockResolvedValue(MOCK_EMPTY_OPENAI_RESPONSE);
    const provider = new OpenAIProvider(config, logger);

    await expect(provider.generateReleaseNotes(buildContext())).rejects.toThrow(
      'OpenAI returned empty response',
    );
  });
});
