# 🧪 PLAN DE TEST END-TO-END - MTG Screen-to-Deck
*Version: 1.0*  
*Date: 2025-08-10*  
*Type: Tests d'Intégration RÉELS (SANS MOCKS)*

---

## 📋 OBJECTIFS DU TEST

### Objectifs Principaux
1. ✅ **Valider la garantie 60+15 cartes** (60 mainboard + 15 sideboard)
2. ✅ **Mesurer la précision OCR réelle** sur différents formats
3. ✅ **Comparer Web (OpenAI) vs Discord (EasyOCR)** 
4. ✅ **Vérifier tous les formats d'export**
5. ✅ **Identifier les cas d'échec** et leurs causes

### Métriques Clés à Capturer
- 📊 Taux de succès par type d'image
- ⏱️ Temps de traitement par résolution
- 🎯 Précision d'extraction des cartes
- 💾 Utilisation mémoire
- 🔄 Cohérence entre services

---

## 🖼️ IMAGES DE TEST SÉLECTIONNÉES

### Dataset de Test (9 images représentatives)

| Type | Fichier | Résolution | Caractéristiques | Chemin Test |
|------|---------|------------|------------------|-------------|
| **MTGA** | MTGA_high_res_1920x1080.jpeg | 1920x1080 | Haute résolution, interface claire | `/test-images/MTGA/` |
| **MTGA** | MTGA_special_1334x886.jpeg | 1334x886 | Cas spécial, résolution moyenne | `/test-images/MTGA/` |
| **MTGO** | MTGO_standard_1763x791.jpeg | 1763x791 | Format standard MTGO | `/test-images/MTGO/` |
| **MTGO** | MTGO_low_height_1254x432.jpeg | 1254x432 | Hauteur réduite, texte petit | `/test-images/MTGO/` |
| **MTGGoldfish** | MTGGoldfish_high_res_1383x1518.jpg | 1383x1518 | Haute résolution, format web | `/test-images/MTGGoldfish/` |
| **MTGGoldfish** | MTGGoldfish_standard_1239x1362.jpg | 1239x1362 | Format standard du site | `/test-images/MTGGoldfish/` |
| **Paper** | Paper_clear_2336x1098.jpeg | 2336x1098 | Photo claire de cartes physiques | `/test-images/Paper/` |
| **Paper** | Paper_hidden_2048x1542.jpeg | 2048x1542 | Cartes partiellement cachées | `/test-images/Paper/` |
| **Website** | Website_large_2300x2210.jpeg | 2300x2210 | Grande image, source web | `/test-images/Website/` |

---

## 🔬 MÉTHODOLOGIE DE TEST

### 1. Test Flow Complet (End-to-End)
```
[Image] → [Upload] → [OCR Processing] → [Card Validation] → [Export Formats] → [Result]
```

### 2. Points de Validation

#### A. Upload & Processing
- ✅ Image acceptée par le système
- ✅ Job ID généré correctement
- ✅ Status polling fonctionnel
- ⏱️ Temps de traitement < 10s

#### B. OCR & Extraction
- ✅ Texte extrait de l'image
- ✅ Cartes identifiées et parsées
- ✅ Quantités correctes détectées
- ✅ Séparation mainboard/sideboard

#### C. Validation Scryfall
- ✅ Noms de cartes validés/corrigés
- ✅ Fuzzy matching fonctionnel
- ✅ Cache Redis utilisé si disponible
- ✅ Rate limiting respecté

#### D. Garantie 60+15
- ✅ EXACTEMENT 60 cartes mainboard
- ✅ EXACTEMENT 15 cartes sideboard
- ✅ Padding appliqué si nécessaire
- ✅ Trimming si trop de cartes

#### E. Export Formats
- ✅ MTGA Arena format
- ✅ Moxfield format
- ✅ Archidekt format
- ✅ TappedOut format
- ✅ JSON format

### 3. Comparaison Services

| Critère | Web (OpenAI Vision) | Discord Bot (EasyOCR) |
|---------|---------------------|----------------------|
| Précision attendue | 90-95% | 85-90% |
| Temps moyen | 3-5s | 5-8s |
| Coût par requête | ~$0.01 | Gratuit |
| Formats supportés | JPEG, PNG, WebP | JPEG, PNG |

---

## 📊 STRUCTURE DES RÉSULTATS

