import type { GitHubClient } from '../core/github-client.js';
import type { ReleaseResult, ReleaseConfig, VersionInfo, RepositoryInfo } from '../types.js';
import type { Logger } from '../utils/logger.js';
export interface PublishContext {
    versionInfo: VersionInfo;
    releaseNotes: string;
    repository: RepositoryInfo;
    headRef: string;
    releaseConfig: ReleaseConfig;
    dryRun: boolean;
}
export declare function publishRelease(context: PublishContext, githubClient: GitHubClient, logger: Logger): Promise<ReleaseResult | null>;
//# sourceMappingURL=release-publisher.d.ts.map