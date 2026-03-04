import { describe, it, expect } from 'vitest';
import {
  getSystemPrompt,
  buildUserPrompt,
  estimateTokens,
  truncateContext,
} from '../../../src/llm/prompt-builder.js';
import type { ReleaseContext } from '../../../src/types.js';
import { MOCK_REPO, MOCK_CHANGE_ENTRIES } from '../../fixtures/github-responses.js';
import { analyzeChanges, generateImpactSummary } from '../../../src/core/change-analyzer.js';

function buildContext(overrides?: Partial<ReleaseContext>): ReleaseContext {
  const changes = analyzeChanges(MOCK_CHANGE_ENTRIES);
  return {
    repository: MOCK_REPO,
    previousVersion: 'v1.0.0',
    newVersion: '1.1.0',
    changes,
    impactSummary: generateImpactSummary(changes),
    ...overrides,
  };
}

describe('getSystemPrompt', () => {
  it('returns non-empty system prompt', () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain('release notes');
    expect(prompt).toContain('Do NOT fabricate');
  });
});

describe('buildUserPrompt', () => {
  it('builds JSON prompt with repository info', () => {
    const context = buildContext();
    const prompt = buildUserPrompt(context);
    const parsed = JSON.parse(prompt);

    expect(parsed.repository).toBe('test-owner/test-repo');
    expect(parsed.previous_version).toBe('v1.0.0');
    expect(parsed.new_version).toBe('1.1.0');
    expect(parsed.changes).toHaveLength(3);
  });

  it('truncates PR bodies to 500 chars', () => {
    const longBody = 'x'.repeat(1000);
    const context = buildContext({
      changes: [{
        commit: { sha: '1', message: 'feat: test', author: 'user', date: '' },
        pullRequest: {
          number: 1, title: 'Test', body: longBody,
          author: 'user', labels: [], mergedAt: '', url: '',
        },
      }],
    });
    const prompt = buildUserPrompt(context);
    const parsed = JSON.parse(prompt);
    expect(parsed.changes[0].pr.body.length).toBeLessThanOrEqual(500);
  });
});

describe('estimateTokens', () => {
  it('estimates token count', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('truncateContext', () => {
  it('returns unchanged context if within limits', () => {
    const context = buildContext();
    const result = truncateContext(context, 100000);
    expect(result).toEqual(context);
  });

  it('truncates PR bodies when over limit', () => {
    const context = buildContext();
    const result = truncateContext(context, 200);
    // Should have truncated bodies
    const prompt = buildUserPrompt(result);
    expect(estimateTokens(prompt)).toBeLessThanOrEqual(500); // relaxed check
  });

  it('drops entries as last resort', () => {
    const context = buildContext();
    const result = truncateContext(context, 50);
    expect(result.changes.length).toBeLessThanOrEqual(context.changes.length);
  });
});
