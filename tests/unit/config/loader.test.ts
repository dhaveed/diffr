import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { mergeConfig, loadYamlConfig, loadConfig } from '../../../src/config/loader.js';
import { validateYamlConfig, ConfigValidationError } from '../../../src/config/schema.js';


vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');

describe('validateYamlConfig', () => {
  it('accepts valid config', () => {
    const config = validateYamlConfig({
      llm: { provider: 'openai', temperature: 0.5 },
      notes: { tone: 'technical', style: 'detailed' },
    });
    expect(config.llm?.provider).toBe('openai');
  });

  it('rejects invalid provider', () => {
    expect(() =>
      validateYamlConfig({ llm: { provider: 'invalid' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects invalid tone', () => {
    expect(() =>
      validateYamlConfig({ notes: { tone: 'casual' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects invalid temperature', () => {
    expect(() =>
      validateYamlConfig({ llm: { temperature: 5 } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects non-object root', () => {
    expect(() => validateYamlConfig('string')).toThrow(ConfigValidationError);
  });

  it('rejects non-array exclude-labels', () => {
    expect(() =>
      validateYamlConfig({ filters: { 'exclude-labels': 'not-array' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects non-array exclude-authors', () => {
    expect(() =>
      validateYamlConfig({ filters: { 'exclude-authors': 123 } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects non-object llm', () => {
    expect(() => validateYamlConfig({ llm: 'string' })).toThrow(ConfigValidationError);
  });

  it('rejects non-object notes', () => {
    expect(() => validateYamlConfig({ notes: 42 })).toThrow(ConfigValidationError);
  });

  it('rejects non-object filters', () => {
    expect(() => validateYamlConfig({ filters: true })).toThrow(ConfigValidationError);
  });

  it('rejects invalid style', () => {
    expect(() =>
      validateYamlConfig({ notes: { style: 'verbose' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects invalid max-input-tokens (non-number)', () => {
    expect(() =>
      validateYamlConfig({ llm: { 'max-input-tokens': 'big' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects max-input-tokens out of range', () => {
    expect(() =>
      validateYamlConfig({ llm: { 'max-input-tokens': 50 } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects null root', () => {
    expect(() => validateYamlConfig(null)).toThrow(ConfigValidationError);
  });

  it('accepts config with no optional sections', () => {
    const config = validateYamlConfig({});
    expect(config).toEqual({});
  });

  it('rejects temperature as non-number', () => {
    expect(() =>
      validateYamlConfig({ llm: { temperature: 'hot' } }),
    ).toThrow(ConfigValidationError);
  });

  it('rejects null llm value', () => {
    expect(() => validateYamlConfig({ llm: null })).toThrow(ConfigValidationError);
  });

  it('rejects null notes value', () => {
    expect(() => validateYamlConfig({ notes: null })).toThrow(ConfigValidationError);
  });

  it('rejects null filters value', () => {
    expect(() => validateYamlConfig({ filters: null })).toThrow(ConfigValidationError);
  });
});

describe('loadYamlConfig', () => {
  it('loads valid YAML config', async () => {
    const config = await loadYamlConfig(resolve(FIXTURES, 'valid-config.yml'));
    expect(config).not.toBeNull();
    expect(config?.llm?.provider).toBe('anthropic');
    expect(config?.notes?.tone).toBe('product');
  });

  it('returns null for non-existent file', async () => {
    const config = await loadYamlConfig('/non/existent/path.yml');
    expect(config).toBeNull();
  });

  it('throws for invalid YAML config', async () => {
    await expect(
      loadYamlConfig(resolve(FIXTURES, 'invalid-config.yml')),
    ).rejects.toThrow(ConfigValidationError);
  });
});

describe('mergeConfig', () => {
  it('uses defaults when no yaml or inputs', () => {
    const config = mergeConfig({ githubToken: 'tok' }, null);
    expect(config.llm.provider).toBe('openai');
    expect(config.versionPrefix).toBe('v');
    expect(config.filters.skipBots).toBe(true);
  });

  it('yaml overrides defaults', () => {
    const config = mergeConfig({ githubToken: 'tok' }, {
      llm: { provider: 'anthropic' },
      notes: { tone: 'product' },
    });
    expect(config.llm.provider).toBe('anthropic');
    expect(config.notes.tone).toBe('product');
  });

  it('action inputs override yaml', () => {
    const config = mergeConfig(
      { githubToken: 'tok', llmProvider: 'openai', llmModel: 'gpt-4o' },
      { llm: { provider: 'anthropic', model: 'claude-haiku-4-5' } },
    );
    expect(config.llm.provider).toBe('openai');
    expect(config.llm.model).toBe('gpt-4o');
  });

  it('treats empty string inputs as unset', () => {
    const config = mergeConfig(
      { githubToken: 'tok', llmProvider: '', version: '  ' },
      { llm: { provider: 'anthropic' } },
    );
    expect(config.llm.provider).toBe('anthropic');
    expect(config.explicitVersion).toBeUndefined();
  });

  it('reads API key from env var specified in yaml', () => {
    const prev = process.env.MY_KEY;
    process.env.MY_KEY = 'env-key-value';
    const config = mergeConfig({ githubToken: 'tok' }, {
      llm: { 'api-key-env': 'MY_KEY' },
    });
    expect(config.llm.apiKey).toBe('env-key-value');
    if (prev === undefined) delete process.env.MY_KEY;
    else process.env.MY_KEY = prev;
  });

  it('parses dry-run correctly', () => {
    const config = mergeConfig({ githubToken: 'tok', dryRun: 'true' }, null);
    expect(config.dryRun).toBe(true);
  });
});

describe('loadConfig', () => {
  it('loads with minimal inputs', async () => {
    const config = await loadConfig({
      githubToken: 'tok',
      configPath: '/non/existent.yml',
    });
    expect(config.githubToken).toBe('tok');
    expect(config.llm.provider).toBe('openai');
  });

  it('merges yaml file with inputs', async () => {
    const config = await loadConfig({
      githubToken: 'tok',
      configPath: resolve(FIXTURES, 'valid-config.yml'),
      llmApiKey: 'my-key',
    });
    expect(config.llm.provider).toBe('anthropic');
    expect(config.llm.apiKey).toBe('my-key');
    expect(config.release.draft).toBe(true);
  });

  it('masks secrets via logger', async () => {
    const { Logger } = await import('../../../src/utils/logger.js');
    const logger = new Logger('debug');
    const spy = vi.spyOn(logger, 'maskSecret');
    await loadConfig({
      githubToken: 'gh-token',
      llmApiKey: 'llm-key',
      configPath: '/non/existent.yml',
    }, logger);
    expect(spy).toHaveBeenCalledWith('llm-key');
    expect(spy).toHaveBeenCalledWith('gh-token');
  });
});
