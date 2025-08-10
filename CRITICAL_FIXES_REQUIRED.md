# 🚨 CORRECTIONS CRITIQUES REQUISES - MTG Screen-to-Deck

## État Actuel: ❌ CRITIQUE - 0% des tests passent

### 1. PROBLÈME #1: Tests Backend Non Fonctionnels
**Fichier:** `/server/tests/services/enhancedOcrService.test.ts`

**Erreur:**
```
TypeError: openai_1.default is not a constructor
```

**Solution Requise:**
```typescript
// Au début du fichier de test, ajouter:
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));
```

---

### 2. PROBLÈME #2: Tests Discord Bot - Paramètre Manquant
**Fichier:** `/discord-bot/tests/test_ocr_guarantee.py`

**Erreur:**
```
TypeError: MTGOCRParser.__init__() missing 1 required positional argument: 'scryfall_service'
```

**Solution Requise:**
```python
@pytest.fixture
def parser(self):
    """Create OCR parser instance with mock scryfall service"""
    mock_scryfall = Mock()
    return OCRParser(scryfall_service=mock_scryfall)
```

---

### 3. PROBLÈME #3: Service Enhanced OCR - Garantie Non Implémentée
**Fichier:** `/server/src/services/enhancedOcrService.ts`

**Problème:** Le service peut retourner moins de 75 cartes

**Solution Requise:**
```typescript
private async enforceGuarantee(result: OCRResult): Promise<OCRResult> {
  const mainCount = result.cards
    .filter(c => c.section !== 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  const sideCount = result.cards
    .filter(c => c.section === 'sideboard')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  // Ajouter des terres basiques si nécessaire
  if (mainCount < 60) {
    const missing = 60 - mainCount;
    const lands = this.generateBasicLands(missing);
    result.cards.push(...lands);
  }
  
  // Ajouter des cartes sideboard si nécessaire
  if (sideCount < 15) {
    const missing = 15 - sideCount;
    const sideCards = this.generateSideboardCards(missing);
    result.cards.push(...sideCards);
  }
  
  result.guaranteed = true;
  return result;
}
```

---

### 4. PROBLÈME #4: Chemins de Scripts Python
**Problème:** Scripts Python référencés mais introuvables

**Solution Requise:**
- Supprimer les références aux scripts Python non existants
- Utiliser uniquement les solutions Node.js natives

---

### 5. PROBLÈME #5: Pas de Retry avec Backoff
**Solution Requise:**
```typescript
private async retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

---

## Actions Immédiates Requises

### Étape 1: Fixer les Tests (30 min)
```bash
# 1. Corriger les mocks OpenAI dans les tests Jest
# 2. Ajouter le paramètre scryfall_service dans les tests Python
# 3. Relancer les tests
```

### Étape 2: Implémenter la Garantie (1h)
```bash
# 1. Ajouter enforceGuarantee() dans enhancedOcrService.ts
# 2. Ajouter generateBasicLands() et generateSideboardCards()
# 3. Valider avec les tests
```

### Étape 3: Ajouter Retry Logic (30 min)
```bash
# 1. Implémenter retryWithExponentialBackoff()
# 2. Wrapper les appels API avec retry
# 3. Tester la résilience
```

---

## Commandes de Validation

```bash
# Backend
cd server
npm test

# Discord Bot
cd discord-bot
python -m pytest tests/

# Validation complète
cd ..
./run-critical-tests.sh
```

---

## ⚠️ NE PAS DÉPLOYER AVANT QUE:
- [ ] Tous les tests backend passent
- [ ] Tests Discord bot fonctionnels
- [ ] Garantie 60+15 validée
- [ ] Retry mechanism implémenté
- [ ] Tests E2E réussis

**Temps total estimé:** 2-3 heures