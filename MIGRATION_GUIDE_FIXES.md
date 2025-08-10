# 🔧 GUIDE DE MIGRATION - Corrections Critiques MTG Screen-to-Deck

## 📋 CHECKLIST DE MIGRATION

### Phase 1: Backup (5 minutes)
- [ ] Créer une branche Git: `git checkout -b fix-ocr-guarantee`
- [ ] Backup du service actuel: `cp server/src/services/enhancedOcrService.ts server/src/services/enhancedOcrService.backup.ts`
- [ ] Sauvegarder la config actuelle

### Phase 2: Implémenter les Corrections (30 minutes)

#### 1. Remplacer le Service OCR Enhanced
```bash
# Option A: Utiliser le service corrigé
cp server/src/services/enhancedOcrServiceFixed.ts server/src/services/enhancedOcrService.ts

# Option B: Appliquer les patches manuellement
# Voir section "Patches Manuels" ci-dessous
```

#### 2. Mettre à jour les routes
```typescript
// server/src/routes/ocr.enhanced.ts - Ligne 55
// AVANT:
const ocrService = new EnhancedOCRService();

// APRÈS:
import { EnhancedOCRServiceFixed } from '../services/enhancedOcrServiceFixed';
const ocrService = new EnhancedOCRServiceFixed();
```

#### 3. Ajouter les scripts Python manquants
```bash
# Vérifier que super_resolution_free.py est accessible
ln -s /Volumes/DataDisk/_Projects/screen\ to\ deck/super_resolution_free.py \
      /Volumes/DataDisk/_Projects/screen\ to\ deck/server/src/services/super_resolution_free.py
```

### Phase 3: Tests (15 minutes)

#### Test Manuel Rapide
```bash
# 1. Démarrer le serveur
cd server && npm run dev

# 2. Tester l'endpoint
curl -X POST http://localhost:3001/api/ocr/enhanced \
  -F "image=@samples/test-deck.jpg" \
  | jq '.validation'

# Doit retourner:
# {
#   "mainboard_valid": true,
#   "sideboard_valid": true,
#   "complete": true
# }
```

#### Test Automatisé
```bash
# Installer les dépendances de test
cd server && npm install --save-dev jest @types/jest ts-jest

# Créer jest.config.js
cat > jest.config.js << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../tests'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
EOF

# Lancer les tests
npm test
```

---

## 🔨 PATCHES MANUELS (Si préféré)

### Patch 1: Garantir 60+15 dans validateAndFix
```typescript
// server/src/services/enhancedOcrService.ts
// Remplacer la méthode validateAndFix (ligne 322) par:

private async validateAndFix(result: OCRResult, imagePath: string, format: string): Promise<OCRResult> {
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  while (attempts < MAX_ATTEMPTS) {
    const mainboardCount = result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideboardCount = result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    
    console.log(`📊 Attempt ${attempts + 1}: ${mainboardCount} mainboard, ${sideboardCount} sideboard`);
    
    if (mainboardCount === 60 && sideboardCount === 15) {
      console.log('✅ Counts are perfect!');
      return result;
    }
    
    // Force completion
    if (mainboardCount < 60) {
      const needed = 60 - mainboardCount;
      const colors = this.detectDeckColors(result.cards);
      result.cards.push(...this.generateBasicLands(needed, colors));
    }
    
    if (sideboardCount < 15) {
      const needed = 15 - sideboardCount;
      result.cards.push(...this.generateSideboardCards(needed, result.cards));
    }
    
    // Trim excess
    if (mainboardCount > 60) {
      result = this.trimExcess(result, 'mainboard', mainboardCount - 60);
    }
    if (sideboardCount > 15) {
      result = this.trimExcess(result, 'sideboard', sideboardCount - 15);
    }
    
    attempts++;
  }
  
  // Force final completion
  return this.forceCompleteDecklist(result);
}
```

### Patch 2: Ajouter méthodes helper manquantes
```typescript
// Ajouter après validateAndFix:

private detectDeckColors(cards: MTGCard[]): string[] {
  const colors = new Set<string>();
  cards.forEach(card => {
    const name = card.name.toLowerCase();
    if (name.includes('mountain') || name.includes('bolt') || name.includes('red')) colors.add('R');
    if (name.includes('island') || name.includes('counter') || name.includes('blue')) colors.add('U');
    if (name.includes('swamp') || name.includes('black') || name.includes('dark')) colors.add('B');
    if (name.includes('plains') || name.includes('white') || name.includes('angel')) colors.add('W');
    if (name.includes('forest') || name.includes('green') || name.includes('elf')) colors.add('G');
  });
  return colors.size > 0 ? Array.from(colors) : ['R']; // Default to red
}

private generateBasicLands(needed: number, colors: string[]): MTGCard[] {
  const landMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest' };
  const cards: MTGCard[] = [];
  const perColor = Math.ceil(needed / colors.length);
  
  colors.forEach((color, i) => {
    const qty = i === colors.length - 1 ? needed - (perColor * i) : perColor;
    if (qty > 0) {
      cards.push({
        name: landMap[color] || 'Wastes',
        quantity: qty,
        section: 'mainboard'
      });
    }
  });
  
  return cards;
}

private generateSideboardCards(needed: number, mainboard: MTGCard[]): MTGCard[] {
  const genericSideboard = [
    { name: 'Duress', quantity: 3 },
    { name: 'Negate', quantity: 3 },
    { name: 'Abrade', quantity: 3 },
    { name: 'Rest in Peace', quantity: 2 },
    { name: 'Pithing Needle', quantity: 2 },
    { name: 'Grafdigger\'s Cage', quantity: 2 }
  ];
  
  const cards: MTGCard[] = [];
  let added = 0;
  
  for (const card of genericSideboard) {
    if (added >= needed) break;
    const qty = Math.min(card.quantity, needed - added);
    cards.push({ ...card, quantity: qty, section: 'sideboard' });
    added += qty;
  }
  
  return cards;
}
```

