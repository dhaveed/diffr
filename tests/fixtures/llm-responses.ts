export const MOCK_OPENAI_RESPONSE = {
  choices: [
    {
      message: {
        content: `### Features
- Added OAuth2 authentication support (#42, @janedoe)
- Redesigned user profile page with improved UX (@alice)

### Bug Fixes
- Fixed redirect loop on expired sessions (#43, @bobsmith)`,
      },
    },
  ],
  usage: { total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 },
};

export const MOCK_ANTHROPIC_RESPONSE = {
  content: [
    {
      type: 'text' as const,
      text: `### Features
- Added OAuth2 authentication support (#42, @janedoe)
- Redesigned user profile page with improved UX (@alice)

### Bug Fixes
- Fixed redirect loop on expired sessions (#43, @bobsmith)`,
    },
  ],
  usage: { input_tokens: 100, output_tokens: 50 },
};

export const MOCK_EMPTY_OPENAI_RESPONSE = {
  choices: [{ message: { content: null } }],
  usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
};
