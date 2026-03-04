import type { DiffrConfig, PipelineResult, RepositoryInfo } from './types.js';
import { Logger } from './utils/logger.js';
export declare function runPipeline(config: DiffrConfig, repository: RepositoryInfo, headRef: string, logger: Logger): Promise<PipelineResult>;
