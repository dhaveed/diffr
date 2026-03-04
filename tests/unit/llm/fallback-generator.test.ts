import { describe, it, expect } from 'vitest';
import { generateFallbackNotes } from '../../../src/llm/fallback-generator.js';
import { MOCK_REPO, MOCK_CHANGE_ENTRIES } from '../../fixtures/github-responses.js';
import { analyzeChanges } from '../../../src/core/change-analyzer.js';

describe('generateFallbackNotes', () => {
  it('generates grouped notes for analyzed entries', () => {
    const analyzed = analyzeChanges(MOCK_CHANGE_ENTRIES);
    const notes = generateFallbackNotes(analyzed, MOCK_REPO, 'v1.0.0', 'v1.1.0');

    expect(notes).toContain('### Features');
    expect(notes).toContain('### Bug Fixes');
    expect(notes).toContain('#42');
    expect(notes).toContain('#43');
    expect(notes).toContain('@janedoe');
    expect(notes).toContain('[Compare changes]');
  });

  it('handles empty entries', () => {
    const notes = generateFallbackNotes([], MOCK_REPO, 'v1.0.0', 'v1.1.0');
    expect(notes).toBe('No changes in this release.');
  });

  it('groups non-conventional commits as "Changes"', () => {
    const entries = [
      { commit: { sha: '1', message: 'random update', author: 'user', date: '' } },
    ];
    const notes = generateFallbackNotes(entries, MOCK_REPO, 'v1.0.0', 'v1.1.0');
    expect(notes).toContain('### Changes');
  });

  it('omits compare link when no previous version', () => {
    const analyzed = analyzeChanges(MOCK_CHANGE_ENTRIES);
    const notes = generateFallbackNotes(analyzed, MOCK_REPO, null, 'v1.0.0');
    expect(notes).not.toContain('[Compare changes]');
  });

  it('uses PR titles over commit messages when available', () => {
    const analyzed = analyzeChanges(MOCK_CHANGE_ENTRIES);
    const notes = generateFallbackNotes(analyzed, MOCK_REPO, 'v1.0.0', 'v1.1.0');
    expect(notes).toContain('Add OAuth2 support');
    expect(notes).toContain('Fix redirect loop');
  });
});
