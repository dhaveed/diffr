# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-07

### Added
- LLM prompt sanitization to prevent prompt injection from commit messages and PR bodies
- 60-second timeouts for LLM API requests (OpenAI and Anthropic)
- Debug logging for previously silent catch blocks in GitHub client
- Conventional commit-aware version bumping (`feat` → minor, breaking → major)
- `.env.example` with placeholder configuration values
- `SECURITY.md` with vulnerability reporting instructions
- `CHANGELOG.md` (this file)
- Production release workflow (`.github/workflows/release.yml`)
- `LICENSE` file (MIT)

### Fixed
- Unhandled promise rejection at action entry point
- Duplicate compare link when using fallback generator (orchestrator already appends it)
- Non-null assertions (`!`) replaced with safe access patterns in fallback generator
- Hardcoded `'main'` default branch now reads from GitHub context

### Changed
- Version bumping now respects conventional commit semantics instead of always using `patch`

## [0.1.0] - 2026-03-04

### Added
- Initial release
- GitHub Action with OpenAI and Anthropic LLM support
- Fallback generator for no-LLM usage
- Conventional commit parsing
- Automatic version detection from tags
- Dry-run mode
- `.diffr.yml` configuration support
- CI pipeline with typecheck, lint, test, build
- Dogfood workflow (release-self)
