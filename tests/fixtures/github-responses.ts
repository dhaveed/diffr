import type { ChangeEntry, RepositoryInfo } from '../../src/types.js';

export const MOCK_REPO: RepositoryInfo = {
  owner: 'test-owner',
  repo: 'test-repo',
  defaultBranch: 'main',
  url: 'https://github.com/test-owner/test-repo',
};

export const MOCK_RELEASE = {
  id: 1,
  tag_name: 'v1.0.0',
  html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
  name: 'v1.0.0',
  body: 'Release notes',
  draft: false,
  prerelease: false,
};

export const MOCK_COMMITS = [
  {
    sha: 'abc123',
    commit: {
      message: 'feat(auth): add OAuth2 support',
      author: { name: 'Jane Doe', date: '2026-03-01T10:00:00Z' },
    },
    author: { login: 'janedoe' },
  },
  {
    sha: 'def456',
    commit: {
      message: 'fix: resolve redirect loop on expired sessions',
      author: { name: 'Bob Smith', date: '2026-03-02T10:00:00Z' },
    },
    author: { login: 'bobsmith' },
  },
  {
    sha: 'ghi789',
    commit: {
      message: 'chore: update dependencies',
      author: { name: 'Dependabot', date: '2026-03-02T12:00:00Z' },
    },
    author: { login: 'dependabot[bot]' },
  },
  {
    sha: 'jkl012',
    commit: {
      message: 'feat!: redesign user profile page',
      author: { name: 'Alice', date: '2026-03-03T10:00:00Z' },
    },
    author: { login: 'alice' },
  },
];

export const MOCK_PRS = [
  {
    number: 42,
    title: 'Add OAuth2 support',
    body: 'Implements OAuth2 flow using PKCE',
    user: { login: 'janedoe' },
    labels: [{ name: 'enhancement' }],
    merged_at: '2026-03-01T11:00:00Z',
    html_url: 'https://github.com/test-owner/test-repo/pull/42',
  },
  {
    number: 43,
    title: 'Fix redirect loop',
    body: 'Fixes expired session redirect issue',
    user: { login: 'bobsmith' },
    labels: [{ name: 'bug' }],
    merged_at: '2026-03-02T11:00:00Z',
    html_url: 'https://github.com/test-owner/test-repo/pull/43',
  },
];

export const MOCK_CHANGE_ENTRIES: ChangeEntry[] = [
  {
    commit: {
      sha: 'abc123',
      message: 'feat(auth): add OAuth2 support',
      author: 'janedoe',
      date: '2026-03-01T10:00:00Z',
    },
    pullRequest: {
      number: 42,
      title: 'Add OAuth2 support',
      body: 'Implements OAuth2 flow using PKCE',
      author: 'janedoe',
      labels: ['enhancement'],
      mergedAt: '2026-03-01T11:00:00Z',
      url: 'https://github.com/test-owner/test-repo/pull/42',
    },
  },
  {
    commit: {
      sha: 'def456',
      message: 'fix: resolve redirect loop on expired sessions',
      author: 'bobsmith',
      date: '2026-03-02T10:00:00Z',
    },
    pullRequest: {
      number: 43,
      title: 'Fix redirect loop',
      body: 'Fixes expired session redirect issue',
      author: 'bobsmith',
      labels: ['bug'],
      mergedAt: '2026-03-02T11:00:00Z',
      url: 'https://github.com/test-owner/test-repo/pull/43',
    },
  },
  {
    commit: {
      sha: 'jkl012',
      message: 'feat!: redesign user profile page',
      author: 'alice',
      date: '2026-03-03T10:00:00Z',
    },
  },
];
