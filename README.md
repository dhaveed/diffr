# diffr

AI-powered GitHub Release Generator — automatically generates structured release notes from your commits and pull requests.

## Why diffr?

Writing release notes is tedious. **diffr** analyzes your commits and PRs, then uses an LLM to generate clean, categorized release notes and publish them as a GitHub Release — all in one step.

- Works with **OpenAI** and **Anthropic** out of the box
- Falls back to structured notes if no API key is provided or the LLM fails
- Parses [Conventional Commits](https://www.conventionalcommits.org/) automatically (but doesn't require them)
- Idempotent — safe to re-run without creating duplicates
- Supports dry-run mode for previewing before publishing

## Quick Start

Add this to your workflow (e.g. `.github/workflows/release.yml`):

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: dhaveed/diffr@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          llm-provider: openai
          llm-api-key: ${{ secrets.OPENAI_API_KEY }}
```

> **Note:** `fetch-depth: 0` is required so diffr can compare commits across tags.

## Inputs

| Input            | Description                             | Required | Default                                     |
| ---------------- | --------------------------------------- | -------- | ------------------------------------------- |
| `github-token`   | GitHub token for API access             | Yes      | `${{ github.token }}`                       |
| `llm-provider`   | LLM provider (`openai` or `anthropic`)  | No       | `openai`                                    |
| `llm-api-key`    | API key for the LLM provider            | No       | —                                           |
| `llm-model`      | Model override                          | No       | `gpt-4o-mini` / `claude-haiku-4-5-20251001` |
| `version`        | Explicit version (skips auto-detection) | No       | —                                           |
| `version-prefix` | Tag prefix                              | No       | `v`                                         |
| `dry-run`        | Preview without publishing              | No       | `false`                                     |
| `config-path`    | Path to config file                     | No       | `.diffr.yml`                                |

## Outputs

| Output          | Description                        |
| --------------- | ---------------------------------- |
| `version`       | Resolved version (e.g. `1.0.1`)    |
| `tag`           | Created git tag (e.g. `v1.0.1`)    |
| `release-url`   | URL of the GitHub Release          |
| `release-notes` | Generated release notes (markdown) |
| `dry-run`       | Whether this was a dry run         |

### Using outputs

```yaml
- uses: dhaveed/diffr@v1
  id: release
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- run: echo "Released ${{ steps.release.outputs.tag }}"
```

## Configuration

Create a `.diffr.yml` in your repo root for advanced configuration:

```yaml
llm:
  provider: openai
  model: gpt-4o-mini
  api-key-env: OPENAI_API_KEY # env var containing the key
  max-input-tokens: 16000
  temperature: 0.2

versioning:
  prefix: 'v'
  initial-version: '0.1.0'

notes:
  tone: technical # technical | product | marketing
  style: detailed # concise | detailed
  include-authors: true
  include-pr-links: true
  include-compare-link: true

filters:
  exclude-labels:
    - no-release
    - skip-release-notes
  exclude-authors: []
  skip-bots: true # skip dependabot, renovate, etc.

release:
  draft: false
  prerelease: false
```

All fields are optional — diffr ships with sensible defaults.

## How It Works

1. **Collect** — finds all commits and merged PRs since the last release tag
2. **Analyze** — parses conventional commits, extracts scopes and breaking changes
3. **Generate** — sends the changeset to the LLM (or uses the fallback generator)
4. **Publish** — creates a GitHub Release with the generated notes

### Example Output

```markdown
## What's New in v1.0.1

> **14** commits | **6** pull requests | **3** contributors
> Areas affected: **Authentication**, **Webhooks**

### Features

- Add OAuth2 login support (#42) — @alice

### Bug Fixes

- Fix session expiry on refresh (#38) — @bob

### Improvements

- Optimize database queries for user lookup (#40) — @carol

[Compare changes](https://github.com/owner/repo/compare/v1.0.0...v1.0.1)
```

## Providers

### OpenAI (default)

```yaml
- uses: dhaveed/diffr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    llm-provider: openai
    llm-api-key: ${{ secrets.OPENAI_API_KEY }}
    llm-model: gpt-4o-mini # optional
```

### Anthropic

```yaml
- uses: dhaveed/diffr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    llm-provider: anthropic
    llm-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    llm-model: claude-haiku-4-5-20251001 # optional
```

### No LLM (fallback only)

If you omit `llm-api-key`, diffr generates structured release notes from commit metadata without calling any LLM.

## Dry Run

Preview what diffr would publish without actually creating a release:

```yaml
- uses: dhaveed/diffr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    dry-run: 'true'
```

The generated notes are available via the `release-notes` output.

## License

[MIT](LICENSE)
