# Parcours d’arrivée — Start Here

Copiez-collez et suivez ces étapes dans l’ordre.

## 0) Lire avant d’agir
- Vision: `PROJECT_OVERVIEW.md`
- Architecture: `ARCHITECTURE.md`
- Dev/Ops: `DEVELOPMENT.md`, `SELF_HOSTING.md`
- Qualité/CI: `.github/workflows`, `AUDIT.md`, `CHANGELOG.md`, `ROLLBACK.md`
- Contribution/Gouvernance: `CONTRIBUTING.md`, `.github/`, `MISSION_CLOSEOUT.md`

## 1) Lancer tout (one-button)
```bash
./scripts/one-button.sh
```
- Bootstrap deps → Redis (Homebrew si dispo) → API+Front → Health checks → URLs utiles
- Si Redis n’est pas installé, une commande Docker alternative est proposée à l’écran

## 2) Vérifier
- UI: `http://<IP_LAN>:5173`
- API: `http://<IP_LAN>:3001/health` et `http://<IP_LAN>:3001/api/health`
- Docs API (OpenAPI): `http://<IP_LAN>:3001/api/docs`
- Metrics: `http://<IP_LAN>:3001/metrics`

## 3) Valider E2E
- Ouvrir `TEST_PLAN.html` et suivre le pas-à-pas (upload OCR → validation Scryfall (batch) → export)

## 4) Contribuer
- PR petites, testées; mettre à jour docs/changelog si impact
- Respecter `CONTRIBUTING.md` et templates PR/Issues (`.github/`)

## 5) Avancé (optionnel)
- Ajuster `server/.env` si besoin: `MAX_JOBS_PER_HOUR`, `MAX_DAILY_COST_EUR`, `OCR_CONCURRENCY`
- Observabilité: logs pino (request-id), Prometheus `/metrics`

## 6) Avant livraison/fin
- `CHANGELOG.md`, `ROLLBACK.md`, passation: `MISSION_CLOSEOUT.md`
