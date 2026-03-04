import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

// Mock Octokit
const mockOctokit = {
  repos: {
    getLatestRelease: vi.fn(),
    listTags: vi.fn(),
    compareCommits: vi.fn(),
    listPullRequestsAssociatedWithCommit: vi.fn(),
    getReleaseByTag: vi.fn(),
    createRelease: vi.fn(),
  },
  git: {
    getRef: vi.fn(),
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => mockOctokit),
}));

// Mock OpenAI
const mockOpenAICreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  })),
}));

import { runPipeline } from '../../src/orchestrator.js';
import { Logger } from '../../src/utils/logger.js';
import type { DiffrConfig } from '../../src/types.js';
import { MOCK_REPO, MOCK_COMMITS, MOCK_PRS, MOCK_RELEASE } from '../fixtures/github-responses.js';
import { MOCK_OPENAI_RESPONSE } from '../fixtures/llm-responses.js';

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

function setupHappyPath() {
  mockOctokit.repos.getLatestRelease.mockResolvedValue({ data: MOCK_RELEASE });
  mockOctokit.repos.compareCommits.mockResolvedValue({
    data: { commits: MOCK_COMMITS.filter((c) => c.author?.login !== 'dependabot[bot]') },
  });
  mockOctokit.repos.listPullRequestsAssociatedWithCommit.mockImplementation(
    ({ commit_sha }: { commit_sha: string }) => {
      if (commit_sha === 'abc123') return Promise.resolve({ data: [MOCK_PRS[0]] });
      if (commit_sha === 'def456') return Promise.resolve({ data: [MOCK_PRS[1]] });
      return Promise.resolve({ data: [] });
    },
  );
  mockOctokit.repos.getReleaseByTag.mockRejectedValue({ status: 404 });
  mockOctokit.repos.createRelease.mockResolvedValue({
    data: {
      id: 2,
      tag_name: 'v1.0.1',
      html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.1',
      name: 'v1.0.1',
      body: 'notes',
      draft: false,
      prerelease: false,
    },
  });
  mockOpenAICreate.mockResolvedValue(MOCK_OPENAI_RESPONSE);
}

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs full pipeline successfully', async () => {
    setupHappyPath();
    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.version).toBe('1.0.1');
    expect(result.tag).toBe('v1.0.1');
    expect(result.releaseNotes).toContain("What's New");
    expect(result.release).toBeDefined();
  });

  it('skips when no changes detected', async () => {
    mockOctokit.repos.getLatestRelease.mockResolvedValue({ data: MOCK_RELEASE });
    mockOctokit.repos.compareCommits.mockResolvedValue({ data: { commits: [] } });

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain('No changes');
  });

  it('falls back when LLM fails', async () => {
    setupHappyPath();
    mockOpenAICreate.mockRejectedValue(new Error('API error'));

    const result = await runPipeline(buildConfig(), MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.releaseNotes).toContain("What's New");
    // Fallback notes should contain PR titles
    expect(result.releaseNotes).toContain('Add OAuth2 support');
  });

  it('uses fallback when no API key configured', async () => {
    setupHappyPath();
    const config = buildConfig({ llm: { ...buildConfig().llm, apiKey: '' } });
    const result = await runPipeline(config, MOCK_REPO, 'main', logger);

    expect(result.success).toBe(true);
    expect(result.releaseNotes).toContain("What's New");
    expect(mockOpenAICreate).not.toHaveBeenCalled();
  });

  it('handles dry run mode', async () => {
    setupHappyPath();
    const result = await runPipeline(
      buildConfig({ dryRun: true }),
      MOCK_REPO,
      'main',
      logger,
    );

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.release).toBeUndefined();
    expect(mockOctokit.repos.createRelease).not.toHaveBeenCalled();
  });

  it('handles explicit version override', async () => {
    setupHappyPath();
    const result = await runPipeline(
      buildConfig({ explicitVersion: '2.0.0' }),
      MOCK_REPO,
      'main',
      logger,
    );

    expect(result.version).toBe('2.0.0');
    expect(result.tag).toBe('v2.0.0');
  });

  it('omits compare link when includeCompareLink is false', async () => {
    setupHappyPath();
    const result = await runPipeline(
      buildConfig({
        notes: {
          tone: 'technical',
          style: 'detailed',
          includeAuthors: true,
          includePrLinks: true,
          includeCompareLink: false,
        },
      }),
      MOCK_REPO,
      'main',
      logger,
    );

    expect(result.success).toBe(true);
    expect(result.releaseNotes).not.toContain('[Compare changes]');
  });
});
