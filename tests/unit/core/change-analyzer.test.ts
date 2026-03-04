import { describe, it, expect } from 'vitest';
import {
  parseConventionalCommit,
  analyzeChanges,
  generateImpactSummary,
  buildReleaseContext,
} from '../../../src/core/change-analyzer.js';
import { MOCK_CHANGE_ENTRIES, MOCK_REPO } from '../../fixtures/github-responses.js';

describe('parseConventionalCommit', () => {
  it('parses feat commit', () => {
    const result = parseConventionalCommit('feat: add dark mode');
    expect(result).toEqual({
      type: 'feat',
      scope: undefined,
      isBreaking: false,
      description: 'add dark mode',
    });
  });

  it('parses scoped commit', () => {
    const result = parseConventionalCommit('feat(auth): add OAuth2');
    expect(result).toEqual({
      type: 'feat',
      scope: 'auth',
      isBreaking: false,
      description: 'add OAuth2',
    });
  });

  it('parses breaking change with !', () => {
    const result = parseConventionalCommit('feat!: redesign API');
    expect(result).toEqual({
      type: 'feat',
      scope: undefined,
      isBreaking: true,
      description: 'redesign API',
    });
  });

  it('parses scoped breaking change', () => {
    const result = parseConventionalCommit('fix(api)!: remove deprecated endpoint');
    expect(result).toEqual({
      type: 'fix',
      scope: 'api',
      isBreaking: true,
      description: 'remove deprecated endpoint',
    });
  });

  it('returns null for non-conventional commits', () => {
    expect(parseConventionalCommit('Update README')).toBeNull();
    expect(parseConventionalCommit('fixed the bug')).toBeNull();
    expect(parseConventionalCommit('')).toBeNull();
  });

  it('handles various types', () => {
    expect(parseConventionalCommit('fix: bug')?.type).toBe('fix');
    expect(parseConventionalCommit('chore: cleanup')?.type).toBe('chore');
    expect(parseConventionalCommit('docs: update readme')?.type).toBe('docs');
    expect(parseConventionalCommit('refactor: simplify logic')?.type).toBe('refactor');
  });
});

describe('analyzeChanges', () => {
  it('enriches entries with conventional commit data', () => {
    const result = analyzeChanges(MOCK_CHANGE_ENTRIES);

    expect(result[0].commit.conventionalType).toBe('feat');
    expect(result[0].commit.conventionalScope).toBe('auth');
    expect(result[0].commit.isBreaking).toBe(false);

    expect(result[1].commit.conventionalType).toBe('fix');
    expect(result[1].commit.isBreaking).toBe(false);

    expect(result[2].commit.conventionalType).toBe('feat');
    expect(result[2].commit.isBreaking).toBe(true);
  });

  it('leaves non-conventional commits unchanged', () => {
    const entries = [
      { commit: { sha: '1', message: 'random message', author: 'user', date: '' } },
    ];
    const result = analyzeChanges(entries);
    expect(result[0].commit.conventionalType).toBeUndefined();
  });
});

describe('generateImpactSummary', () => {
  it('generates correct summary', () => {
    const analyzed = analyzeChanges(MOCK_CHANGE_ENTRIES);
    const summary = generateImpactSummary(analyzed);

    expect(summary.totalCommits).toBe(3);
    expect(summary.totalPullRequests).toBe(2);
    expect(summary.contributors).toEqual(['alice', 'bobsmith', 'janedoe']);
    expect(summary.areas).toEqual(['Auth']);
    expect(summary.hasBreakingChanges).toBe(true);
  });

  it('handles empty entries', () => {
    const summary = generateImpactSummary([]);
    expect(summary.totalCommits).toBe(0);
    expect(summary.totalPullRequests).toBe(0);
    expect(summary.contributors).toEqual([]);
    expect(summary.areas).toEqual([]);
    expect(summary.hasBreakingChanges).toBe(false);
  });
});

describe('buildReleaseContext', () => {
  it('builds complete release context', () => {
    const analyzed = analyzeChanges(MOCK_CHANGE_ENTRIES);
    const context = buildReleaseContext(analyzed, MOCK_REPO, 'v1.0.0', {
      version: '1.1.0',
      tag: 'v1.1.0',
      bump: 'patch',
      isInitial: false,
    });

    expect(context.repository).toBe(MOCK_REPO);
    expect(context.previousVersion).toBe('v1.0.0');
    expect(context.newVersion).toBe('1.1.0');
    expect(context.changes).toHaveLength(3);
    expect(context.impactSummary.totalCommits).toBe(3);
  });
});
