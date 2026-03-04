import type {
  ChangeEntry,
  CommitInfo,
  ImpactSummary,
  ReleaseContext,
  RepositoryInfo,
  VersionInfo,
} from '../types.js';

const CONVENTIONAL_COMMIT_RE =
  /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/;

export interface ConventionalCommitParsed {
  type: string;
  scope?: string;
  isBreaking: boolean;
  description: string;
}

export function parseConventionalCommit(message: string): ConventionalCommitParsed | null {
  const match = message.match(CONVENTIONAL_COMMIT_RE);
  if (!match?.groups) return null;

  return {
    type: match.groups.type,
    scope: match.groups.scope,
    isBreaking: match.groups.breaking === '!',
    description: match.groups.description,
  };
}

export function analyzeChanges(entries: ChangeEntry[]): ChangeEntry[] {
  return entries.map((entry) => {
    const parsed = parseConventionalCommit(entry.commit.message);
    if (!parsed) return entry;

    const enrichedCommit: CommitInfo = {
      ...entry.commit,
      conventionalType: parsed.type,
      conventionalScope: parsed.scope,
      isBreaking: parsed.isBreaking,
      description: parsed.description,
    };

    return { ...entry, commit: enrichedCommit };
  });
}

export function generateImpactSummary(entries: ChangeEntry[]): ImpactSummary {
  const contributors = new Set<string>();
  const areas = new Set<string>();
  let hasBreakingChanges = false;
  let totalPullRequests = 0;
  const seenPrs = new Set<number>();

  for (const entry of entries) {
    // Contributors
    const author = entry.pullRequest?.author ?? entry.commit.author;
    if (author && author !== 'unknown') {
      contributors.add(author);
    }

    // Areas from scopes
    if (entry.commit.conventionalScope) {
      areas.add(capitalize(entry.commit.conventionalScope));
    }

    // Breaking changes
    if (entry.commit.isBreaking) {
      hasBreakingChanges = true;
    }

    // PR count (deduplicate)
    if (entry.pullRequest && !seenPrs.has(entry.pullRequest.number)) {
      seenPrs.add(entry.pullRequest.number);
      totalPullRequests++;
    }
  }

  return {
    totalCommits: entries.length,
    totalPullRequests,
    contributors: [...contributors].sort(),
    areas: [...areas].sort(),
    hasBreakingChanges,
  };
}

export function buildReleaseContext(
  entries: ChangeEntry[],
  repository: RepositoryInfo,
  previousVersion: string | null,
  versionInfo: VersionInfo,
): ReleaseContext {
  const impactSummary = generateImpactSummary(entries);

  return {
    repository,
    previousVersion,
    newVersion: versionInfo.version,
    changes: entries,
    impactSummary,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
