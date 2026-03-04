import type { ReleaseContext } from '../types.js';

const SYSTEM_PROMPT = `You are a release notes writer for a software project. Given a list of changes (commits, pull requests, and their metadata) for a new release, produce structured, concise release notes in markdown format.

Rules:
- Group changes into categories: Breaking Changes, Features, Bug Fixes, Improvements, Internal/Dev.
- Omit empty categories.
- Each item should be ONE sentence summarizing the user-facing impact, not the raw commit message.
- Include PR numbers as links where available.
- Mention contributors by GitHub username.
- Use a professional, neutral tone.
- Do NOT fabricate changes that are not in the input.
- Do NOT speculate about impact beyond what the data shows.
- If all changes are trivial (e.g., only dependency updates), say so briefly.
- Do NOT include a release title or header — only the categorized sections.
- Output only the markdown sections, nothing else.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(context: ReleaseContext): string {
  const changes = context.changes.map((entry) => {
    const pr = entry.pullRequest;
    return {
      sha: entry.commit.sha.slice(0, 7),
      message: entry.commit.message,
      author: pr?.author ?? entry.commit.author,
      conventional_type: entry.commit.conventionalType ?? null,
      is_breaking: entry.commit.isBreaking ?? false,
      pr: pr
        ? {
            number: pr.number,
            title: pr.title,
            body: pr.body.slice(0, 500),
            labels: pr.labels,
          }
        : null,
    };
  });

  const payload = {
    repository: `${context.repository.owner}/${context.repository.repo}`,
    previous_version: context.previousVersion,
    new_version: context.newVersion,
    total_commits: context.impactSummary.totalCommits,
    changes,
  };

  return JSON.stringify(payload, null, 2);
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

export function truncateContext(context: ReleaseContext, maxTokens: number): ReleaseContext {
  let prompt = buildUserPrompt(context);
  let tokens = estimateTokens(prompt);

  if (tokens <= maxTokens) return context;

  // Strategy 1: Truncate PR bodies
  let truncated: ReleaseContext = {
    ...context,
    changes: context.changes.map((e) => ({
      ...e,
      pullRequest: e.pullRequest
        ? { ...e.pullRequest, body: e.pullRequest.body.slice(0, 100) }
        : undefined,
    })),
  };

  prompt = buildUserPrompt(truncated);
  tokens = estimateTokens(prompt);
  if (tokens <= maxTokens) return truncated;

  // Strategy 2: Remove PR bodies entirely
  truncated = {
    ...context,
    changes: context.changes.map((e) => ({
      ...e,
      pullRequest: e.pullRequest
        ? { ...e.pullRequest, body: '' }
        : undefined,
    })),
  };

  prompt = buildUserPrompt(truncated);
  tokens = estimateTokens(prompt);
  if (tokens <= maxTokens) return truncated;

  // Strategy 3: Truncate commit messages
  truncated = {
    ...truncated,
    changes: truncated.changes.map((e) => ({
      ...e,
      commit: { ...e.commit, message: e.commit.message.slice(0, 80) },
    })),
  };

  prompt = buildUserPrompt(truncated);
  tokens = estimateTokens(prompt);
  if (tokens <= maxTokens) return truncated;

  // Strategy 4: Drop oldest entries
  while (tokens > maxTokens && truncated.changes.length > 1) {
    truncated = { ...truncated, changes: truncated.changes.slice(1) };
    prompt = buildUserPrompt(truncated);
    tokens = estimateTokens(prompt);
  }

  return truncated;
}
