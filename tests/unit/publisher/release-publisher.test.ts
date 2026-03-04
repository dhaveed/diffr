import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setSecret: vi.fn(),
}));

import { publishRelease, type PublishContext } from '../../../src/publisher/release-publisher.js';
import { Logger } from '../../../src/utils/logger.js';
import { MOCK_REPO, MOCK_RELEASE } from '../../fixtures/github-responses.js';

const logger = new Logger('debug');

function mockGitHubClient(overrides: Record<string, unknown> = {}) {
  return {
    getReleaseByTag: vi.fn().mockResolvedValue(null),
    createRelease: vi.fn().mockResolvedValue({
      id: 2,
      tag_name: 'v1.1.0',
      html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.1.0',
      name: 'v1.1.0',
      body: 'Release notes',
      draft: false,
      prerelease: false,
    }),
    ...overrides,
  };
}

function buildContext(overrides?: Partial<PublishContext>): PublishContext {
  return {
    versionInfo: { version: '1.1.0', tag: 'v1.1.0', bump: 'patch', isInitial: false },
    releaseNotes: '### Features\n- Something new',
    repository: MOCK_REPO,
    headRef: 'main',
    releaseConfig: { draft: false, prerelease: false },
    dryRun: false,
    ...overrides,
  };
}

describe('publishRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new release', async () => {
    const client = mockGitHubClient();
    const result = await publishRelease(buildContext(), client as never, logger);

    expect(result).not.toBeNull();
    expect(result!.tag).toBe('v1.1.0');
    expect(result!.alreadyExisted).toBe(false);
    expect(client.createRelease).toHaveBeenCalledOnce();
  });

  it('returns existing release without creating new one', async () => {
    const client = mockGitHubClient({
      getReleaseByTag: vi.fn().mockResolvedValue(MOCK_RELEASE),
    });
    const result = await publishRelease(buildContext(), client as never, logger);

    expect(result).not.toBeNull();
    expect(result!.alreadyExisted).toBe(true);
    expect(client.createRelease).not.toHaveBeenCalled();
  });

  it('returns null for dry run', async () => {
    const client = mockGitHubClient();
    const result = await publishRelease(
      buildContext({ dryRun: true }),
      client as never,
      logger,
    );

    expect(result).toBeNull();
    expect(client.createRelease).not.toHaveBeenCalled();
  });

  it('passes draft and prerelease options', async () => {
    const client = mockGitHubClient();
    await publishRelease(
      buildContext({ releaseConfig: { draft: true, prerelease: true } }),
      client as never,
      logger,
    );

    expect(client.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true, prerelease: true }),
    );
  });
});
