Contributing guidelines

- Branching: feature branches from `main`. Open PRs with a concise summary and test plan.
- Coding style: TypeScript with explicit types for public APIs; ESLint + Prettier defaults.
- Commits: small, focused; reference issues; no secrets in code or examples.
- Lint/Build: required. Run `npm run lint` and `npm run build` before pushing.
- Tests: prefer unit tests with mocks; avoid external API calls in CI.
- Security: never commit real credentials. Use `.env` locally; templates must use placeholders.
