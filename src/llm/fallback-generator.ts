import type { ChangeEntry, RepositoryInfo } from '../types.js';

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
  repository: RepositoryInfo,
  previousVersion: string | null,
  newVersion: string,
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

  if (previousVersion) {
    const compareUrl = `https://github.com/${repository.owner}/${repository.repo}/compare/${previousVersion}...${newVersion}`;
    sections.push(`[Compare changes](${compareUrl})`);
  }

  return sections.join('\n').trim();
}

function groupByType(entries: ChangeEntry[]): Map<string, ChangeEntry[]> {
  const groups = new Map<string, ChangeEntry[]>();

  for (const entry of entries) {
    const type = entry.commit.conventionalType ?? 'Changes';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(entry);
  }

  // Sort: known types first in conventional order, then unknown
  const ordered = new Map<string, ChangeEntry[]>();
  const knownOrder = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'style', 'build'];

  for (const type of knownOrder) {
    if (groups.has(type)) {
      ordered.set(type, groups.get(type)!);
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