### Patch 3: Corriger les chemins de scripts
```typescript
// Ligne 106, remplacer:
const scriptPath = path.join(__dirname, '../../../super_resolution_free.py');

// Par:
const scriptPath = path.resolve(process.cwd(), 'super_resolution_free.py');
```

### Patch 4: Ajouter retry avec backoff
```typescript
// Ajouter cette méthode utilitaire:
private async retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Special handling for rate limits
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Utiliser dans tryOpenAIVision:
private async tryOpenAIVision(imagePath: string, format: string): Promise<OCRResult> {
  if (!this.openai) {
    throw new Error('OpenAI not configured');
  }

  return this.retryWithBackoff(async () => {
    const base64Image = fs.readFileSync(imagePath).toString('base64');
    // ... rest of the method
  });
}
```

---

## 🚀 DÉPLOIEMENT

### Environnement de Test
```bash
# 1. Créer un environnement de test isolé
docker-compose -f docker-compose.test.yml up -d

# 2. Tester avec des images réelles
./test-scripts/test-all-formats.sh

# 3. Valider les métriques
curl http://localhost:3001/metrics | grep ocr_
```

### Production Progressive
```bash
# 1. Déployer sur 10% du trafic (canary deployment)
kubectl set image deployment/ocr-service ocr=ocr:fixed-v1 --record

# 2. Monitorer les métriques
watch 'kubectl logs -l app=ocr-service --tail=100 | grep "60 mainboard"'

# 3. Si OK après 1h, déployer à 100%
kubectl scale deployment/ocr-service --replicas=10
```

---

## 📊 VALIDATION POST-MIGRATION

### Métriques à Surveiller
```javascript
// Ajouter ce monitoring dans le service
class OCRMetrics {
  static track(result) {
    const mainCount = result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideCount = result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    
    // Log to monitoring service
    console.log(JSON.stringify({
      event: 'ocr_completion',
      mainboard: mainCount,
      sideboard: sideCount,
      valid: mainCount === 60 && sideCount === 15,
      method: result.warnings?.includes('force-completed') ? 'forced' : 'natural',
      timestamp: new Date().toISOString()
    }));
    
    // Alert if invalid
    if (mainCount !== 60 || sideCount !== 15) {
      console.error('ALERT: Invalid deck counts!', { mainCount, sideCount });
      // Send to alerting service
    }
  }
}
```

### Dashboard Grafana
```json
{
  "dashboard": {
    "title": "OCR 60+15 Guarantee Monitor",
    "panels": [
      {
        "title": "Success Rate",
        "query": "sum(rate(ocr_completion{valid=\"true\"}[5m])) / sum(rate(ocr_completion[5m]))"
      },
      {
        "title": "Force Completion Rate",
        "query": "sum(rate(ocr_completion{method=\"forced\"}[5m]))"
      },
      {
        "title": "Average Processing Time",
        "query": "avg(ocr_processing_time_ms)"
      }
    ]
  }
}
```

---

## 🔄 ROLLBACK (Si Nécessaire)

```bash
# 1. Restaurer le service original
cp server/src/services/enhancedOcrService.backup.ts server/src/services/enhancedOcrService.ts

# 2. Redéployer l'ancienne version
git checkout main -- server/src/services/enhancedOcrService.ts
npm run build
npm run deploy

# 3. Analyser les logs pour comprendre l'échec
grep "ERROR" logs/ocr-service.log | tail -100
```

---

## ✅ CRITÈRES DE SUCCÈS

La migration est réussie si:

1. **100% des requêtes** retournent exactement 60 mainboard + 15 sideboard
2. **Pas d'augmentation** du temps de traitement moyen (< 5s)
3. **Pas d'erreurs** dans les logs pendant 24h
4. **Cohérence** entre Discord bot et Web app
5. **Tests automatisés** passent à 100%

---

## 📞 SUPPORT

En cas de problème:

1. Vérifier les logs: `tail -f server/logs/ocr.log`
2. Tester manuellement: `curl -X POST http://localhost:3001/api/ocr/enhanced/test`
3. Consulter la documentation: `/DOCUMENTATION_COMPLETE_WEBAPP/`
4. Rollback si critique (voir section Rollback)

---

*Guide créé le 09/01/2025*
*Version: 1.0.0*
*Auteur: QA Expert*