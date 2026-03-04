import type { Logger } from '../utils/logger.js';
import type { PublishOptions } from '../types.js';
export interface CompareResult {
    commits: Array<{
        sha: string;
        commit: {
            message: string;
            author: {
                name: string;
                date: string;
            } | null;
        };
        author: {
            login: string;
        } | null;
    }>;
}
export interface ReleaseData {
    id: number;
    tag_name: string;
    html_url: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
}
export interface PullRequestData {
    number: number;
    title: string;
    body: string | null;
    user: {
        login: string;
    } | null;
    labels: Array<{
        name?: string;
    }>;
    merged_at: string | null;
    html_url: string;
}
export declare class GitHubClient {
    private octokit;
    private owner;
    private repo;
    private logger;
    constructor(token: string, owner: string, repo: string, logger: Logger);
    getLatestRelease(): Promise<ReleaseData | null>;
    getLatestTag(): Promise<string | null>;
    compareCommits(base: string, head: string): Promise<CompareResult>;
    listPullRequestsForCommit(sha: string): Promise<PullRequestData[]>;
    getReleaseByTag(tag: string): Promise<ReleaseData | null>;
    tagExists(tag: string): Promise<boolean>;
    createRelease(options: PublishOptions): Promise<ReleaseData>;
}
//# sourceMappingURL=github-client.d.ts.map