import Anthropic from '@anthropic-ai/sdk';
import type { LLMConfig, LLMProvider, ReleaseContext } from '../types.js';
import type { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { getSystemPrompt, buildUserPrompt, truncateContext } from './prompt-builder.js';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private config: LLMConfig;
  private logger: Logger;

  constructor(config: LLMConfig, logger: Logger) {
    this.client = new Anthropic({ apiKey: config.apiKey, timeout: 60_000 });
    this.config = config;
    this.logger = logger;
  }

  async generateReleaseNotes(context: ReleaseContext): Promise<string> {
    const truncated = truncateContext(context, this.config.maxInputTokens);
    const userPrompt = buildUserPrompt(truncated);
    const model = this.config.model ?? DEFAULT_MODEL;

    this.logger.info(`Generating release notes with Anthropic (${model})`);

    const response = await withRetry(() =>
      this.client.messages.create({
        model,
        system: getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxOutputTokens,
      }),
    );

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Anthropic returned empty response');
    }

    this.logger.debug('Anthropic response received', {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    return textBlock.text.trim();
  }
}
