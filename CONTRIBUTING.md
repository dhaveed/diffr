# Contributing to diffr

Thanks for your interest in contributing! This guide will help you get set up and familiar with how the project works.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) (package manager)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/dhaveed/diffr.git
cd diffr

# Install dependencies
pnpm install

# Run the test suite
pnpm test

# Run the full check (typecheck + lint + test + build)
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Project Structure

```
src/
├── action/           # GitHub Action entry point
├── config/           # Configuration loading & validation
├── core/             # GitHub client, change collection & analysis
├── llm/              # LLM providers, prompt building, fallback
├── publisher/        # GitHub Release creation
├── versioning/       # Semver resolution
├── utils/            # Logger, retry, formatting
├── orchestrator.ts   # Main pipeline
└── types.ts          # Shared TypeScript interfaces

tests/
├── unit/             # Unit tests
├── integration/      # Full pipeline tests with mocked APIs
└── fixtures/         # Mock data for GitHub & LLM responses
```

## Development Commands

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `pnpm build`         | Bundle to `dist/` with ncc           |
| `pnpm typecheck`     | Run TypeScript type checking         |
| `pnpm lint`          | Lint `src/` and `tests/` with ESLint |
| `pnpm test`          | Run all tests with Vitest            |
| `pnpm test:watch`    | Run tests in watch mode              |
| `pnpm test:coverage` | Generate coverage report             |

## Git Hooks

The project uses [Husky](https://typicode.github.io/husky/) to enforce quality checks:

- **pre-commit** — runs `typecheck` and `lint-staged` (auto-fixes lint issues on staged `.ts` files)
- **pre-push** — runs the full check: `typecheck` → `lint` → `test` → `build`

These run automatically. If a hook fails, fix the issue before committing/pushing.

## Making Changes

1. **Fork the repo** and create a branch from `main`
2. **Make your changes** — keep commits focused and use [Conventional Commits](https://www.conventionalcommits.org/) where possible (e.g. `feat: add Groq provider`, `fix: handle empty changelogs`)
3. **Add or update tests** for any new or changed behavior
4. **Run the full check** before pushing:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```
5. **Commit `dist/`** — since this is a GitHub Action, the built output must be checked in. The CI will fail if `dist/` is out of date.
6. **Open a pull request** against `main`

## Rebuilding dist/

After making changes to source code, you must rebuild:

```bash
pnpm build
```

This bundles everything into `dist/index.js` using [@vercel/ncc](https://github.com/vercel/ncc). Always commit the updated `dist/` with your changes — CI verifies it's up to date.

## Writing Tests

Tests use [Vitest](https://vitest.dev/) with globals enabled (`describe`, `it`, `expect` are available without imports).

- **Unit tests** go in `tests/unit/`
- **Integration tests** go in `tests/integration/`
- **Fixtures** (mock data) go in `tests/fixtures/`

Run a specific test file:

```bash
pnpm test tests/unit/orchestrator.test.ts
```

## Code Style

- TypeScript strict mode
- ESLint with `@typescript-eslint` rules
- Unused variables prefixed with `_` are allowed
- No explicit return types required (inferred)
- `any` triggers a warning — prefer proper types

Lint-staged runs ESLint with `--fix` on commit, so most style issues are corrected automatically.

## Adding a New LLM Provider

The LLM layer uses a provider interface pattern. To add a new provider:

1. Create `src/llm/your-provider.ts` implementing the `LLMProvider` interface from `src/types.ts`
2. Register it in `src/llm/provider-factory.ts`
3. Add default model config in `src/config/defaults.ts`
4. Add tests covering the new provider
5. Update the README with usage examples

## Reporting Issues

- Check [existing issues](https://github.com/dhaveed/diffr/issues) first
- Include the workflow YAML and error output when reporting bugs
- For feature requests, describe the use case and expected behavior

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
