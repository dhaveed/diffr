import { type YamlConfig } from './schema.js';
import type { DiffrConfig } from '../types.js';
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
export declare function loadConfig(inputs: ActionInputs, logger?: Logger): Promise<DiffrConfig>;
export declare function loadYamlConfig(path: string, logger?: Logger): Promise<YamlConfig | null>;
export declare function mergeConfig(inputs: ActionInputs, yaml: YamlConfig | null): DiffrConfig;
//# sourceMappingURL=loader.d.ts.map