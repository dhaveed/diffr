import type { ImpactSummary, RepositoryInfo } from '../types.js';

export function formatImpactHeader(
  summary: ImpactSummary,
  newVersion: string,
): string {
  const lines: string[] = [];

  lines.push(`## What's New in ${newVersion}`);
  lines.push('');

  const stats: string[] = [];
  stats.push(`**${summary.totalCommits}** commit${summary.totalCommits !== 1 ? 's' : ''}`);
  stats.push(`**${summary.totalPullRequests}** pull request${summary.totalPullRequests !== 1 ? 's' : ''}`);
  stats.push(`**${summary.contributors.length}** contributor${summary.contributors.length !== 1 ? 's' : ''}`);
  lines.push(`> ${stats.join(' | ')}`);

  if (summary.areas.length > 0) {
    const areas = summary.areas.map((a) => `**${a}**`).join(', ');
    lines.push(`> Areas affected: ${areas}`);
  }

  return lines.join('\n');
}

export function formatCompareLink(
  repository: RepositoryInfo,
  previousVersion: string | null,
  newTag: string,
): string {
  if (!previousVersion) return '';
  return `[Compare changes](https://github.com/${repository.owner}/${repository.repo}/compare/${previousVersion}...${newTag})`;
}

export function formatReleaseNotes(
  impactHeader: string,
  llmBody: string,
  compareLink: string,
): string {
  const parts = [impactHeader, '', llmBody];
  if (compareLink) {
    parts.push('', compareLink);
  }
  return parts.join('\n').trim();
}
