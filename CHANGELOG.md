# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1] - 2025-08-08
### Added
- API: `/api/health` endpoint for infra health checks.
- CI: GitHub Actions for lint/type-check/build; weekly Dependabot.
- Security: Gitleaks secret scan workflow (non-blocking for now).
- Docker: Minimal `server/Dockerfile` and `client/Dockerfile`.
- Docs: `AUDIT.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Changed
- Bump versions to 2.0.1 across root, client, server.
- Root `package.json` repository URL points to `gbordes77/screen-to-deck`.
- `server/env.example` and `.env.template` sanitized to remove real secrets.

### Notes
- OCR/EasyOCR end-to-end tests are not wired in CI due to external deps. Plan to add unit/integration tests with mocks.

## [2.0.0] - previous
- Initial SaaS workspace structure and docs.
