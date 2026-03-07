import type { ChangeEntry } from '../types.js';

const TYPE_LABELS: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  refactor: 'Improvements',
  perf: 'Performance',
  test: 'Tests',
  chore: 'Maintenance',
  ci: 'CI/CD',
  style: 'Style',
  build: 'Build',
};

export function generateFallbackNotes(
  entries: ChangeEntry[],
  _repository?: unknown,
  _previousVersion?: unknown,
  _newVersion?: unknown,
): string {
  if (entries.length === 0) return 'No changes in this release.';

  const grouped = groupByType(entries);
  const sections: string[] = [];

  for (const [type, items] of grouped) {
    const label = TYPE_LABELS[type] ?? type;
    sections.push(`### ${label}`);
    for (const item of items) {
      sections.push(`- ${formatEntry(item)}`);
    }
    sections.push('');
  }

  return sections.join('\n').trim();
}

function groupByType(entries: ChangeEntry[]): Map<string, ChangeEntry[]> {
  const groups = new Map<string, ChangeEntry[]>();

  for (const entry of entries) {
    const type = entry.commit.conventionalType ?? 'Changes';
    const existing = groups.get(type);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(type, [entry]);
    }
  }

  // Sort: known types first in conventional order, then unknown
  const ordered = new Map<string, ChangeEntry[]>();
  const knownOrder = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'style', 'build'];

  for (const type of knownOrder) {
    const items = groups.get(type);
    if (items) {
      ordered.set(type, items);
      groups.delete(type);
    }
  }
  for (const [type, items] of groups) {
    ordered.set(type, items);
  }

  return ordered;
}

function formatEntry(entry: ChangeEntry): string {
  const pr = entry.pullRequest;
  const message = pr?.title ?? entry.commit.message;
  const author = pr?.author ?? entry.commit.author;

  let line = message;
  if (pr) line += ` (#${pr.number})`;
  if (author && author !== 'unknown') line += ` @${author}`;

  return line;
}
