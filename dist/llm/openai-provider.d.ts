import type { LLMConfig, LLMProvider, ReleaseContext } from '../types.js';
import type { Logger } from '../utils/logger.js';
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private config;
    private logger;
    constructor(config: LLMConfig, logger: Logger);
    generateReleaseNotes(context: ReleaseContext): Promise<string>;
}
//# sourceMappingURL=openai-provider.d.ts.map