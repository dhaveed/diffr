import type { GitHubClient } from './github-client.js';
import type { ChangeEntry, ChangeSet, FilterConfig, RepositoryInfo } from '../types.js';
import type { Logger } from '../utils/logger.js';
export declare function collectChanges(githubClient: GitHubClient, repository: RepositoryInfo, headRef: string, filters: FilterConfig, logger: Logger): Promise<ChangeSet>;
export declare function resolveBaseRef(githubClient: GitHubClient, logger: Logger): Promise<string | null>;
export declare function filterChanges(entries: ChangeEntry[], filters: FilterConfig, logger: Logger): ChangeEntry[];
export declare function isBot(author: string): boolean;
