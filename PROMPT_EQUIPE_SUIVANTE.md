# 🚨 PROMPT COMPLET POUR L'ÉQUIPE DE DÉVELOPPEMENT MTG SCREEN-TO-DECK

## 🎯 VOTRE MISSION

Vous êtes l'équipe de développement senior chargée de finaliser et déployer en production le projet **MTG Screen-to-Deck**, un système d'OCR avancé pour Magic: The Gathering qui DOIT GARANTIR l'extraction de exactement 60 cartes mainboard + 15 cartes sideboard depuis n'importe quelle image de deck.

## 📚 PARCOURS DE LECTURE OBLIGATOIRE (ORDRE IMPORTANT)

### Phase 1: Compréhension Générale (2-3 heures)
1. **README.md** - Vue d'ensemble du projet et fonctionnalités
2. **CLAUDE.md** - Instructions spécifiques pour l'IA et architecture
3. **ARCHITECTURE.md** - Architecture technique détaillée
4. **PROJECT_OVERVIEW.md** - Vision produit et objectifs business

### Phase 2: État Actuel & Problèmes (2-3 heures)
5. **QA_CRITICAL_ISSUES_REPORT.md** ⚠️ - 15 problèmes critiques identifiés (PRIORITAIRE)
6. **QA_FINAL_REPORT_2025.md** - Rapport exhaustif avec métriques actuelles
7. **TEST_EXECUTION_REPORT.md** - Résultats des tests et pourquoi ils échouent
8. **MIGRATION_GUIDE_FIXES.md** - Corrections nécessaires pour la migration

### Phase 3: Solutions & Implémentations (3-4 heures)
9. **CRITICAL_FIXES_REQUIRED.md** - Guide détaillé des corrections avec code
10. **OCR_DEBUGGING_REPORT.md** - Analyse approfondie du service OCR
11. **QA_TEST_COVERAGE_REPORT.md** - Tests créés et à implémenter
12. **OCR_ENHANCED_ARCHITECTURE.md** - Architecture OCR améliorée

### Phase 4: Documentation Technique Spécifique (2-3 heures)

