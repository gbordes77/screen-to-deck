# Screen to Deck — Analyse de projet (état actuel et plan de finalisation)

Dernière activité repo: 2025-07-03  •  Dépôt: `https://github.com/gbordes77/screen-to-deck`

## Synthèse rapide
- **Statut**: très avancé • composants en place (client, serveur, bot Discord, CI/CD, Docker)
- **Completion estimée**: Backend 80% • Frontend 70% • Bot 85% • Tests 60% • Déploiement 60%
- **Objectif**: finaliser les secrets/env, stabiliser l’API d’upload/scan, valider OCR en prod (fallback), déployer et brancher le monitoring

## Architecture & périmètre
- **Client (React + TS + Vite)**: `client/` — upload images, suivi de traitement, exports (MTGA/Moxfield/Archidekt/TappedOut)
- **Serveur (Node/Express, TS)**: `server/` — endpoints `/api`, OCR multi-pipeline (OpenAI Vision ⇒ fallback Tesseract), validation Scryfall, cache/Redis, stockage (Supabase/S3)
- **Bot Discord (Python)**: `discord-bot/` — OCR depuis images postées, exports intégrés, rapports
- **Infra / DevOps**: Docker Compose (prod + monitoring), Fly.io, scripts Supabase, workflows CI/CD GitHub

Arborescence utile:
- `client/` • `server/` • `discord-bot/`
- `server/src/routes/*` • `server/src/services/enhanced-ocr*.ts` • `server/src/services/scryfallService.ts`
- `docker-compose.prod.yml` • `Dockerfile.saas` • `fly.web.toml` • `scripts/*.sh`
- `supabase/schema.sql` • `supabase/config.toml`
- `tests/*.spec.ts`

## Éléments prêts
- Serveur Express durci (helmet, CORS, rate-limit, compression, logs morgan)
- OCR multi-pipeline avec fallback (tests de performance et de robustesse présents)
- Validation Scryfall (exact/fuzzy), corrections OCR, similarité de noms
- Client prêt au build (Vite), routing, UI d’upload
- Bot Discord fonctionnel localement/Docker
- CI/CD, Docker, Fly.io, et stack de monitoring (Prometheus/Grafana/Loki)

## Reste à faire (plan par priorité)

### P0 — Opérationnel (à faire en premier)
- Secrets/env
  - `server/.env`: `OPENAI_API_KEY`, `CORS_ORIGIN`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (ou service key), `AWS_*` si S3 activé
  - `discord-bot/.env`: `DISCORD_BOT_TOKEN`
- Supabase
  - Démarrer et appliquer le schéma, générer les types TS
    ```bash
    npm run supabase:setup     # si disponible, sinon:
    supabase start
    npm run supabase:push
    npm run supabase:gen-types
    ```
- Pipeline OCR en prod
  - Vérifier OpenAI Vision, limites/quota, latence < 5s
  - Contrôler le fallback Tesseract (qualité et temps de traitement)
- API & CORS
  - Stabiliser `/api/scan` (upload, limite 10 MB, erreurs propres)
  - Aligner `CORS_ORIGIN` avec l’URL front (dev/prod)

### P1 — Qualité & déploiement
- Tests serveur
  - Étendre tests routes (200/400/413/429), erreurs réseau, timeouts, résilience cache
  - Lancer la suite:
    ```bash
    npm run test
    ```
- Déploiement
  - Fly.io (ou Docker Compose prod)
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```
  - Configurer santé (`/health`), variables d’env, persistance (uploads/S3), scale minimal
- Monitoring & logs
  - Activer Prometheus/Grafana/Loki, tableaux de bord (latence OCR, taux fallback, taux succès validation)

### P2 — Finitions produit
- UI/UX
  - Barre de progression fiable, messages d’erreur clairs, état offline/retry
  - Exports (MTGA/Moxfield/Archidekt/TappedOut) testés E2E
- Détection de format
  - Affiner règles (Commander/Standard/etc.), exposer métriques (confiance, heuristiques)
- Documentation finale
  - README déploiement (dev/staging/prod), limites connues, runbook incidents

## Démarrage rapide (dev)
```bash
# À la racine du projet
npm install
npm run check-prerequisites   # si disponible
npm run dev                   # lance server + client
# Serveur: http://localhost:3001/health  •  Front: http://localhost:5173
```
Bot Discord (optionnel):
```bash
cd "discord-bot"
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
./start_bot.sh
```

## Déploiement (pistes)
- Fly.io: `flyctl deploy` (voir `fly.web.toml`, secrets à définir via `flyctl secrets set`)
- Docker Compose prod: `docker-compose -f docker-compose.prod.yml up -d`
- Monitoring: `docker-compose -f docker-compose.prod.yml up prometheus grafana loki -d`

## Risques & mitigations
- Quotas OpenAI / latence variable ⇒ fallback Tesseract, file d’attente, backoff
- CORS / upload lourds ⇒ limites adaptées, 413 géré proprement, chunking si besoin
- Qualité OCR sur scans « difficiles » ⇒ preprocessing adaptatif; liste d’exceptions
- Scryfall indisponible ⇒ cache local, retries, circuit-breaker léger

## Indicateurs de succès (acceptance)
- Latence scan mono-image < 5s p95 (prod)
- Taux fallback Tesseract < 20% (ciblé)
- Taux validation Scryfall >= 90% (ciblé sur deck « standards »)
- Export MTGA/Moxfield validé E2E

---

Références internes utiles:
- Tests: `tests/*.spec.ts`
- OCR pipeline: `server/src/services/enhanced-ocr*.ts`, `discord-bot/ocr_parser_easyocr.py`
- Supabase: `supabase/schema.sql`, scripts npm `supabase:*`
- Déploiement: `Dockerfile.saas`, `docker-compose.prod.yml`, `fly.web.toml`, `.github/workflows/*`
