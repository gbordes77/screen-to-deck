# Changelog

All notable changes to this project will be documented in this file.

## [2.0.3] - 2025-08-10
### Added
- **QA & Testing Infrastructure**
  - Comprehensive QA audit with 4 specialized AI agents (QA Expert, Test Automator, Debugger, Documentation Expert)
  - Created 30+ critical tests for 60+15 card guarantee validation
  - E2E test suite for OCR pipeline (`/server/tests/e2e/ocr-guarantee.test.ts`)
  - Python tests for Discord bot (`/discord-bot/tests/test_ocr_guarantee.py`)
  - Test automation scripts (`run-critical-tests.sh`, `validate-60-15-guarantee.js`)

- **Enhanced OCR Service Improvements**
  - Created `enhancedOcrServiceGuaranteed.ts` with absolute 60+15 card guarantee
  - Implemented retry mechanism with exponential backoff (up to 10 attempts)
  - Added force completion mechanism for partial results
  - Emergency fallback deck generation for catastrophic failures
  - Fixed Python script paths (super-resolution, EasyOCR integration)

- **Discord Bot Unification**
  - Created `ocr_parser_unified.py` for consistency between Discord and Web
  - Option to use web API or local processing with same guarantee logic
  - Fixed import issues and parameter mismatches

- **Documentation & Reports**
  - `QA_CRITICAL_ISSUES_REPORT.md` - 15 critical issues identified
  - `QA_FINAL_REPORT_2025.md` - Comprehensive final QA report with metrics
  - `TEST_EXECUTION_REPORT.md` - Test execution results and failures
  - `CRITICAL_FIXES_REQUIRED.md` - Detailed fix guide with code solutions
  - `OCR_DEBUGGING_REPORT.md` - OCR service error analysis
  - `QA_TEST_COVERAGE_REPORT.md` - Test coverage metrics and gaps

### Changed
- Updated TypeScript interfaces to include `section` and `format` properties for MTGCard
- Fixed Jest/TypeScript configuration issues (partial)
- Improved error handling across all OCR pipelines
- Enhanced validation logic to enforce strict 60+15 totals

### Fixed
- Python script path resolution using `path.resolve()` instead of relative paths
- TypeScript type definitions for OCR results
- Import errors in Discord bot tests
- Memory leak potential in temporary file handling

### Known Issues
- Tests not fully functional due to Jest/TypeScript configuration
- OpenAI mock imports incorrect
- Python pytest missing scryfall_service parameter
- 0% test coverage - configuration needs complete overhaul

### Status
- **⚠️ CRITICAL** - Not ready for production
- Estimated time to production: 1-2 weeks (40-60 hours)
- Guarantee 60+15: Code implemented but NOT validated
- Test coverage: 0% functional
- Recommendation: DO NOT DEPLOY until all tests pass

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
