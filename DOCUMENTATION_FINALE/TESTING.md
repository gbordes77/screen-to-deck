# 🧪 Testing Strategy & Guide - MTG Screen-to-Deck

**Version**: 2.1.0  
**Taux de succès**: 100% sur 14 decks de test  
**Coverage**: Backend 80%+, Frontend 70%+

---

## 📊 Vue d'ensemble de la Stratégie de Tests

### Philosophie de Test
- **Test avec des données RÉELLES** : Pas de mocks pour les tests critiques OCR
- **Validation E2E prioritaire** : Le succès OCR est mesuré sur des screenshots réels
- **Tests parallèles** : Exécution simultanée pour performance
- **Retry automatique** : 3 tentatives pour gérer les timeouts réseau

### Métriques de Succès
| Métrique | Cible | Actuel | Statut |
|----------|-------|--------|--------|
| **OCR MTGA** | 100% | 100% | ✅ |
| **OCR MTGO** | 100% | 100% | ✅ |
| **Temps moyen** | <5s | 3.2s | ✅ |
| **Tests E2E** | 14/14 | 14/14 | ✅ |
| **Coverage Backend** | >80% | 82% | ✅ |
| **Coverage Frontend** | >70% | 71% | ✅ |

---

## 🧪 Types de Tests

### 1. Tests Unitaires

#### Backend (Node.js/TypeScript)
```bash
# Exécution
npm run test:unit

# Avec coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Fichiers clés:**
- `server/src/services/__tests__/scryfallOptimized.test.ts`
- `server/src/services/mtgoLandCorrector.test.ts`
- Tests des 6 règles OCR individuellement

#### Discord Bot (Python)
```bash
cd discord-bot
pytest tests/ -v

# Tests spécifiques
pytest tests/test_parser.py      # OCR parser
pytest tests/test_scryfall.py    # Validation Scryfall
pytest tests/test_clipboard.py   # Service clipboard
pytest tests/test_export.py      # Formats export
```

### 2. Tests d'Intégration

```bash
# API endpoints
npm run test:integration

# Discord bot avec API
python tests/test_integration.py
```

**Scénarios testés:**
- Upload image → OCR → Validation → Export
- Cache Redis hit/miss
- Scryfall rate limiting
- Gestion erreurs OpenAI API

### 3. Tests End-to-End (E2E)

#### Test Suite Principale (100% succès)
```bash
# Lancer tous les tests E2E (14 decks)
npm run test:e2e

# Test spécifique MTGA
npm run test:e2e -- --filter="MTGA"

# Test spécifique MTGO
npm run test:e2e -- --filter="MTGO"
```

**Dataset de Test (14 decks validés):**

**MTGA (6 decks):**
1. `MTGA deck list 4_1920x1080.jpeg` - HD, 60+15 ✅
2. `MTGA deck list special_1334x886.jpeg` - Medium, 60+15 ✅
3. `MTGA deck list 2_1545x671.jpeg` - Low res, upscaled, 60+15 ✅
4. `MTGA deck list 3_1835x829.jpeg` - Good quality, 60+15 ✅
5. `MTGA deck list _1593x831.jpeg` - Medium, 60+15 ✅
6. `MTGA deck list_1535x728.jpeg` - Low res, problematic, 60+15 ✅

**MTGO (8 decks):**
1. `MTGO deck list usual_1763x791.jpeg` - Standard, lands fix, 60+15 ✅
2. `MTGO deck list usual 4_1254x432.jpeg` - Very low res, upscaled, 60+15 ✅
3. `MTGO deck list usual 2_1763x791.jpeg` - Good quality, 60+15 ✅
4. `MTGO deck list usual 3_1763x791.jpeg` - Good quality, 60+15 ✅
5. `MTGO deck list usual 5_1763x791.jpeg` - Good quality, 60+15 ✅
6. `MTGO deck list usual 6_1763x791.jpeg` - Good quality, 60+15 ✅
7. `MTGO deck list usual 7_1763x791.jpeg` - Good quality, 60+15 ✅
8. `MTGO deck list usual 8_1763x791.jpeg` - Good quality, 60+15 ✅

### 4. Tests de Performance

```bash
# Benchmark OCR
npm run benchmark

# Load testing
npm run test:load -- --users=100 --duration=60s

