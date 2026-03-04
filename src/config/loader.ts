import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateYamlConfig, type YamlConfig } from './schema.js';
import type { DiffrConfig, LLMProviderType } from '../types.js';
import { Logger } from '../utils/logger.js';

export interface ActionInputs {
  githubToken: string;
  llmProvider?: string;
  llmApiKey?: string;
  llmModel?: string;
  version?: string;
  versionPrefix?: string;
  dryRun?: string;
  configPath?: string;
}

export async function loadConfig(inputs: ActionInputs, logger?: Logger): Promise<DiffrConfig> {
  const yamlConfig = await loadYamlConfig(nonEmpty(inputs.configPath) ?? DEFAULT_CONFIG.configPath, logger);
  const config = mergeConfig(inputs, yamlConfig);

  if (logger) {
    if (config.llm.apiKey) logger.maskSecret(config.llm.apiKey);
    if (config.githubToken) logger.maskSecret(config.githubToken);
  }

  return config;
}

export async function loadYamlConfig(path: string, logger?: Logger): Promise<YamlConfig | null> {
  try {
    const content = await readFile(path, 'utf-8');
    const parsed = parseYaml(content);
    if (!parsed) return null;
    return validateYamlConfig(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger?.debug(`No config file found at ${path}`);
      return null;
    }
    throw error;
  }
}

export function mergeConfig(inputs: ActionInputs, yaml: YamlConfig | null): DiffrConfig {
  const y = yaml ?? {};

  const llmApiKeyFromEnv = y.llm?.['api-key-env']
    ? process.env[y.llm['api-key-env']] ?? ''
    : '';

  return {
    githubToken: inputs.githubToken,
    llm: {
      provider: (nonEmpty(inputs.llmProvider) ?? y.llm?.provider ?? DEFAULT_CONFIG.llm.provider) as LLMProviderType,
      apiKey: nonEmpty(inputs.llmApiKey) ?? llmApiKeyFromEnv ?? DEFAULT_CONFIG.llm.apiKey,
      model: nonEmpty(inputs.llmModel) ?? y.llm?.model,
      maxInputTokens: y.llm?.['max-input-tokens'] ?? DEFAULT_CONFIG.llm.maxInputTokens,
      maxOutputTokens: DEFAULT_CONFIG.llm.maxOutputTokens,
      temperature: y.llm?.temperature ?? DEFAULT_CONFIG.llm.temperature,
    },
    versionPrefix: nonEmpty(inputs.versionPrefix) ?? y.versioning?.prefix ?? DEFAULT_CONFIG.versionPrefix,
    explicitVersion: nonEmpty(inputs.version),
    initialVersion: y.versioning?.['initial-version'] ?? DEFAULT_CONFIG.initialVersion,
    dryRun: nonEmpty(inputs.dryRun) === 'true' ? true : DEFAULT_CONFIG.dryRun,
    configPath: nonEmpty(inputs.configPath) ?? DEFAULT_CONFIG.configPath,
    filters: {
      excludeLabels: y.filters?.['exclude-labels'] ?? DEFAULT_CONFIG.filters.excludeLabels,
      excludeAuthors: y.filters?.['exclude-authors'] ?? DEFAULT_CONFIG.filters.excludeAuthors,
      skipBots: y.filters?.['skip-bots'] ?? DEFAULT_CONFIG.filters.skipBots,
    },
    notes: {
      tone: (y.notes?.tone ?? DEFAULT_CONFIG.notes.tone) as DiffrConfig['notes']['tone'],
      style: (y.notes?.style ?? DEFAULT_CONFIG.notes.style) as DiffrConfig['notes']['style'],
      includeAuthors: y.notes?.['include-authors'] ?? DEFAULT_CONFIG.notes.includeAuthors,
      includePrLinks: y.notes?.['include-pr-links'] ?? DEFAULT_CONFIG.notes.includePrLinks,
      includeCompareLink: y.notes?.['include-compare-link'] ?? DEFAULT_CONFIG.notes.includeCompareLink,
    },
    release: {
      draft: y.release?.draft ?? DEFAULT_CONFIG.release.draft,
      prerelease: y.release?.prerelease ?? DEFAULT_CONFIG.release.prerelease,
    },
  };
}

function nonEmpty(value: string | undefined): string | undefined {
  if (!value || value.trim() === '') return undefined;
  return value;
}