### Format de Capture des Résultats
```json
{
  "testId": "uuid",
  "timestamp": "2025-08-10T10:00:00Z",
  "image": {
    "name": "MTGA_high_res_1920x1080.jpeg",
    "type": "MTGA",
    "resolution": "1920x1080",
    "size": "324KB"
  },
  "processing": {
    "service": "web|discord",
    "duration": 3500,
    "ocrEngine": "openai|easyocr"
  },
  "results": {
    "cardsExtracted": 75,
    "mainboard": 60,
    "sideboard": 15,
    "paddingApplied": false,
    "trimmingApplied": false,
    "accuracy": 0.92
  },
  "validation": {
    "scryfallCalls": 75,
    "fuzzyMatches": 5,
    "failures": 0
  },
  "exports": {
    "mtga": "success",
    "moxfield": "success",
    "archidekt": "success",
    "tappedout": "success",
    "json": "success"
  },
  "errors": []
}
```

---

## 🎯 CRITÈRES DE SUCCÈS

### Minimum Acceptable (Production Ready)
- ✅ **85%** des tests passent
- ✅ **80%** précision OCR moyenne
- ✅ **100%** garantie 60+15 respectée
- ✅ **<10s** temps de traitement moyen
- ✅ **100%** formats d'export fonctionnels

### Objectif Idéal
- 🎯 **95%** des tests passent
- 🎯 **90%** précision OCR moyenne
- 🎯 **<5s** temps de traitement moyen
- 🎯 **0** erreurs critiques

---

## 🚀 PLAN D'EXÉCUTION

### Phase 1: Préparation (✅ COMPLÉTÉ)
1. ✅ Sélection des images représentatives
2. ✅ Copie dans dossier `/test-images/`
3. ✅ Documentation du plan de test

### Phase 2: Infrastructure de Test
1. ⏳ Créer scripts de test automatisés
2. ⏳ Configurer capture des métriques
3. ⏳ Préparer templates de rapport

### Phase 3: Exécution
1. ⏳ Tests service Web (OpenAI)
2. ⏳ Tests Discord Bot (EasyOCR)
3. ⏳ Comparaison des résultats

### Phase 4: Analyse
1. ⏳ Compilation des métriques
2. ⏳ Identification des problèmes
3. ⏳ Recommandations d'amélioration

---

## 📁 STRUCTURE DES FICHIERS

```
/screen-to-deck/
├── test-images/                  # Images de test organisées
│   ├── MTGA/                    # 2 images MTGA
│   ├── MTGO/                    # 2 images MTGO
│   ├── MTGGoldfish/             # 2 images MTGGoldfish
│   ├── Paper/                   # 2 images photos réelles
│   └── Website/                 # 1 image website
├── test-results/                 # Résultats des tests
│   ├── web-service/             # Résultats OpenAI
│   ├── discord-bot/             # Résultats EasyOCR
│   └── comparison/              # Analyse comparative
├── TEST_PLAN_E2E.md             # Ce document
├── TEST_RESULTS.md              # Rapport final (à créer)
└── test-metrics.json            # Métriques brutes JSON
```

---

## ⚠️ RISQUES & MITIGATIONS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| API OpenAI down | Tests web échouent | Retry avec timeout |
| Rate limit Scryfall | Validation échoue | Cache Redis + delays |
| Images corrompues | OCR échoue | Validation préalable |
| Mémoire insuffisante | Crash service | Monitoring ressources |
| Réseau instable | Timeouts | Retry logic |

---

## 📝 CHECKLIST PRÉ-TEST

### Environment
- [ ] OpenAI API key configurée
- [ ] Discord bot token configuré
- [ ] Redis running (optionnel)
- [ ] Services démarrés (web + bot)
- [ ] Dossier test-images prêt

### Monitoring
- [ ] Logs activés niveau DEBUG
- [ ] Métriques configurées
- [ ] Capture résultats activée

### Validation
- [ ] Images accessibles
- [ ] Permissions fichiers OK
- [ ] Espace disque suffisant

---

## 🔄 COMMANDES D'EXÉCUTION

```bash
# Préparation
cd /Volumes/DataDisk/_Projects/screen-to-deck

# Test Web Service
npm run test:integration:real

# Test Discord Bot
cd discord-bot
python tests/test_e2e_real.py

# Rapport complet
./generate-test-report.sh
```

---

## 📈 TEMPLATE RAPPORT FINAL

Le rapport final (TEST_RESULTS.md) contiendra:
1. Résumé exécutif
2. Métriques globales
3. Résultats par type d'image
4. Comparaison Web vs Discord
5. Problèmes identifiés
6. Recommandations
7. Plan d'action

---

*Document préparé pour exécution des tests d'intégration réels sans mocks*