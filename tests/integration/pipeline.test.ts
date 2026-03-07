import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

// --- Mock state ---
const mockOctokit = {
  repos: {
    getLatestRelease: vi.fn(),
    listTags: vi.fn(),
    compareCommits: vi.fn(),
    listPullRequestsAssociatedWithCommit: vi.fn(),
    getReleaseByTag: vi.fn(),
    createRelease: vi.fn(),
  },
  git: { getRef: vi.fn() },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => mockOctokit),
}));

const mockOpenAICreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  })),
}));

const mockAnthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

import { runPipeline } from '../../src/orchestrator.js';
import { Logger } from '../../src/utils/logger.js';
import type { DiffrConfig } from '../../src/types.js';
import { MOCK_REPO, MOCK_COMMITS, MOCK_PRS, MOCK_RELEASE } from '../fixtures/github-responses.js';
import { MOCK_OPENAI_RESPONSE, MOCK_ANTHROPIC_RESPONSE } from '../fixtures/llm-responses.js';

const logger = new Logger('debug');

function buildConfig(overrides?: Partial<DiffrConfig>): DiffrConfig {
  return {
    githubToken: 'test-token',
    llm: {
      provider: 'openai',
      apiKey: 'test-key',
      maxInputTokens: 16000,
      maxOutputTokens: 1500,
      temperature: 0.2,
    },
    versionPrefix: 'v',
    initialVersion: '0.1.0',
    dryRun: false,
    configPath: '.diffr.yml',
    filters: {
      excludeLabels: [],
      excludeAuthors: [],
      skipBots: true,
    },
    notes: {
      tone: 'technical',
      style: 'detailed',
      includeAuthors: true,
      includePrLinks: true,
      includeCompareLink: true,
    },
    release: { draft: false, prerelease: false },
    ...overrides,
  };
}

const CREATED_RELEASE = {
  id: 2,
  tag_name: 'v2.0.0',
  html_url: 'https://github.com/test-owner/test-repo/releases/tag/v2.0.0',
  name: 'v2.0.0',
  body: 'notes',
  draft: false,
  prerelease: false,
};

function setupStandardMocks() {
  const nonBotCommits = MOCK_COMMITS.filter((c) => !c.author?.login.includes('[bot]'));
  mockOctokit.repos.getLatestRelease.mockResolvedValue({ data: MOCK_RELEASE });
  mockOctokit.repos.listTags.mockResolvedValue({ data: [{ name: 'v1.0.0' }] });
  mockOctokit.repos.compareCommits.mockResolvedValue({ data: { commits: nonBotCommits } });
  mockOctokit.repos.listPullRequestsAssociatedWithCommit.mockImplementation(
    ({ commit_sha }: { commit_sha: string }) => {
      if (commit_sha === 'abc123') return Promise.resolve({ data: [MOCK_PRS[0]] });
      if (commit_sha === 'def456') return Promise.resolve({ data: [MOCK_PRS[1]] });
      return Promise.resolve({ data: [] });
    },
  );
  mockOctokit.repos.getReleaseByTag.mockRejectedValue({ status: 404 });
  mockOctokit.repos.createRelease.mockResolvedValue({ data: CREATED_RELEASE });
}

describe('Integration: Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Scenario 1: Happy path with OpenAI
  it('creates a release with OpenAI provider', async () => {
    setupStandardMocks();
    mockOpenAICreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.version).toBe('2.0.0');
    expect(result.tag).toBe('v2.0.0');
    expect(result.releaseNotes).toContain("What's New in v2.0.0");
    expect(result.releaseNotes).toContain('Features');
    expect(result.releaseNotes).toContain('[Compare changes]');
    expect(result.release?.url).toBeDefined();
    expect(mockOctokit.repos.createRelease).toHaveBeenCalledOnce();
  });

  // Scenario 2: Happy path with Anthropic
  it('creates a release with Anthropic provider', async () => {
    setupStandardMocks();
    mockAnthropicCreate.mockResolvedValue(MOCK_ANTHROPIC_RESPONSE);

    const result = await runPipeline(
      buildConfig({
        llm: {
          provider: 'anthropic',
          apiKey: 'test-anthropic-key',
          maxInputTokens: 16000,
          maxOutputTokens: 1500,
          temperature: 0.2,
        },
      }),
      MOCK_REPO,
      'main',
      logger,
    );

    expect(result.success).toBe(true);
    expect(result.releaseNotes).toContain('Features');
    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
  });

  // Scenario 3: LLM failure → fallback
  it('falls back to structured notes when LLM fails', async () => {
    setupStandardMocks();
    mockOpenAICreate.mockRejectedValue(new Error('LLM API error'));

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.releaseNotes).toContain("What's New");
    expect(result.releaseNotes).toContain('Add OAuth2 support');
    expect(result.releaseNotes).toContain('Fix redirect loop');
  });

  // Scenario 4: Dry run
  it('does not create release in dry-run mode', async () => {
    setupStandardMocks();
    mockOpenAICreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);

    const result = await runPipeline(buildConfig({ dryRun: true }), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.release).toBeUndefined();
    expect(result.releaseNotes).toBeDefined();
    expect(mockOctokit.repos.createRelease).not.toHaveBeenCalled();
  });

  // Scenario 5: First release (no prior tags)
  it('handles first release with no prior tags', async () => {
    mockOctokit.repos.getLatestRelease.mockRejectedValue({ status: 404 });
    mockOctokit.repos.listTags.mockResolvedValue({ data: [] });

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    // No base ref means empty entries → but baseRef is null so it's first release
    // The pipeline returns early for no changes when baseRef exists,
    // but for first release (baseRef=null) it returns empty entries
    expect(result.success).toBe(true);
  });

  // Scenario 6: Idempotent (release already exists)
  it('returns existing release without creating duplicate', async () => {
    setupStandardMocks();
    mockOpenAICreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);
    mockOctokit.repos.getReleaseByTag.mockResolvedValue({
      data: {
        id: 1,
        tag_name: 'v2.0.0',
        html_url: 'https://github.com/test-owner/test-repo/releases/tag/v2.0.0',
        name: 'v2.0.0',
        body: 'existing notes',
        draft: false,
        prerelease: false,
      },
    });

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.release?.alreadyExisted).toBe(true);
    expect(mockOctokit.repos.createRelease).not.toHaveBeenCalled();
  });

  // Scenario 7: All changes filtered → no release
  it('skips release when all changes are filtered out', async () => {
    mockOctokit.repos.getLatestRelease.mockResolvedValue({ data: MOCK_RELEASE });
    mockOctokit.repos.compareCommits.mockResolvedValue({
      data: {
        commits: [
          {
            sha: 'bot1',
            commit: { message: 'chore: deps', author: { name: 'Bot', date: '' } },
            author: { login: 'dependabot[bot]' },
          },
        ],
      },
    });
    mockOctokit.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({ data: [] });

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  // Scenario 8: Explicit version override
  it('uses explicit version override', async () => {
    setupStandardMocks();
    mockOpenAICreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);
    mockOctokit.repos.createRelease.mockResolvedValue({
      data: { ...CREATED_RELEASE, tag_name: 'v3.0.0' },
    });

    const result = await runPipeline(
      buildConfig({ explicitVersion: '3.0.0' }),
      MOCK_REPO,
      'main',
      logger,
    );

    expect(result.success).toBe(true);
    expect(result.version).toBe('3.0.0');
    expect(result.tag).toBe('v3.0.0');
  });
});
