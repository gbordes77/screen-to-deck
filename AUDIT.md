Executive summary

- Stack: React + Vite (client), Node/Express TypeScript (server), optional Python Discord bot (EasyOCR). Monorepo managed by npm workspaces.
- Status: Runs locally with Node; Docker compose referenced Dockerfiles were missing; CI/CD absent; tests unstable/incomplete; secrets accidentally committed in env templates.
- Key risks: (1) Hardcoded Cloudflare R2 secrets in `server/env.example` and `server/.env.template` (must be rotated and removed), (2) Nonexistent `server/Dockerfile`/`client/Dockerfile` breaking compose, (3) Test suites not runnable (OpenAI/EasyOCR hard dependencies), (4) No CI gate for lint/build, (5) Potential divergence between docs and code (README promises FastAPI while backend is Express).
- Quick wins applied: Added `/api/health`, created minimal Dockerfiles, set up GitHub Actions (lint + build), sanitized env example/templates.

Architecture overview

- Client (React/Vite, TS) at `client/`, proxies `/api` to server in dev.
- Server (Express, TS) at `server/`, routes under `/api` for OCR, cards (Scryfall), export; uses OpenAI Vision + optional EasyOCR via Python subprocess; strict env validation; health at `/health` and now `/api/health`.
- Discord bot (Python) optional; heavy OCR deps; separate Dockerfile.
- External: OpenAI API, Scryfall API; optional Redis, Cloudflare R2, Supabase (placeholders).

Dependencies & security

- Node >=18; client/server use ESLint + TS; server uses `openai`, `sharp`, `axios`, `express`.
- Python bot requires `opencv`, `easyocr`, `torch` etc. Not suitable for CI by default.
- Secrets: Sensitive Cloudflare R2 values found in env templates; replaced by placeholders in examples. Rotate any real keys immediately and revoke exposed credentials.

Tests & quality

- Root `tests/` contain TS Jest tests targeting OCR pipelines that require OpenAI/EasyOCR and a missing Python wrapper; not runnable in CI.
- Server has Jest deps but no config; client has no test runner configured. Linting available.

CI/CD

- New GitHub Actions workflow runs lint, type-check (client), and builds both packages. Security audit step added (non-blocking).

Performance & ops

- Rate limiting, compression, helmet, CORS in place. Health endpoints present. No structured logging/metrics yet.

Recommendations (top)

- Replace any exposed credentials; move all example envs to placeholders (done). Add secret scanning and Dependabot.
- Add pragmatic tests: unit tests for `scryfallService`, route handlers with supertest and mocked externals; skip OCR/EasyOCR e2e in CI.
- Add server/client Docker production images (multi-stage; static client via Nginx) and fix compose healthchecks (now `/api/health` exists).
- Add observability: structured logs (pino/winston), request IDs, basic metrics (Prometheus) if needed.
- Create ADRs for OCR strategy and external dependencies.
