import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_RELEASE } from '../../fixtures/github-responses.js';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

const mockRepos = {
  getLatestRelease: vi.fn(),
  listTags: vi.fn(),
  compareCommits: vi.fn(),
  listPullRequestsAssociatedWithCommit: vi.fn(),
  getReleaseByTag: vi.fn(),
  createRelease: vi.fn(),
};
const mockGit = {
  getRef: vi.fn(),
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    repos: mockRepos,
    git: mockGit,
  })),
}));

import { GitHubClient } from '../../../src/core/github-client.js';
import { Logger } from '../../../src/utils/logger.js';

const logger = new Logger('debug');

describe('GitHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an instance', () => {
    const client = new GitHubClient('token', 'owner', 'repo', logger);
    expect(client).toBeInstanceOf(GitHubClient);
  });

  describe('getLatestRelease', () => {
    it('returns release data', async () => {
      mockRepos.getLatestRelease.mockResolvedValue({ data: MOCK_RELEASE });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const release = await client.getLatestRelease();
      expect(release).toEqual(MOCK_RELEASE);
    });

    it('returns null for 404', async () => {
      mockRepos.getLatestRelease.mockRejectedValue({ status: 404 });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const release = await client.getLatestRelease();
      expect(release).toBeNull();
    });

    it('throws for non-404 errors', async () => {
      mockRepos.getLatestRelease.mockRejectedValue({ status: 500 });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      await expect(client.getLatestRelease()).rejects.toEqual({ status: 500 });
    });
  });

  describe('getLatestTag', () => {
    it('returns tag name', async () => {
      mockRepos.listTags.mockResolvedValue({ data: [{ name: 'v1.0.0' }] });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.getLatestTag()).toBe('v1.0.0');
    });

    it('returns null when no tags', async () => {
      mockRepos.listTags.mockResolvedValue({ data: [] });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.getLatestTag()).toBeNull();
    });

    it('returns null on error', async () => {
      mockRepos.listTags.mockRejectedValue(new Error('fail'));
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.getLatestTag()).toBeNull();
    });
  });

  describe('compareCommits', () => {
    it('returns mapped commits', async () => {
      mockRepos.compareCommits.mockResolvedValue({
        data: {
          commits: [
            {
              sha: 'abc',
              commit: { message: 'feat: test', author: { name: 'Jane', date: '2026-01-01' } },
              author: { login: 'jane' },
            },
            {
              sha: 'def',
              commit: { message: 'fix: bug', author: null },
              author: null,
            },
          ],
        },
      });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const result = await client.compareCommits('v1.0.0', 'HEAD');
      expect(result.commits).toHaveLength(2);
      expect(result.commits[0].author).toEqual({ login: 'jane' });
      expect(result.commits[1].commit.author).toBeNull();
      expect(result.commits[1].author).toBeNull();
    });
  });

  describe('listPullRequestsForCommit', () => {
    it('returns merged PRs', async () => {
      mockRepos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [
          { number: 1, title: 'PR', body: 'desc', user: { login: 'u' }, labels: [{ name: 'bug' }], merged_at: '2026-01-01', html_url: 'url' },
          { number: 2, title: 'Unmerged', body: null, user: null, labels: [], merged_at: null, html_url: 'url2' },
        ],
      });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const prs = await client.listPullRequestsForCommit('abc');
      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(1);
      expect(prs[0].user).toEqual({ login: 'u' });
    });

    it('returns empty on error', async () => {
      mockRepos.listPullRequestsAssociatedWithCommit.mockRejectedValue(new Error('fail'));
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const prs = await client.listPullRequestsForCommit('abc');
      expect(prs).toEqual([]);
    });
  });

  describe('getReleaseByTag', () => {
    it('returns release data', async () => {
      mockRepos.getReleaseByTag.mockResolvedValue({ data: MOCK_RELEASE });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const release = await client.getReleaseByTag('v1.0.0');
      expect(release).toEqual(MOCK_RELEASE);
    });

    it('returns null for 404', async () => {
      mockRepos.getReleaseByTag.mockRejectedValue({ status: 404 });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.getReleaseByTag('missing')).toBeNull();
    });

    it('throws for non-404 errors', async () => {
      mockRepos.getReleaseByTag.mockRejectedValue({ status: 500 });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      await expect(client.getReleaseByTag('tag')).rejects.toEqual({ status: 500 });
    });
  });

  describe('tagExists', () => {
    it('returns true when tag exists', async () => {
      mockGit.getRef.mockResolvedValue({ data: {} });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.tagExists('v1.0.0')).toBe(true);
    });

    it('returns false when tag missing', async () => {
      mockGit.getRef.mockRejectedValue({ status: 404 });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      expect(await client.tagExists('missing')).toBe(false);
    });
  });

  describe('createRelease', () => {
    it('creates a release', async () => {
      mockRepos.createRelease.mockResolvedValue({
        data: { ...MOCK_RELEASE, id: 2, tag_name: 'v1.1.0' },
      });
      const client = new GitHubClient('token', 'owner', 'repo', logger);
      const result = await client.createRelease({
        tag: 'v1.1.0',
        name: 'v1.1.0',
        body: 'notes',
        draft: false,
        prerelease: false,
        targetCommitish: 'main',
      });
      expect(result.tag_name).toBe('v1.1.0');
    });
  });
});
