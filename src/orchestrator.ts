import type { DiffrConfig, PipelineResult, RepositoryInfo } from './types.js';
import { Logger } from './utils/logger.js';
import { GitHubClient } from './core/github-client.js';
import { collectChanges } from './core/change-collector.js';
import { analyzeChanges, buildReleaseContext, generateImpactSummary } from './core/change-analyzer.js';
import { resolveVersion } from './versioning/version-resolver.js';
import { createLLMProvider } from './llm/provider-factory.js';
import { generateFallbackNotes } from './llm/fallback-generator.js';
import { publishRelease } from './publisher/release-publisher.js';
import { formatImpactHeader, formatCompareLink, formatReleaseNotes } from './utils/notes-formatter.js';

export async function runPipeline(
  config: DiffrConfig,
  repository: RepositoryInfo,
  headRef: string,
  logger: Logger,
): Promise<PipelineResult> {
  // 1. Create GitHub client
  const githubClient = new GitHubClient(
    config.githubToken,
    repository.owner,
    repository.repo,
    logger,
  );

  // 2. Collect changes
  logger.info('Collecting changes...');
  const changeSet = await collectChanges(githubClient, repository, headRef, config.filters, logger);

  // 3. Early return if no changes
  if (changeSet.entries.length === 0 && changeSet.baseRef !== null) {
    logger.info('No changes detected — skipping release');
    return {
      success: true,
      dryRun: config.dryRun,
      skipped: true,
      skipReason: 'No changes detected since last release',
    };
  }

  // 4. Analyze changes
  logger.info('Analyzing changes...');
  const analyzedEntries = analyzeChanges(changeSet.entries);

  // 5. Generate impact summary
  const impactSummary = generateImpactSummary(analyzedEntries);

  // 6. Resolve version
  logger.info('Resolving version...');
  const versionInfo = resolveVersion({
    lastTag: changeSet.baseRef,
    explicitVersion: config.explicitVersion,
    prefix: config.versionPrefix,
    initialVersion: config.initialVersion,
  });
  logger.info(`Version resolved: ${versionInfo.version} (tag: ${versionInfo.tag})`);

  // 7. Build release context
  const releaseContext = buildReleaseContext(
    analyzedEntries,
    repository,
    changeSet.baseRef,
    versionInfo,
  );

  // 8. Generate release notes (LLM with fallback)
  let llmBody: string;
  try {
    if (!config.llm.apiKey) {
      logger.info('No LLM API key configured — using fallback generator');
      llmBody = generateFallbackNotes(analyzedEntries, repository, changeSet.baseRef, versionInfo.tag);
    } else {
      const provider = createLLMProvider(config.llm, logger);
      llmBody = await provider.generateReleaseNotes(releaseContext);
    }
  } catch (error) {
    logger.warn(`LLM generation failed — using fallback: ${error instanceof Error ? error.message : String(error)}`);
    llmBody = generateFallbackNotes(analyzedEntries, repository, changeSet.baseRef, versionInfo.tag);
  }

  // 9. Format release notes (impact header is deterministic, NOT LLM-generated)
  const impactHeader = formatImpactHeader(impactSummary, versionInfo.tag);
  const compareLink = config.notes.includeCompareLink
    ? formatCompareLink(repository, changeSet.baseRef, versionInfo.tag)
    : '';
  const releaseNotes = formatReleaseNotes(impactHeader, llmBody, compareLink);

  // 10. Publish release
  logger.info('Publishing release...');
  const release = await publishRelease(
    {
      versionInfo,
      releaseNotes,
      repository,
      headRef,
      releaseConfig: config.release,
      dryRun: config.dryRun,
    },
    githubClient,
    logger,
  );

  // 11. Return result
  return {
    success: true,
    release: release ?? undefined,
    version: versionInfo.version,
    tag: versionInfo.tag,
    releaseNotes,
    dryRun: config.dryRun,
    skipped: false,
  };
}
