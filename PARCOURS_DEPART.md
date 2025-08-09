# Parcours de départ — Fin de mission (Start Here)

Copiez-collez et suivez ces étapes dans l’ordre pour une passation propre et complète.

## 0) Lire et cadrer
- Checklist complète: `MISSION_CLOSEOUT.md`
- Historique des changements: `CHANGELOG.md`
- Procédure de rollback: `ROLLBACK.md`
- Vision/Archi pour cohérence finale: `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`

## 1) Geler l’état
```bash
git status     # arbre propre
git pull       # à jour
```
- Mettez à jour la doc si nécessaire (Overview/Archi/Dev/Test Plan).

## 2) Qualité & sécurité (local)
```bash
bash scripts/bootstrap-local.sh
./scripts/one-button.sh --no-wait
curl -f http://localhost:3001/health && curl -f http://localhost:3001/api/health
```
- Vérifier: UI OK, /api/docs, /metrics.
- Secrets: pas de clés en clair (vérifier diffs, `.env` non commités).

## 3) Documentation à jour
- `PROJECT_OVERVIEW.md` (porte d’entrée)
- `ARCHITECTURE.md`, `DEVELOPMENT.md`, `SELF_HOSTING.md`, `TEST_PLAN.html`
- `PARCOURS_ARRIVEE.md/.html`, `PARCOURS_DEPART.md/.html`

## 4) Release & changelog
```bash
git log --oneline $(git describe --tags --abbrev=0)..HEAD  # delta depuis dernier tag
# Mettre à jour CHANGELOG.md
# Créer release vX.Y.Z avec notes (GitHub Releases)
```

## 5) Backlog & issues
- Ouvrir/mettre à jour les P1 restantes (description claire, why/how/acceptance)
- Marquer "Good first issue" pour onboarding futur

## 6) Handover (synchronisé)
- Démo live (self-host), Q&A, enregistrement si possible
- Partager `MISSION_CLOSEOUT.md` coché, les notes de release, et liens utiles

## 7) Archivage et contacts
- Confirmer CI verte
- Tag final publié
- Contact de passation (email/Slack) communiqué
