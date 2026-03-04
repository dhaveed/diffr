import type { DiffrConfig } from '../types.js';

export const DEFAULT_CONFIG: Omit<DiffrConfig, 'githubToken'> = {
  llm: {
    provider: 'openai',
    apiKey: '',
    maxInputTokens: 16000,
    maxOutputTokens: 1500,
    temperature: 0.2,
  },
  versionPrefix: 'v',
  initialVersion: '0.1.0',
  dryRun: false,
  configPath: '.diffr.yml',
  filters: {
    excludeLabels: ['no-release', 'skip-release-notes'],
    excludeAuthors: [],
    skipBots: true,
  },
  notes: {
    tone: 'technical',
    style: 'detailed',
    includeAuthors: true,
    includePrLinks: true,
    includeCompareLink: true,
  },
  release: {
    draft: false,
    prerelease: false,
  },
};
