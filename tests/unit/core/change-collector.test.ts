import { describe, it, expect, vi } from 'vitest';
import { collectChanges, filterChanges, isBot, resolveBaseRef } from '../../../src/core/change-collector.js';
import type { ChangeEntry, FilterConfig } from '../../../src/types.js';
import { MOCK_REPO, MOCK_COMMITS, MOCK_PRS, MOCK_RELEASE } from '../../fixtures/github-responses.js';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

import { Logger } from '../../../src/utils/logger.js';

function createMockGitHubClient(overrides: Record<string, unknown> = {}) {
  return {
    getLatestRelease: vi.fn().mockResolvedValue(MOCK_RELEASE),
    getLatestTag: vi.fn().mockResolvedValue('v1.0.0'),
    compareCommits: vi.fn().mockResolvedValue({ commits: MOCK_COMMITS }),
    listPullRequestsForCommit: vi.fn().mockImplementation((sha: string) => {
      if (sha === 'abc123') return Promise.resolve([MOCK_PRS[0]]);
      if (sha === 'def456') return Promise.resolve([MOCK_PRS[1]]);
      return Promise.resolve([]);
    }),
    getReleaseByTag: vi.fn().mockResolvedValue(null),
    tagExists: vi.fn().mockResolvedValue(false),
    createRelease: vi.fn(),
    ...overrides,
  } as ReturnType<typeof createMockGitHubClient>;
}

const logger = new Logger('debug');
const defaultFilters: FilterConfig = {
  excludeLabels: [],
  excludeAuthors: [],
  skipBots: true,
};

describe('isBot', () => {
  it('detects [bot] suffix', () => {
    expect(isBot('dependabot[bot]')).toBe(true);
    expect(isBot('renovate[bot]')).toBe(true);
  });

  it('detects known bot names', () => {
    expect(isBot('dependabot')).toBe(true);
    expect(isBot('github-actions')).toBe(true);
    expect(isBot('renovate')).toBe(true);
  });

  it('returns false for regular users', () => {
    expect(isBot('janedoe')).toBe(false);
    expect(isBot('bobsmith')).toBe(false);
  });
});

describe('filterChanges', () => {
  const entries: ChangeEntry[] = [
    {
      commit: { sha: '1', message: 'feat: a', author: 'janedoe', date: '' },
      pullRequest: {
        number: 1, title: 'A', body: '', author: 'janedoe',
        labels: ['enhancement'], mergedAt: '', url: '',
      },
    },
    {
      commit: { sha: '2', message: 'chore: b', author: 'dependabot[bot]', date: '' },
    },
    {
      commit: { sha: '3', message: 'fix: c', author: 'bob', date: '' },
      pullRequest: {
        number: 3, title: 'C', body: '', author: 'bob',
        labels: ['no-release'], mergedAt: '', url: '',
      },
    },
  ];

  it('filters bots when skipBots is true', () => {
    const result = filterChanges(entries, { ...defaultFilters, skipBots: true }, logger);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.commit.author !== 'dependabot[bot]')).toBe(true);
  });

  it('keeps bots when skipBots is false', () => {
    const result = filterChanges(entries, { ...defaultFilters, skipBots: false }, logger);
    expect(result).toHaveLength(3);
  });

  it('filters excluded labels', () => {
    const result = filterChanges(entries, {
      ...defaultFilters,
      skipBots: false,
      excludeLabels: ['no-release'],
    }, logger);
    expect(result).toHaveLength(2);
  });

  it('filters excluded authors', () => {
    const result = filterChanges(entries, {
      ...defaultFilters,
      skipBots: false,
      excludeAuthors: ['bob'],
    }, logger);
    expect(result).toHaveLength(2);
  });
});

describe('resolveBaseRef', () => {
  it('returns latest release tag when available', async () => {
    const client = createMockGitHubClient();
    const ref = await resolveBaseRef(client as never, logger);
    expect(ref).toBe('v1.0.0');
  });

  it('falls back to latest tag when no release', async () => {
    const client = createMockGitHubClient({
      getLatestRelease: vi.fn().mockResolvedValue(null),
    });
    const ref = await resolveBaseRef(client as never, logger);
    expect(ref).toBe('v1.0.0');
  });

  it('returns null when no release or tag', async () => {
    const client = createMockGitHubClient({
      getLatestRelease: vi.fn().mockResolvedValue(null),
      getLatestTag: vi.fn().mockResolvedValue(null),
    });
    const ref = await resolveBaseRef(client as never, logger);
    expect(ref).toBeNull();
  });
});

describe('collectChanges', () => {
  it('collects changes and filters bots', async () => {
    const client = createMockGitHubClient();
    const result = await collectChanges(
      client as never,
      MOCK_REPO,
      'HEAD',
      defaultFilters,
      logger,
    );
    expect(result.baseRef).toBe('v1.0.0');
    // dependabot[bot] should be filtered
    expect(result.entries.length).toBe(3);
  });

  it('returns empty entries for first release', async () => {
    const client = createMockGitHubClient({
      getLatestRelease: vi.fn().mockResolvedValue(null),
      getLatestTag: vi.fn().mockResolvedValue(null),
    });
    const result = await collectChanges(
      client as never,
      MOCK_REPO,
      'HEAD',
      defaultFilters,
      logger,
    );
    expect(result.baseRef).toBeNull();
    expect(result.entries).toHaveLength(0);
  });

  it('returns empty entries when no new commits', async () => {
    const client = createMockGitHubClient({
      compareCommits: vi.fn().mockResolvedValue({ commits: [] }),
    });
    const result = await collectChanges(
      client as never,
      MOCK_REPO,
      'HEAD',
      defaultFilters,
      logger,
    );
    expect(result.entries).toHaveLength(0);
  });

  it('strips HTML tags from PR bodies without decoding tag-shaped entities', async () => {
    const client = createMockGitHubClient({
      listPullRequestsForCommit: vi.fn().mockResolvedValue([
        {
          ...MOCK_PRS[0],
          body: '<p>Hello &amp; welcome</p><script>alert(1)</script>&lt;script&gt;encoded&lt;/script&gt;',
        },
      ]),
    });

    const result = await collectChanges(
      client as never,
      MOCK_REPO,
      'HEAD',
      { ...defaultFilters, skipBots: false },
      logger,
    );

    const body = result.entries[0]?.pullRequest?.body;
    expect(body).toContain('Hello & welcome');
    expect(body).toContain('&lt;script&gt;encoded&lt;/script&gt;');
    expect(body).not.toContain('alert(1)');
    expect(body).not.toContain('<script>');
  });

  it('decodes only safe text entities after stripping markup', async () => {
    const client = createMockGitHubClient({
      listPullRequestsForCommit: vi.fn().mockResolvedValue([
        {
          ...MOCK_PRS[0],
          body: '<div>Tom &amp;amp; Jerry &quot;quote&quot; &#39;apostrophe&#39; &nbsp; test</div>',
        },
      ]),
    });

    const result = await collectChanges(
      client as never,
      MOCK_REPO,
      'HEAD',
      { ...defaultFilters, skipBots: false },
      logger,
    );

    expect(result.entries[0]?.pullRequest?.body).toBe(`Tom &amp; Jerry "quote" 'apostrophe'   test`);
  });
});
