import type { GitHubClient } from '../core/github-client.js';
import type { ReleaseResult, ReleaseConfig, VersionInfo, RepositoryInfo } from '../types.js';
import type { Logger } from '../utils/logger.js';

export interface PublishContext {
  versionInfo: VersionInfo;
  releaseNotes: string;
  repository: RepositoryInfo;
  headRef: string;
  releaseConfig: ReleaseConfig;
  dryRun: boolean;
}

export async function publishRelease(
  context: PublishContext,
  githubClient: GitHubClient,
  logger: Logger,
): Promise<ReleaseResult | null> {
  const { versionInfo, releaseNotes, headRef, releaseConfig, dryRun } = context;

  // Idempotency check
  const existing = await githubClient.getReleaseByTag(versionInfo.tag);
  if (existing) {
    logger.info(`Release ${versionInfo.tag} already exists — skipping`);
    return {
      id: existing.id,
      url: existing.html_url,
      tag: existing.tag_name,
      version: versionInfo.version,
      notes: existing.body ?? '',
      isDraft: existing.draft,
      isPrerelease: existing.prerelease,
      alreadyExisted: true,
    };
  }

  if (dryRun) {
    logger.info(`[DRY RUN] Would create release ${versionInfo.tag}`);
    logger.info(`[DRY RUN] Title: ${versionInfo.tag}`);
    logger.info(`[DRY RUN] Draft: ${releaseConfig.draft}`);
    logger.info(`[DRY RUN] Prerelease: ${releaseConfig.prerelease}`);
    logger.debug(`[DRY RUN] Notes:\n${releaseNotes}`);
    return null;
  }

  logger.info(`Creating release ${versionInfo.tag}`);
  const release = await githubClient.createRelease({
    tag: versionInfo.tag,
    name: versionInfo.tag,
    body: releaseNotes,
    draft: releaseConfig.draft,
    prerelease: releaseConfig.prerelease,
    targetCommitish: headRef,
  });

  logger.info(`Release created: ${release.html_url}`);

  return {
    id: release.id,
    url: release.html_url,
    tag: release.tag_name,
    version: versionInfo.version,
    notes: releaseNotes,
    isDraft: release.draft,
    isPrerelease: release.prerelease,
    alreadyExisted: false,
  };
}
