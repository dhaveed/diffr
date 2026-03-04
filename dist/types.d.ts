export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    date: string;
    conventionalType?: string;
    conventionalScope?: string;
    isBreaking?: boolean;
    description?: string;
}
export interface PullRequestInfo {
    number: number;
    title: string;
    body: string;
    author: string;
    labels: string[];
    mergedAt: string;
    url: string;
}
export interface ChangeEntry {
    commit: CommitInfo;
    pullRequest?: PullRequestInfo;
}
export interface ChangeSet {
    entries: ChangeEntry[];
    baseRef: string | null;
    headRef: string;
    repository: RepositoryInfo;
}
export interface RepositoryInfo {
    owner: string;
    repo: string;
    defaultBranch: string;
    url: string;
}
export interface ReleaseContext {
    repository: RepositoryInfo;
    previousVersion: string | null;
    newVersion: string;
    changes: ChangeEntry[];
    impactSummary: ImpactSummary;
}
export interface ImpactSummary {
    totalCommits: number;
    totalPullRequests: number;
    contributors: string[];
    areas: string[];
    hasBreakingChanges: boolean;
}
export type BumpType = 'major' | 'minor' | 'patch';
export interface VersionInfo {
    version: string;
    tag: string;
    bump: BumpType | null;
    isInitial: boolean;
}
export type LLMProviderType = 'openai' | 'anthropic';
export interface LLMConfig {
    provider: LLMProviderType;
    apiKey: string;
    model?: string;
    maxInputTokens: number;
    maxOutputTokens: number;
    temperature: number;
}
export interface LLMProvider {
    generateReleaseNotes(context: ReleaseContext): Promise<string>;
}
export interface ReleaseResult {
    id: number;
    url: string;
    tag: string;
    version: string;
    notes: string;
    isDraft: boolean;
    isPrerelease: boolean;
    alreadyExisted: boolean;
}
export interface PublishOptions {
    tag: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    targetCommitish: string;
}
export interface DiffrConfig {
    githubToken: string;
    llm: LLMConfig;
    versionPrefix: string;
    explicitVersion?: string;
    initialVersion: string;
    dryRun: boolean;
    configPath: string;
    filters: FilterConfig;
    notes: NotesConfig;
    release: ReleaseConfig;
}
export interface FilterConfig {
    excludeLabels: string[];
    excludeAuthors: string[];
    skipBots: boolean;
}
export interface NotesConfig {
    tone: 'technical' | 'product' | 'marketing';
    style: 'concise' | 'detailed';
    includeAuthors: boolean;
    includePrLinks: boolean;
    includeCompareLink: boolean;
}
export interface ReleaseConfig {
    draft: boolean;
    prerelease: boolean;
}
export interface PipelineResult {
    success: boolean;
    release?: ReleaseResult;
    version?: string;
    tag?: string;
    releaseNotes?: string;
    dryRun: boolean;
    skipped: boolean;
    skipReason?: string;
    error?: string;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
