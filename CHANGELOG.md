# Changelog

All notable changes to this project will be documented in this file.

## [2.0.2] - 2025-08-09
### Added
- Scryfall batching: use `/cards/collection` (chunks of 75), normalized cache keys; fuzzy fallback.
- Observability & contracts: pino+pino-http with request-id, stricter CSP; Zod validation on OCR/Cards/Export; OpenAPI served at `/api/docs`.
- Jobs & quotas: BullMQ + Redis for OCR queue; Prometheus `/metrics`; budget guard (hourly jobs, daily cost limits).
- Production: hardened server Dockerfile (non-root user, healthcheck); client built statically via Nginx in compose prod.
- DX: one-button launcher (`scripts/one-button.sh`), bootstrap local deps (`scripts/bootstrap-local.sh`), self-host `--no-wait`, macOS Keychain secret store.
- Governance & docs: onboarding/departure guides (`PARCOURS_ARRIVEE.*`, `PARCOURS_DEPART.*`), `TEST_PLAN.html`, `ONBOARDING.md`, `MISSION_CLOSEOUT.md`, PR/issue templates, CODEOWNERS.

### Changed
- Server binding configurable via `HOST` (default 127.0.0.1). CSP tightened; security headers updated.

### Notes
- Configure Redis locally (Homebrew or Docker) for queue/quotas.
- One-button path: `./scripts/one-button.sh` then follow `TEST_PLAN.html`.

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
