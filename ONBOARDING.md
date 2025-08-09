# Onboarding (90 minutes)

Goal: get productive on Screen-to-Deck quickly.

1) Setup (15m)
- Install Node 20+, npm 9+, Redis (optional), Docker (optional)
- Clone repo and install deps: `npm install`
- Copy env: `cp server/env.example server/.env` and set `OPENAI_API_KEY`

2) Run (10m)
- One command: `./scripts/self-host.sh`
- Health: `curl http://<LAN_IP>:3001/health`
- Front: `http://<LAN_IP>:5173`

3) Validate (20m)
- Follow `TEST_PLAN.html` (upload OCR, validate, export)
- Open `/api/docs` (OpenAPI) to inspect endpoints

4) Read (20m)
- `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `SELF_HOSTING.md`
- CI/Security: `.github/workflows/*`, Dependabot, Gitleaks

5) Contribute (25m)
- Branch from `main`; keep commits small
- Lint/build locally; open PR with template; update docs/changelog as needed
- No secrets in commits; use `.env`
