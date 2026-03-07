import { Octokit } from '@octokit/rest';
import { withRetry } from '../utils/retry.js';
import type { Logger } from '../utils/logger.js';
import type { PublishOptions } from '../types.js';

export interface CompareResult {
  commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: { name: string; date: string } | null;
    };
    author: { login: string } | null;
  }>;
}

export interface ReleaseData {
  id: number;
  tag_name: string;
  html_url: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
}

export interface PullRequestData {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  labels: Array<{ name?: string }>;
  merged_at: string | null;
  html_url: string;
}

function toReleaseData(data: { id: number; tag_name: string; html_url: string; name: string | null; body?: string | null; draft: boolean; prerelease: boolean }): ReleaseData {
  return {
    id: data.id,
    tag_name: data.tag_name,
    html_url: data.html_url,
    name: data.name,
    body: data.body ?? null,
    draft: data.draft,
    prerelease: data.prerelease,
  };
}

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private logger: Logger;

  constructor(token: string, owner: string, repo: string, logger: Logger) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    this.logger = logger;

    this.octokit.hook.after('request', (response) => {
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      if (remaining !== undefined && Number(remaining) <= 10) {
        const resetAt = response.headers['x-ratelimit-reset'];
        const resetDate = resetAt ? new Date(Number(resetAt) * 1000).toISOString() : 'unknown';
        this.logger.warn(
          `GitHub API rate limit low: ${remaining}/${limit} remaining (resets at ${resetDate})`,
        );
      }
    });
  }

  async getLatestRelease(): Promise<ReleaseData | null> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.repos.getLatestRelease({
          owner: this.owner,
          repo: this.repo,
        }),
      );
      return toReleaseData(data);
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        this.logger.debug('No releases found');
        return null;
      }
      throw error;
    }
  }

  async getLatestTag(): Promise<string | null> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.repos.listTags({
          owner: this.owner,
          repo: this.repo,
          per_page: 1,
        }),
      );
      return data.length > 0 ? data[0].name : null;
    } catch (error) {
      this.logger.debug(`Failed to fetch latest tag: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async compareCommits(base: string, head: string): Promise<CompareResult> {
    const { data } = await withRetry(() =>
      this.octokit.repos.compareCommits({
        owner: this.owner,
        repo: this.repo,
        base,
        head,
      }),
    );
    return {
      commits: data.commits.map((c) => ({
        sha: c.sha,
        commit: {
          message: c.commit.message,
          author: c.commit.author
            ? { name: c.commit.author.name ?? '', date: c.commit.author.date ?? '' }
            : null,
        },
        author: c.author ? { login: c.author.login } : null,
      })),
    };
  }

  async listPullRequestsForCommit(sha: string): Promise<PullRequestData[]> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.repos.listPullRequestsAssociatedWithCommit({
          owner: this.owner,
          repo: this.repo,
          commit_sha: sha,
        }),
      );
      return data
        .filter((pr) => pr.merged_at !== null)
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          body: pr.body ?? null,
          user: pr.user ? { login: pr.user.login } : null,
          labels: pr.labels.map((l) => ({ name: l.name })),
          merged_at: pr.merged_at ?? null,
          html_url: pr.html_url,
        }));
    } catch (error) {
      this.logger.debug(`Failed to fetch PRs for commit ${sha}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getReleaseByTag(tag: string): Promise<ReleaseData | null> {
    try {
      const { data } = await withRetry(() =>
        this.octokit.repos.getReleaseByTag({
          owner: this.owner,
          repo: this.repo,
          tag,
        }),
      );
      return toReleaseData(data);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  }

  async tagExists(tag: string): Promise<boolean> {
    try {
      await withRetry(() =>
        this.octokit.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: `tags/${tag}`,
        }),
      );
      return true;
    } catch (error) {
      this.logger.debug(`Tag check failed for ${tag}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async createRelease(options: PublishOptions): Promise<ReleaseData> {
    const { data } = await withRetry(() =>
      this.octokit.repos.createRelease({
        owner: this.owner,
        repo: this.repo,
        tag_name: options.tag,
        name: options.name,
        body: options.body,
        draft: options.draft,
        prerelease: options.prerelease,
        target_commitish: options.targetCommitish,
      }),
    );
    return toReleaseData(data);
  }
}
