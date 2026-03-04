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
export declare class ConfigValidationError extends Error {
    field: string;
    constructor(message: string, field: string);
}
export declare function validateYamlConfig(config: unknown): YamlConfig;
