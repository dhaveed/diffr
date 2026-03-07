import * as core from '@actions/core';
import * as github from '@actions/github';
import { loadConfig } from '../config/index.js';
import { runPipeline } from '../orchestrator.js';
import { Logger } from '../utils/logger.js';
import type { RepositoryInfo } from '../types.js';

async function run(): Promise<void> {
  const logger = new Logger('debug');

  try {
    // Read action inputs
    const config = await loadConfig(
      {
        githubToken: core.getInput('github-token', { required: true }),
        llmProvider: core.getInput('llm-provider'),
        llmApiKey: core.getInput('llm-api-key'),
        llmModel: core.getInput('llm-model'),
        version: core.getInput('version'),
        versionPrefix: core.getInput('version-prefix'),
        dryRun: core.getInput('dry-run'),
        configPath: core.getInput('config-path'),
      },
      logger,
    );

    // Extract repository info from GitHub context
    const { owner, repo } = github.context.repo;
    const repository: RepositoryInfo = {
      owner,
      repo,
      defaultBranch: github.context.payload.repository?.default_branch ?? 'main',
      url: `https://github.com/${owner}/${repo}`,
    };

    const headRef = github.context.sha;

    logger.info(`Running diffr for ${owner}/${repo}`);
    logger.info(`Head ref: ${headRef}`);
    logger.info(`Dry run: ${config.dryRun}`);

    // Run the pipeline
    const result = await runPipeline(config, repository, headRef, logger);

    // Set outputs
    if (result.version) core.setOutput('version', result.version);
    if (result.tag) core.setOutput('tag', result.tag);
    if (result.release?.url) core.setOutput('release-url', result.release.url);
    if (result.releaseNotes) core.setOutput('release-notes', result.releaseNotes);
    core.setOutput('dry-run', String(config.dryRun));

    if (result.skipped) {
      logger.info(`Skipped: ${result.skipReason}`);
    } else if (result.dryRun) {
      logger.info('Dry run completed successfully');
    } else {
      logger.info(`Release ${result.tag} created successfully`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`diffr failed: ${message}`);
  }
}

run().catch((error) => {
  core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
