import type { GitHubClient } from './github-client.js';
import type { ChangeEntry, ChangeSet, CommitInfo, FilterConfig, PullRequestInfo, RepositoryInfo } from '../types.js';
import type { Logger } from '../utils/logger.js';

const BOT_SUFFIXES = ['[bot]'];
const KNOWN_BOTS = ['dependabot', 'renovate', 'github-actions'];
const MAX_CONCURRENT_PR_FETCHES = 10;

export async function collectChanges(
  githubClient: GitHubClient,
  repository: RepositoryInfo,
  headRef: string,
  filters: FilterConfig,
  logger: Logger,
): Promise<ChangeSet> {
  const baseRef = await resolveBaseRef(githubClient, logger);

  if (!baseRef) {
    logger.info('No previous release or tag found — this will be the first release');
    return { entries: [], baseRef: null, headRef, repository };
  }

  logger.info(`Comparing ${baseRef}...${headRef}`);
  const comparison = await githubClient.compareCommits(baseRef, headRef);

  if (comparison.commits.length === 0) {
    logger.info('No new commits found');
    return { entries: [], baseRef, headRef, repository };
  }

  logger.info(`Found ${comparison.commits.length} commits`);

  const entries: ChangeEntry[] = [];

  // Fetch PRs in batches
  for (let i = 0; i < comparison.commits.length; i += MAX_CONCURRENT_PR_FETCHES) {
    const batch = comparison.commits.slice(i, i + MAX_CONCURRENT_PR_FETCHES);
    const prResults = await Promise.all(
      batch.map((c) => githubClient.listPullRequestsForCommit(c.sha)),
    );

    for (let j = 0; j < batch.length; j++) {
      const commit = batch[j];
      const prs = prResults[j];

      const commitInfo: CommitInfo = {
        sha: commit.sha,
        message: commit.commit.message.split('\n')[0],
        author: commit.author?.login ?? commit.commit.author?.name ?? 'unknown',
        date: commit.commit.author?.date ?? '',
      };

      const pr = prs[0];
      const pullRequest: PullRequestInfo | undefined = pr
        ? {
            number: pr.number,
            title: pr.title,
            body: pr.body ?? '',
            author: pr.user?.login ?? commitInfo.author,
            labels: pr.labels.map((l) => l.name ?? '').filter(Boolean),
            mergedAt: pr.merged_at ?? '',
            url: pr.html_url,
          }
        : undefined;

      entries.push({ commit: commitInfo, pullRequest });
    }
  }

  const filtered = filterChanges(entries, filters, logger);
  logger.info(`${filtered.length} changes after filtering (${entries.length - filtered.length} filtered out)`);

  return { entries: filtered, baseRef, headRef, repository };
}

export async function resolveBaseRef(
  githubClient: GitHubClient,
  logger: Logger,
): Promise<string | null> {
  // Try latest release first
  const release = await githubClient.getLatestRelease();
  if (release) {
    logger.debug(`Found latest release: ${release.tag_name}`);
    return release.tag_name;
  }

  // Fall back to latest tag
  const tag = await githubClient.getLatestTag();
  if (tag) {
    logger.debug(`Found latest tag: ${tag}`);
    return tag;
  }

  return null;
}

export function filterChanges(
  entries: ChangeEntry[],
  filters: FilterConfig,
  logger: Logger,
): ChangeEntry[] {
  return entries.filter((entry) => {
    const author = entry.pullRequest?.author ?? entry.commit.author;

    // Skip bots
    if (filters.skipBots && isBot(author)) {
      logger.debug(`Filtering bot: ${author}`);
      return false;
    }

    // Skip excluded authors
    if (filters.excludeAuthors.some((a) => a.toLowerCase() === author.toLowerCase())) {
      logger.debug(`Filtering excluded author: ${author}`);
      return false;
    }

    // Skip excluded labels
    if (entry.pullRequest) {
      const labels = entry.pullRequest.labels;
      if (filters.excludeLabels.some((l) => labels.includes(l))) {
        logger.debug(`Filtering excluded label on PR #${entry.pullRequest.number}`);
        return false;
      }
    }

    return true;
  });
}

export function isBot(author: string): boolean {
  if (BOT_SUFFIXES.some((suffix) => author.endsWith(suffix))) return true;
  if (KNOWN_BOTS.some((bot) => author.toLowerCase().includes(bot))) return true;
  return false;
}
