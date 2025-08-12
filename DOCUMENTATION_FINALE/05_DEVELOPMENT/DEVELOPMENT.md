Prerequisites

- Node.js >= 18, npm >= 9
- (Optional) Python 3.11 for Discord bot (heavy OCR stack)
- OpenAI API key for OCR features

Getting started (local)

1) Clone and install

```bash
npm install
```

2) Configure server env

```bash
cp server/env.example server/.env
# Edit server/.env and set OPENAI_API_KEY and other values
```

3) Run dev servers (concurrently)

```bash
npm run dev
# Client: http://localhost:5173
# API:    http://localhost:3001
# Health: http://localhost:3001/health and http://localhost:3001/api/health
```

Offline mode (no external services)

1) Fetch Scryfall dataset once:
```bash
./scripts/fetch-scryfall-bulk.sh
```
This downloads `data/scryfall-default-cards.json`.

2) Enable offline mode:
```bash
cp server/env.example server/.env
# Ensure OFFLINE_MODE=true and SCRYFALL_DATA_PATH=./data/scryfall-default-cards.json
```

3) Start as usual (`npm run dev`). OCR will use a local Python helper (Tesseract/EasyOCR if available) and card validation will query the local dataset only.

Quality gates

- Lint: `npm run lint` or `npm run lint:client` / `npm run lint:server`
- Type-check: `npm --workspace client run type-check`; server type-checks on build (`npm run build:server`).

Docker (developer convenience)

- Minimal images for `server/` and `client/` are provided. Compose expects these Dockerfiles and a running API on port 3001 and Vite on 5173.

```bash
docker-compose up -d web-api web-frontend
```

Testing

- Test suites are being stabilized. Current OCR-focused tests in `tests/` depend on external services and a missing EasyOCR wrapper; they are disabled in CI for now. Next steps:
  - Add unit tests for `services/scryfallService.ts` with mocked axios
  - Add route tests using supertest for `/api/cards` and `/api/export`

Contributing

- See `CONTRIBUTING.md`. Use feature branches, open PRs, keep commits atomic. Lint and build must pass.
