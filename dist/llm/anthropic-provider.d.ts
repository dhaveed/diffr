import type { LLMConfig, LLMProvider, ReleaseContext } from '../types.js';
import type { Logger } from '../utils/logger.js';
export declare class AnthropicProvider implements LLMProvider {
    private client;
    private config;
    private logger;
    constructor(config: LLMConfig, logger: Logger);
    generateReleaseNotes(context: ReleaseContext): Promise<string>;
}
//# sourceMappingURL=anthropic-provider.d.ts.map