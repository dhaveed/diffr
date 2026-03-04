import { describe, it, expect } from 'vitest';
import {
  formatImpactHeader,
  formatCompareLink,
  formatReleaseNotes,
} from '../../../src/utils/notes-formatter.js';
import { MOCK_REPO } from '../../fixtures/github-responses.js';
import type { ImpactSummary } from '../../../src/types.js';

const summary: ImpactSummary = {
  totalCommits: 14,
  totalPullRequests: 6,
  contributors: ['alice', 'bob', 'jane'],
  areas: ['Authentication', 'Webhooks'],
  hasBreakingChanges: false,
};

describe('formatImpactHeader', () => {
  it('formats impact header with stats', () => {
    const header = formatImpactHeader(summary, 'v1.3.0');
    expect(header).toContain("## What's New in v1.3.0");
    expect(header).toContain('**14** commits');
    expect(header).toContain('**6** pull requests');
    expect(header).toContain('**3** contributors');
    expect(header).toContain('**Authentication**');
    expect(header).toContain('**Webhooks**');
  });

  it('handles singular counts', () => {
    const header = formatImpactHeader(
      { ...summary, totalCommits: 1, totalPullRequests: 1, contributors: ['alice'] },
      'v1.0.0',
    );
    expect(header).toContain('**1** commit |');
    expect(header).toContain('**1** pull request |');
    expect(header).toContain('**1** contributor');
  });

  it('omits areas when empty', () => {
    const header = formatImpactHeader({ ...summary, areas: [] }, 'v1.0.0');
    expect(header).not.toContain('Areas affected');
  });
});

describe('formatCompareLink', () => {
  it('generates compare link', () => {
    const link = formatCompareLink(MOCK_REPO, 'v1.0.0', 'v1.1.0');
    expect(link).toBe(
      '[Compare changes](https://github.com/test-owner/test-repo/compare/v1.0.0...v1.1.0)',
    );
  });

  it('returns empty for null previous version', () => {
    expect(formatCompareLink(MOCK_REPO, null, 'v1.0.0')).toBe('');
  });
});

describe('formatReleaseNotes', () => {
  it('combines header, body, and compare link', () => {
    const header = formatImpactHeader(summary, 'v1.3.0');
    const body = '### Features\n- Something new';
    const link = formatCompareLink(MOCK_REPO, 'v1.2.0', 'v1.3.0');
    const notes = formatReleaseNotes(header, body, link);

    expect(notes).toContain("## What's New in v1.3.0");
    expect(notes).toContain('### Features');
    expect(notes).toContain('[Compare changes]');
  });

  it('omits compare link when empty', () => {
    const header = formatImpactHeader(summary, 'v1.0.0');
    const body = '### Features\n- New feature';
    const notes = formatReleaseNotes(header, body, '');

    expect(notes).not.toContain('[Compare changes]');
  });
});
