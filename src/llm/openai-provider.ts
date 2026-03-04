import OpenAI from 'openai';
import type { LLMConfig, LLMProvider, ReleaseContext } from '../types.js';
import type { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { getSystemPrompt, buildUserPrompt, truncateContext } from './prompt-builder.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: LLMConfig;
  private logger: Logger;

  constructor(config: LLMConfig, logger: Logger) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.config = config;
    this.logger = logger;
  }

  async generateReleaseNotes(context: ReleaseContext): Promise<string> {
    const truncated = truncateContext(context, this.config.maxInputTokens);
    const userPrompt = buildUserPrompt(truncated);
    const model = this.config.model ?? DEFAULT_MODEL;

    this.logger.info(`Generating release notes with OpenAI (${model})`);

    const response = await withRetry(() =>
      this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxOutputTokens,
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    this.logger.debug('OpenAI response received', {
      tokens: response.usage?.total_tokens,
    });

    return content.trim();
  }
}