#### Web Application
13. **DOCUMENTATION_COMPLETE_WEBAPP/** (dans l'ordre):
    - `01_WEB_APP_COMPLETE_GUIDE.md` - Guide complet webapp
    - `02_MASTER_OCR_RULES.md` - Règles OCR critiques
    - `03_OCR_METHODS_TECHNICAL.md` - Méthodes techniques
    - `05_ENHANCED_OCR_SUMMARY.md` - Résumé améliorations

#### Discord Bot
14. **DOCUMENTATION_COMPLETE_DISCORD_BOT/** (dans l'ordre):
    - `01_DISCORD_BOT_COMPLETE_GUIDE.md` - Guide complet bot
    - `02_BOT_CONFIGURATION_SETUP.md` - Configuration
    - `03_SHARED_OCR_METHODS.md` - Méthodes partagées
    - `04_MASTER_OCR_RULES.md` - Règles maîtres

15. **discord-bot/TECHNICAL_DOCUMENTATION.md** - Documentation technique bot
16. **discord-bot/ETAT_DES_LIEUX.md** - État actuel du bot

### Phase 5: Procédures Opérationnelles (1-2 heures)
17. **QUICKSTART.md** / **QUICK_START_README.md** - Démarrage rapide
18. **DEVELOPMENT.md** - Workflow développement
19. **SELF_HOSTING.md** - Guide auto-hébergement
20. **DEPLOYMENT_OPTIONS.md** - Options de déploiement

### Phase 6: Infrastructure & DevOps (Optionnel - 2 heures)
21. **INFRASTRUCTURE_SUMMARY.md** - Résumé infrastructure
22. **SAAS_MIGRATION_PLAN.md** - Plan migration SaaS
23. **SECURE_API_KEY_SETUP.md** - Configuration sécurisée
24. **docker-compose.prod.yml** - Configuration production

### Phase 7: Historique & Contexte (Optionnel - 1 heure)
25. **CHANGELOG.md** - Historique des changements (voir v2.0.3)
26. **HANDOVER_GUIDE_COMPLETE.md** - Guide de passation précédent
27. **RAPPORT_FINAL_MTG.md** - Rapport final précédent

## 📖 DOCUMENTS CRITIQUES À GARDER OUVERTS

Pendant le développement, gardez ces 5 documents ouverts en permanence:

1. **QA_CRITICAL_ISSUES_REPORT.md** - Liste des problèmes à résoudre
2. **CRITICAL_FIXES_REQUIRED.md** - Solutions avec code
3. **CLAUDE.md** - Architecture et commandes
4. **server/src/services/enhancedOcrServiceGuaranteed.ts** - Service à utiliser
5. **validate-60-15-guarantee.js** - Script de validation

## 🔍 OÙ CHERCHER QUOI

| Besoin | Document(s) | Localisation |
|--------|------------|--------------|
| Comprendre l'architecture | ARCHITECTURE.md, CLAUDE.md | Racine |
| Problèmes actuels | QA_CRITICAL_ISSUES_REPORT.md | Racine |
| Solutions code | CRITICAL_FIXES_REQUIRED.md | Racine |
| Tests à faire passer | QA_TEST_COVERAGE_REPORT.md | Racine |
| Configuration Discord Bot | discord-bot/TECHNICAL_DOCUMENTATION.md | discord-bot/ |
| API endpoints | server/src/openapi.yaml | server/src/ |
| Types TypeScript | server/src/types/index.ts | server/src/types/ |
| Commandes dev | CLAUDE.md (section Commands) | Racine |
| Variables d'environnement | server/env.example | server/ |
| Docker config | docker-compose.prod.yml | Racine |

## ⏱️ TEMPS ESTIMÉ DE LECTURE

- **Lecture critique (Phases 1-3):** 7-10 heures
- **Lecture technique (Phases 4-5):** 3-5 heures  
- **Lecture complète (tout):** 15-20 heures

**Recommandation:** Commencez par les phases 1-3 (documents 1-12) qui sont OBLIGATOIRES avant de toucher au code.

## 📋 CONTEXTE DU PROJET

### Vue d'Ensemble
- **Nom:** MTG Screen-to-Deck (Version 2.0.3)
- **Objectif:** Convertir des screenshots de decks MTG en listes validées avec garantie absolue 60+15
- **Plateformes:** Application Web (React/Node.js) + Bot Discord (Python)
- **État Actuel:** ⚠️ **CRITIQUE** - Code implémenté mais NON validé, 0% tests fonctionnels

### Stack Technique
```yaml
Frontend:
  - React 18 + TypeScript
  - Vite + TailwindCSS
  - React Router

Backend:
  - Node.js + Express + TypeScript
  - OpenAI Vision API (OCR principal)
  - Scryfall API (validation cartes)
  - Redis (cache optionnel)
  - BullMQ (queue jobs)

Discord Bot:
  - Python 3.8+
  - discord.py
  - EasyOCR (OCR local)
  - Scryfall integration

Services Externes:
  - OpenAI Vision API (REQUIS)
  - Scryfall API (gratuit)
  - Redis (optionnel)
  - Cloudflare R2 (optionnel)
```

## 🔴 PROBLÈMES CRITIQUES À RÉSOUDRE

### 1. GARANTIE 60+15 NON FONCTIONNELLE
**Fichier:** `/server/src/services/enhancedOcrService.ts`
```typescript
// PROBLÈME: Peut retourner 0 à 75 cartes aléatoirement
// SOLUTION CRÉÉE MAIS NON TESTÉE: enhancedOcrServiceGuaranteed.ts
```

**Actions Requises:**
1. Remplacer `enhancedOcrService.ts` par `enhancedOcrServiceGuaranteed.ts`
2. Implémenter la logique de force completion:
   - Si < 60 mainboard → ajouter terres basiques
   - Si < 15 sideboard → générer sideboard générique
   - Si échec total → retourner deck d'urgence

### 2. TESTS 0% FONCTIONNELS
**Problème:** Configuration Jest/TypeScript cassée
```bash
# Backend: Jest ne trouve aucun test
cd server && npm test # ÉCHEC

# Discord: Import errors
cd discord-bot && python3 -m pytest # ÉCHEC

# Frontend: Pas de script test
cd client && npm test # ERREUR
```

**Actions Requises:**
1. Fixer la configuration Jest dans `/server/jest.config.js`
2. Corriger les imports TypeScript (OpenAI mocks)
3. Fixer les imports Python (`ocr_parser` → `ocr_parser_easyocr`)
4. Ajouter script test dans `/client/package.json`

### 3. INCOHÉRENCE DISCORD VS WEB
**Problème:** Résultats différents pour la même image
- Discord: `ocr_parser_easyocr.py` uniquement
- Web: `enhancedOcrService.ts` multi-pipelines

**Solution Créée:** `discord-bot/ocr_parser_unified.py`
```python
# À INTÉGRER dans bot.py
from ocr_parser_unified import UnifiedOCRParser
```

### 4. SCRIPTS PYTHON MANQUANTS
**Problème:** Chemins relatifs incorrects
```typescript
// Ligne 106 de enhancedOcrService.ts
const scriptPath = '../../../super_resolution_free.py'; // ÉCHEC
```

**Fix:**
```typescript
const scriptPath = path.resolve(__dirname, '../../../../super_resolution_free.py');
if (!fs.existsSync(scriptPath)) {
  // Fallback sur Sharp natif
}
```

## 🔥 FICHIERS DE CODE À EXAMINER EN PRIORITÉ

### Niveau 1: CRITIQUE - À modifier obligatoirement
```javascript
// 1. Service OCR principal (À REMPLACER)
server/src/services/enhancedOcrService.ts
↓ REMPLACER PAR ↓
server/src/services/enhancedOcrServiceGuaranteed.ts

// 2. Route API OCR (À METTRE À JOUR)
server/src/routes/ocr.enhanced.ts
// Ligne 5: import { EnhancedOCRService } from '../services/enhancedOcrServiceGuaranteed';

// 3. Bot Discord parser (À REMPLACER)
discord-bot/ocr_parser_easyocr.py
↓ INTÉGRER ↓
discord-bot/ocr_parser_unified.py
```

### Niveau 2: IMPORTANT - Tests à corriger
```javascript
// 4. Configuration Jest
server/jest.config.js
server/tests/setup.ts

// 5. Tests E2E critiques
server/tests/e2e/ocr-guarantee.test.ts
discord-bot/tests/test_ocr_guarantee.py

// 6. Script de validation
validate-60-15-guarantee.js
```

### Niveau 3: À COMPRENDRE - Ne pas modifier
```javascript
// 7. Types TypeScript
server/src/types/index.ts

// 8. Service Scryfall
server/src/services/scryfallService.ts
discord-bot/scryfall_service.py

// 9. Service Export
server/src/services/exportService.ts
discord-bot/export_deck.py
```

## 📁 STRUCTURE DES FICHIERS CRITIQUES

```
/screen-to-deck/
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── enhancedOcrService.ts          # ❌ À remplacer
│   │   │   ├── enhancedOcrServiceGuaranteed.ts # ✅ Version corrigée
│   │   │   ├── scryfallService.ts             # OK
│   │   │   └── exportService.ts               # OK
│   │   ├── routes/
│   │   │   ├── ocr.enhanced.ts                # À mettre à jour
│   │   │   └── ocr.ts                         # Legacy
│   │   └── types/
│   │       └── index.ts                       # Types à jour
│   └── tests/
│       ├── e2e/
│       │   └── ocr-guarantee.test.ts          # Tests créés mais non fonctionnels
│       └── setup.ts                            # Configuration Jest
│
├── discord-bot/
│   ├── bot.py                                 # Bot principal
│   ├── ocr_parser_easyocr.py                 # Parser actuel
│   ├── ocr_parser_unified.py                 # ✅ À intégrer
│   ├── scryfall_service.py                   # Service Scryfall
│   └── tests/
│       └── test_ocr_guarantee.py             # Tests Python créés
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── SimpleImageUpload.tsx         # Upload fonctionnel
│   │   └── services/
│   │       └── api.ts                        # API client
│   └── package.json                          # Manque script test
│
└── RAPPORTS CRITIQUES/
    ├── QA_CRITICAL_ISSUES_REPORT.md          # 15 problèmes identifiés
    ├── QA_FINAL_REPORT_2025.md               # Rapport exhaustif
    ├── CRITICAL_FIXES_REQUIRED.md            # Guide de correction
    └── TEST_EXECUTION_REPORT.md              # Résultats tests
```

## 🛠️ COMMANDES ESSENTIELLES

```bash
# Installation complète
npm install                    # Root + workspaces
cd discord-bot && pip3 install -r requirements.txt

# Développement
npm run dev                    # Frontend + Backend
npm run dev:selfhost          # Expose sur LAN
cd discord-bot && python3 bot.py

# Tests (À FIXER EN PRIORITÉ)
npm test                       # Tous les tests
cd server && npm test         # Backend uniquement
cd discord-bot && python3 -m pytest

# Validation 60+15
node validate-60-15-guarantee.js

# Production
npm run build
docker-compose -f docker-compose.prod.yml up
```

## 📊 MÉTRIQUES ACTUELLES VS OBJECTIFS

| Métrique | Actuel | Objectif | Priorité |
|----------|---------|----------|----------|
| Garantie 60+15 | ❌ 0% | ✅ 100% | P0 CRITIQUE |
| Tests Passants | ❌ 0% | ✅ 95% | P0 CRITIQUE |
| Cohérence Bot/Web | ❌ Différent | ✅ Identique | P0 CRITIQUE |
| Couverture Code | ❌ 0% | ✅ 80% | P1 MAJEUR |
| Temps OCR | ~5s | <3s | P2 MINEUR |
| Documentation | 70% | 100% | P2 MINEUR |

## 🔥 PLAN D'ACTION IMMÉDIAT (SEMAINE 1)

### Jour 1-2: Fix Configuration Tests
```bash
# 1. Corriger Jest/TypeScript
cd server
npm install --save-dev @types/jest ts-jest
# Éditer jest.config.js avec preset: 'ts-jest'

# 2. Fixer imports Python
cd discord-bot/tests
# Remplacer 'from ocr_parser' par 'from ocr_parser_easyocr'

# 3. Créer mocks OpenAI
# server/tests/__mocks__/openai.ts
```

### Jour 3-4: Implémenter Garantie 60+15
```typescript
// 1. Activer enhancedOcrServiceGuaranteed.ts
// 2. Tester sur 100 images réelles
// 3. Valider totaux stricts
```

### Jour 5: Unifier Discord/Web
```python
# 1. Intégrer ocr_parser_unified.py dans bot.py
# 2. Tester cohérence des résultats
# 3. Déployer en staging
```

### Jour 6-7: Validation Complète
```bash
# 1. Exécuter tous les tests
./run-critical-tests.sh

# 2. Tester sur images réelles
# - Arena screenshots
# - MTGO exports  
# - Photos papier

# 3. Monitoring production
# - Logs structurés
# - Métriques Prometheus
# - Alertes critiques
```

## ⚠️ PIÈGES À ÉVITER

1. **NE PAS déployer sans tests à 100%**
2. **NE PAS ignorer la garantie 60+15** - C'est LA feature critique
3. **NE PAS utiliser enhancedOcrService.ts** - Utiliser la version Guaranteed
4. **NE PAS oublier les variables d'environnement:**
   ```env
   OPENAI_API_KEY=sk-... # OBLIGATOIRE
   DISCORD_TOKEN=...      # Pour le bot
   API_BASE_URL=http://localhost:3001/api
   ```

5. **NE PAS négliger les edge cases:**
   - Images floues/basse résolution
   - Cartes avec accents/caractères spéciaux
   - Double-faced cards (DFC)
   - Split cards
   - Lands basics manquantes

## 📈 DÉFINITION DE "DONE"

Le projet est prêt pour production quand:

- [ ] ✅ **100% des tests passent** (minimum 30 tests)
- [ ] ✅ **Garantie 60+15 validée** sur 100+ images
- [ ] ✅ **Discord = Web** (même résultat pour même image)
- [ ] ✅ **Performance < 3s** par image (P50)
- [ ] ✅ **0 erreurs critiques** en 24h de staging
- [ ] ✅ **Documentation complète** (API, déploiement, troubleshooting)
- [ ] ✅ **Monitoring actif** (logs, métriques, alertes)
- [ ] ✅ **Rollback testé** (procédure documentée)

## 🚀 COMPÉTENCES REQUISES

### Essentielles
- **TypeScript/Node.js** (3+ ans) - Backend critique
- **React** (2+ ans) - Frontend
- **Python** (2+ ans) - Discord bot
- **Tests** (Jest, pytest) - CRITIQUE
- **Docker** - Déploiement

### Souhaitables
- **OCR/Computer Vision** - Optimisation
- **Discord.py** - Bot améliorations
- **Redis/BullMQ** - Queue management
- **Monitoring** (Prometheus/Grafana)

## 📞 CONTACTS & RESSOURCES

### Documentation
- **README.md** - Vue d'ensemble
- **CLAUDE.md** - Instructions pour Claude AI
- **ARCHITECTURE.md** - Architecture détaillée
- **QA_CRITICAL_ISSUES_REPORT.md** - Problèmes à résoudre
- **QA_FINAL_REPORT_2025.md** - État complet du projet

### APIs Externes
- **OpenAI:** https://platform.openai.com/docs
- **Scryfall:** https://scryfall.com/docs/api
- **Discord.py:** https://discordpy.readthedocs.io

### Outils de Test
- **Images de test:** `/data/` (à créer)
- **Validation script:** `validate-60-15-guarantee.js`
- **Test runner:** `run-critical-tests.sh`

## 💡 CONSEILS DE L'ÉQUIPE PRÉCÉDENTE

1. **Commencez par les tests** - Sans tests fonctionnels, impossible de valider les corrections
2. **Focus sur la garantie 60+15** - C'est le cœur du produit
3. **Testez sur de vraies images MTG** - Les tests unitaires ne suffisent pas
4. **Utilisez le service Guaranteed** - Ne perdez pas de temps avec l'ancien
5. **Monitoring dès le début** - Les erreurs silencieuses sont fatales
6. **Redis n'est pas obligatoire** - Le système fonctionne sans
7. **Gardez les logs détaillés** - Essentiels pour debug OCR

## 🎯 SUCCESS METRICS

Après 1 semaine, vous devriez avoir:
- Tests fonctionnels à 100%
- Garantie 60+15 prouvée sur 100 images
- Discord et Web synchronisés
- Staging déployé et stable

Après 2 semaines:
- Production déployée
- 99% uptime
- < 1% erreur rate
- Documentation complète

## ⚡ QUICK WIN IMMÉDIAT

```bash
# Pour voir le système fonctionner rapidement:
cd server
npm run dev

# Dans un autre terminal:
curl -X POST http://localhost:3001/api/ocr/enhanced \
  -F "image=@image.webp" \
  -H "Content-Type: multipart/form-data"

# Devrait retourner un JSON avec les cartes détectées
```

## ✅ CHECKLIST DE PRISE EN MAIN

### Jour 1: Lecture & Compréhension
- [ ] Lire README.md et CLAUDE.md
- [ ] Lire QA_CRITICAL_ISSUES_REPORT.md (CRITIQUE)
- [ ] Identifier les 4 problèmes majeurs
- [ ] Comprendre la garantie 60+15
- [ ] Installer l'environnement de dev local

### Jour 2: Analyse Technique
- [ ] Étudier enhancedOcrServiceGuaranteed.ts
- [ ] Comprendre les différences avec enhancedOcrService.ts
- [ ] Analyser ocr_parser_unified.py
- [ ] Revoir CRITICAL_FIXES_REQUIRED.md
- [ ] Tester manuellement l'API OCR

### Jour 3: Tests & Validation
- [ ] Corriger la configuration Jest
- [ ] Faire passer au moins 1 test
- [ ] Tester sur 10 images réelles
- [ ] Valider les totaux 60+15
- [ ] Documenter les résultats

### Jour 4-5: Implémentation
- [ ] Remplacer enhancedOcrService par la version Guaranteed
- [ ] Intégrer ocr_parser_unified dans le bot Discord
- [ ] Implémenter le retry avec backoff
- [ ] Ajouter la logique de force completion

### Jour 6-7: Validation Finale
- [ ] Faire passer 100% des tests
- [ ] Tester sur 100+ images
- [ ] Déployer en staging
- [ ] 24h de test sans erreur
- [ ] Documentation mise à jour

## 📝 TEMPLATE DE RAPPORT QUOTIDIEN

```markdown
# Rapport Jour X - [Date]

## Accomplissements
- [ ] Tâche 1
- [ ] Tâche 2

## Problèmes Rencontrés
- Problème 1: [Description]
  Solution: [Action prise]

## Métriques
- Tests passants: X/30
- Images testées: X/100
- Garantie 60+15: OUI/NON

## Prochaines Étapes
- Action 1
- Action 2

## Blocages
- [Si applicable]
```

## 🔴 DERNIER AVERTISSEMENT

**LE SYSTÈME N'EST PAS PRÊT POUR LA PRODUCTION**

État actuel:
- ⚠️ Garantie 60+15 NON validée
- ⚠️ 0% des tests passent
- ⚠️ Incohérence entre interfaces
- ⚠️ Configuration cassée

**NE DÉPLOYEZ PAS avant d'avoir résolu TOUS les problèmes critiques listés dans QA_CRITICAL_ISSUES_REPORT.md**

---

**Bonne chance! Le code de base est solide, il ne manque que la validation et les tests pour en faire un produit de qualité production.**

*Document créé le 10/01/2025 par l'équipe QA*
*Basé sur l'audit complet avec 4 agents AI spécialisés*