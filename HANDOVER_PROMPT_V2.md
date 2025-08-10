# 🚀 PROMPT DE PASSATION - MTG Screen-to-Deck Project

## 📋 CONTEXTE POUR LA NOUVELLE ÉQUIPE

Vous reprenez le projet **MTG Screen-to-Deck** - un système d'OCR pour convertir des screenshots de decks Magic: The Gathering en listes de cartes exploitables.

### État actuel : PRESQUE PRODUCTION READY
- ✅ Architecture complète en place
- ✅ Garantie 60+15 cartes implémentée
- ✅ Tests d'intégration créés
- ⚠️ Quelques ajustements nécessaires

---

## 📚 DOCUMENTS ESSENTIELS À LIRE (DANS CET ORDRE)

### 1. CLAUDE.md
**Chemin:** `/CLAUDE.md`
**Pourquoi:** Contient TOUTES les commandes, l'architecture et les guidelines du projet
**Points clés:**
- Architecture (React + Express + Python Discord bot)
- Commandes npm pour dev/build/test
- Variables d'environnement requises
- Structure des services

### 2. README.md
**Chemin:** `/README.md`  
**Pourquoi:** Vue d'ensemble du projet et statut actuel
**Points clés:**
- Features principales
- Production Ready v2.1.0 avec garantie 60+15
- Métriques de succès

### 3. TEST_PLAN_E2E.md
**Chemin:** `/TEST_PLAN_E2E.md`
**Pourquoi:** Méthodologie complète de test
**Points clés:**
- 9 images de test dans `/test-images/`
- Tests SANS MOCKS (vrais appels API)
- Critères de succès définis

### 4. PRODUCTION_ANALYSIS_PRIORITIES.md
**Chemin:** `/PRODUCTION_ANALYSIS_PRIORITIES.md`
**Pourquoi:** Analyse détaillée des problèmes et solutions
**Points clés:**
- 4 priorités classées
- Actions concrètes pour chaque problème
- Métriques de succès

---

## 🔑 SERVICES CRITIQUES À COMPRENDRE

### 1. enhancedOcrServiceGuaranteed.ts ✅ (LE BON SERVICE)
**Chemin:** `/server/src/services/enhancedOcrServiceGuaranteed.ts`
**Rôle:** Service principal qui GARANTIT 60+15 cartes
**Points importants:**
- Utilise OpenAI Vision API
- Padding avec Mountains si < 60 mainboard
- Trimming si > 60 cartes
- Emergency deck en cas d'échec total

### 2. Routes OCR
**Chemin:** `/server/src/routes/ocr.ts`
**Important:** La ligne 12 DOIT importer `enhancedOcrServiceGuaranteed` et NON `ocrService`
```typescript
import ocrService from '../services/enhancedOcrServiceGuaranteed';
```

### 3. Test Runner
**Chemin:** `/server/tests/integration/test-runner.ts`
**Rôle:** Tests E2E sans mocks
**Points clés:**
- Délai de 5s entre tests (évite rate limiting)
- Format correct pour validation Scryfall
- Teste 9 images représentatives

---

## ⚠️ PROBLÈMES CONNUS À RÉSOUDRE

### 1. Configuration OpenAI
**Problème:** Le service peut s'initialiser sans OpenAI API key
**Solution:** Vérifier que `OPENAI_API_KEY` est bien définie dans `.env`
**Test:** Si les logs montrent "Enhanced OCR Service initialized without OpenAI", c'est KO

### 2. Export Endpoints
**Problème:** Les tests montrent 0/5 exports réussis (404)
**Solution:** Vérifier les routes d'export dans `/server/src/routes/export.ts`
**Format attendu:** `/api/export` et non `/api/export/:format`

### 3. Rate Limiting Local
**Problème:** 100 requêtes max par 15 minutes
**Solution:** Pour les tests, désactiver temporairement ou augmenter la limite

---

## 🎯 OBJECTIFS PRIORITAIRES

### Phase 1 - Validation (1-2 jours)
1. **Lancer les tests existants**
   ```bash
   cd server
   npm run test:integration:runner
   ```
   
2. **Vérifier que l'OCR fonctionne vraiment**
   - Tester une image manuellement
   - Vérifier que les cartes détectées correspondent à l'image
   - PAS juste 60 Mountains !

3. **Corriger les exports**
   - Fixer les endpoints 404
   - Tester tous les formats (MTGA, Moxfield, etc.)

### Phase 2 - Production (2-3 jours)
1. **Déploiement Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up
   ```

2. **Monitoring**
   - Implémenter logs structurés
   - Ajouter métriques Prometheus
   - Dashboard de suivi

3. **Documentation API**
   - Compléter OpenAPI spec
   - Générer Postman collection

---

## 📊 MÉTRIQUES DE SUCCÈS

Le système sera considéré PRODUCTION READY quand :
- ✅ 85%+ précision OCR sur les 9 images de test
- ✅ 100% respect de la garantie 60+15
- ✅ <5s temps de traitement moyen
- ✅ Tous les formats d'export fonctionnels
- ✅ Pas d'erreurs 429 (rate limiting)

---

## 💡 CONSEILS IMPORTANTS

1. **NE PAS utiliser de mocks dans les tests** - Le propriétaire déteste ça
2. **Toujours tester avec de vraies images** du dossier `/test-images/`
3. **Vérifier les logs** - Ils indiquent clairement les problèmes
4. **Le service DOIT retourner de vraies cartes** détectées, pas un deck générique

---

## 📞 COMMANDES UTILES

```bash
# Installation complète
npm install

# Lancer le dev (frontend + backend)
npm run dev

# Tests d'intégration
cd server && npm run test:integration:runner

# Build production
npm run build

# Docker production
docker-compose -f docker-compose.prod.yml up
```

---

## 🔍 VÉRIFICATION FINALE

Avant de dire que c'est "production ready", assurez-vous que :

1. **Test manuel d'une image MTGA**
   - Upload de `/test-images/MTGA/MTGA_high_res_1920x1080.jpeg`
   - Vérifier que les cartes détectées incluent : Llanowar Elves, Paradise Druid, etc.
   - PAS juste 60 Mountains !

2. **Les exports fonctionnent**
   - Tester export MTGA Arena
   - Vérifier le format de sortie

3. **Le Discord bot fonctionne** (si configuré)
   - Token dans `.env`
   - Commandes !scan et !help

---

## 📝 HISTORIQUE IMPORTANT

- Le projet a déjà des tests qui ont marché
- La garantie 60+15 est implémentée mais doit être validée sur de vraies images
- L'architecture est solide, c'est surtout de la validation/ajustement

**Bonne chance ! Le projet est à 90% terminé, il reste le dernier 10% critique.**

---

*Document créé le 2025-08-10 pour faciliter la transition vers la nouvelle équipe de développement*