# Memory profiling
npm run test:memory
```

**Métriques surveillées:**
- Temps de traitement par image
- Utilisation mémoire (target: <400MB)
- Cache hit rate (target: >90%)
- Temps de réponse API (P95 < 5s)

### 5. Tests de Sécurité

```bash
# Audit des dépendances
npm audit
pip-audit

# Tests de sécurité API
npm run test:security

# Validation des inputs
npm run test:validation
```

**Vérifications:**
- Injection dans les noms de cartes
- Upload de fichiers malveillants
- Rate limiting
- API key validation
- CORS configuration

---

## 🔧 Configuration des Tests

### Variables d'Environnement de Test
```env
# .env.test
NODE_ENV=test
OPENAI_API_KEY=test-key-xxx
SCRYFALL_API_URL=http://localhost:3002/mock-scryfall
REDIS_URL=redis://localhost:6379/1
TEST_TIMEOUT=60000
PARALLEL_JOBS=4
```

### Configuration Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/*.test.ts',
    '**/*.test.js'
  ]
};
```

### Configuration Pytest
```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

---

## 📝 Écriture de Tests

### Structure d'un Test OCR
```typescript
describe('OCR Service - MTGA Deck', () => {
  it('should extract exactly 60 mainboard + 15 sideboard cards', async () => {
    // Arrange
    const imagePath = 'validated_decklists/MTGA deck list 3_1835x829.jpeg';
    const expectedMainboard = 60;
    const expectedSideboard = 15;
    
    // Act
    const result = await ocrService.processImage(imagePath);
    
    // Assert
    expect(result.mainboard.length).toBe(expectedMainboard);
    expect(result.sideboard.length).toBe(expectedSideboard);
    expect(result.accuracy).toBeGreaterThanOrEqual(0.95);
    
    // Validate each card exists in Scryfall
    for (const card of result.mainboard) {
      const isValid = await scryfallService.validateCard(card.name);
      expect(isValid).toBe(true);
    }
  });
});
```

### Test de la Règle MTGO Land Fix
```python
def test_mtgo_land_correction():
    """Test automatic MTGO land count bug correction"""
    # Given
    cards = [
        {"name": "Lightning Bolt", "quantity": 4},
        {"name": "Counterspell", "quantity": 4},
        # ... 45 cards total (missing 15 lands)
    ]
    text = "60 cards"  # MTGO shows total but doesn't list lands
    
    # When
    corrected = apply_mtgo_land_correction(cards, text)
    
    # Then
    assert len(corrected) == 60
    assert sum(c["quantity"] for c in corrected) == 60
    # Verify lands were added
    land_cards = [c for c in corrected if "Land" in c["type"]]
    assert len(land_cards) > 0
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      
      - name: Install dependencies
        run: |
          npm ci
          pip install -r discord-bot/requirements.txt
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📊 Rapport de Tests

### Génération de Rapports
```bash
# Rapport HTML détaillé
npm run test:report

# Rapport de coverage
npm run coverage:report

# Rapport de performance
npm run perf:report
```

### Format du Rapport
```
MTG Screen-to-Deck Test Report
==============================
Date: 2025-08-11
Version: 2.1.0

MTGA Tests: 6/6 PASSED ✅
MTGO Tests: 8/8 PASSED ✅
Total Success Rate: 100%

Performance Metrics:
- Average Processing Time: 3.2s
- P95 Processing Time: 4.1s
- Cache Hit Rate: 95%
- Memory Usage: 320MB

Coverage:
- Backend: 82%
- Frontend: 71%
- Discord Bot: 78%
```

---

## 🐛 Debug et Troubleshooting

### Mode Debug
```bash
# Activer les logs détaillés
DEBUG=mtg:* npm run test

# Tests avec breakpoints
npm run test:debug

# Verbose Python tests
pytest -vv --log-cli-level=DEBUG
```

### Tests Flaky
Si un test échoue de manière intermittente :
1. Vérifier les timeouts réseau
2. Augmenter les retry attempts
3. Isoler les dépendances externes
4. Utiliser des fixtures pour les données

---

## ✅ Checklist Avant Release

- [ ] Tous les tests E2E passent (14/14)
- [ ] Coverage backend > 80%
- [ ] Coverage frontend > 70%
- [ ] Pas de vulnérabilités (`npm audit`)
- [ ] Tests de charge validés
- [ ] Documentation à jour
- [ ] Changelog mis à jour
- [ ] Version bumped (SemVer)

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OCR Test Dataset](/validated_decklists/)

---

*Document de test v2.1.0 - Dernière mise à jour : 11 Août 2025*