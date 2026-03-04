export interface YamlConfig {
  llm?: {
    provider?: string;
    model?: string;
    'api-key-env'?: string;
    'max-input-tokens'?: number;
    temperature?: number;
  };
  versioning?: {
    prefix?: string;
    'initial-version'?: string;
  };
  notes?: {
    tone?: string;
    style?: string;
    'include-authors'?: boolean;
    'include-pr-links'?: boolean;
    'include-compare-link'?: boolean;
  };
  filters?: {
    'exclude-labels'?: string[];
    'exclude-authors'?: string[];
    'skip-bots'?: boolean;
  };
  release?: {
    draft?: boolean;
    prerelease?: boolean;
  };
}

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(`Config validation error [${field}]: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

const VALID_PROVIDERS = ['openai', 'anthropic'];
const VALID_TONES = ['technical', 'product', 'marketing'];
const VALID_STYLES = ['concise', 'detailed'];

export function validateYamlConfig(config: unknown): YamlConfig {
  if (typeof config !== 'object' || config === null) {
    throw new ConfigValidationError('Config must be an object', 'root');
  }

  const c = config as Record<string, unknown>;

  if (c.llm !== undefined) {
    if (typeof c.llm !== 'object' || c.llm === null) {
      throw new ConfigValidationError('Must be an object', 'llm');
    }
    const llm = c.llm as Record<string, unknown>;

    if (llm.provider !== undefined && !VALID_PROVIDERS.includes(llm.provider as string)) {
      throw new ConfigValidationError(
        `Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        'llm.provider',
      );
    }
    if (llm['max-input-tokens'] !== undefined) {
      const v = llm['max-input-tokens'];
      if (typeof v !== 'number' || v < 100 || v > 200000) {
        throw new ConfigValidationError('Must be a number between 100 and 200000', 'llm.max-input-tokens');
      }
    }
    if (llm.temperature !== undefined) {
      const v = llm.temperature;
      if (typeof v !== 'number' || v < 0 || v > 2) {
        throw new ConfigValidationError('Must be a number between 0 and 2', 'llm.temperature');
      }
    }
  }

  if (c.notes !== undefined) {
    if (typeof c.notes !== 'object' || c.notes === null) {
      throw new ConfigValidationError('Must be an object', 'notes');
    }
    const notes = c.notes as Record<string, unknown>;

    if (notes.tone !== undefined && !VALID_TONES.includes(notes.tone as string)) {
      throw new ConfigValidationError(
        `Must be one of: ${VALID_TONES.join(', ')}`,
        'notes.tone',
      );
    }
    if (notes.style !== undefined && !VALID_STYLES.includes(notes.style as string)) {
      throw new ConfigValidationError(
        `Must be one of: ${VALID_STYLES.join(', ')}`,
        'notes.style',
      );
    }
  }

  if (c.filters !== undefined) {
    if (typeof c.filters !== 'object' || c.filters === null) {
      throw new ConfigValidationError('Must be an object', 'filters');
    }
    const filters = c.filters as Record<string, unknown>;
    if (filters['exclude-labels'] !== undefined && !Array.isArray(filters['exclude-labels'])) {
      throw new ConfigValidationError('Must be an array', 'filters.exclude-labels');
    }
    if (filters['exclude-authors'] !== undefined && !Array.isArray(filters['exclude-authors'])) {
      throw new ConfigValidationError('Must be an array', 'filters.exclude-authors');
    }
  }

  return config as YamlConfig;
}
