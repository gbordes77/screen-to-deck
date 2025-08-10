# 🚨 PROMPT COMPLET POUR L'ÉQUIPE DE DÉVELOPPEMENT MTG SCREEN-TO-DECK

## 🎯 VOTRE MISSION

Vous êtes l'équipe de développement senior chargée de finaliser et déployer en production le projet **MTG Screen-to-Deck**, un système d'OCR avancé pour Magic: The Gathering qui DOIT GARANTIR l'extraction de exactement 60 cartes mainboard + 15 cartes sideboard depuis n'importe quelle image de deck.

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