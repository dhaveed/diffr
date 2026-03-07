# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in diffr, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email **tinny-grubs.4u@icloud.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## API Key Best Practices

diffr requires API keys for LLM providers. Follow these practices:

- **Never** commit API keys to your repository
- Use [GitHub encrypted secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) to store keys
- Use the minimum required permissions for your GitHub token
- Rotate API keys periodically
- Consider using separate API keys for CI vs. production

```yaml
# Correct: use secrets
- uses: dhaveed/diffr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    llm-api-key: ${{ secrets.OPENAI_API_KEY }}

# Wrong: hardcoded key
- uses: dhaveed/diffr@v1
  with:
    llm-api-key: sk-1234567890 # NEVER do this
```

## LLM Safety Measures

diffr includes several safeguards for LLM interactions:

- **Prompt sanitization**: Commit messages and PR bodies are sanitized before being sent to the LLM to mitigate prompt injection attacks
- **Constrained system prompt**: The LLM is instructed to only summarize changes from the provided data, not fabricate information
- **Request timeouts**: LLM requests have a 60-second timeout to prevent hanging
- **Fallback generator**: If the LLM fails or returns unexpected output, diffr falls back to deterministic release notes
- **No code execution**: diffr never executes code from LLM responses

## Dependencies

diffr's production dependencies are bundled into `dist/index.js` via `@vercel/ncc`. Third-party licenses are listed in `dist/licenses.txt`.
