# 🛠️ Guide de Développement - MTG Screen-to-Deck

**Version**: 2.1.0  
**Stack**: React + Node.js + Python  
**Standards**: TypeScript, ESLint, Prettier

---

## 🚀 Setup Environnement Dev

### Prérequis
- Node.js >= 20.0.0
- npm >= 9.0.0
- Python >= 3.8
- Git
- Redis (optionnel mais recommandé)

### Installation Complète
```bash
# 1. Cloner le repository
git clone https://github.com/yourusername/screen-to-deck.git
cd screen-to-deck

# 2. Installer dépendances Node.js
npm install

# 3. Installer dépendances Python (Discord bot)
cd discord-bot
pip install -r requirements.txt
cd ..

# 4. Configuration environnement
cp server/env.example server/.env
cp discord-bot/.env.example discord-bot/.env
# Éditer les fichiers .env avec vos clés API

# 5. Lancer en mode dev
npm run dev
```

---

## 📁 Structure du Projet

```
screen-to-deck/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/        # Pages de l'application
│   │   ├── services/     # Services API
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Fonctions utilitaires
│   │   └── types/        # Types TypeScript
│   └── tests/            # Tests frontend
│
├── server/                # Backend Node.js
│   ├── src/
│   │   ├── routes/       # Routes Express
│   │   ├── services/     # Logique métier
│   │   ├── middleware/   # Middleware Express
│   │   ├── config/       # Configuration
│   │   └── utils/        # Utilitaires
│   └── tests/            # Tests backend
│
└── discord-bot/          # Bot Discord Python
    ├── cogs/            # Commandes Discord
    ├── services/        # Services OCR/Scryfall
    └── tests/           # Tests bot
```

---

## 💻 Commandes de Développement

### NPM Scripts Principaux
```bash
# Développement
npm run dev              # Lance frontend + backend
npm run dev:client       # Frontend seulement
npm run dev:server       # Backend seulement

# Build
npm run build           # Build complet
npm run build:client    # Build frontend
npm run build:server    # Build backend

# Tests
npm run test            # Tous les tests
npm run test:client     # Tests frontend
npm run test:server     # Tests backend
npm run test:e2e        # Tests end-to-end

# Qualité de code
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier format
npm run type-check      # TypeScript check

# Validation OCR
npm run validate:all    # Test tous les decks
npm run validate:mtga   # Test MTGA seulement
npm run validate:mtgo   # Test MTGO seulement
```

---

## 🧪 Tests

### Structure des Tests
```
tests/
├── unit/              # Tests unitaires
├── integration/       # Tests d'intégration
├── e2e/              # Tests end-to-end
└── fixtures/         # Images et données de test
```

### Écrire des Tests

#### Test Unitaire (Jest)
```typescript
// server/src/services/__tests__/ocrService.test.ts
describe('OCR Service', () => {
  it('should detect MTGA platform correctly', async () => {
    const result = await detectPlatform('mtga-deck.png');
    expect(result).toBe('MTGA');
  });
  
  it('should apply super-resolution for small images', async () => {
    const processed = await preprocessImage('small-image.png');
    const metadata = await getImageMetadata(processed);
    expect(metadata.width).toBeGreaterThanOrEqual(1200);
  });
});
```

#### Test E2E (Real Images)
```typescript
// tests/e2e/ocr-validation.test.ts
describe('OCR Validation with Real Decks', () => {
  const testDecks = [
    'fixtures/mtga-mono-red.png',
    'fixtures/mtgo-tron.png'
  ];
  
  testDecks.forEach(deck => {
    it(`should extract exactly 60+15 cards from ${deck}`, async () => {
      const result = await processImage(deck);
      expect(result.mainboard.length).toBe(60);
      expect(result.sideboard.length).toBe(15);
    });
  });
});
```

### Lancer les Tests
```bash
# Tests avec coverage
npm run test -- --coverage

# Tests en mode watch
npm run test -- --watch

# Test un fichier spécifique
npm run test -- ocrService.test.ts
```

---

## 📝 Standards de Code

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### ESLint Rules
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'prettier'
  ],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'error',
    'react/prop-types': 'off'
  }
};
```

### Prettier Config
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

---

## 🔄 Workflow Git

### Branches
- `main` - Production stable
- `develop` - Développement actif
- `feature/*` - Nouvelles fonctionnalités
- `fix/*` - Corrections de bugs
- `release/*` - Préparation releases

### Commit Convention
```bash
# Format: <type>(<scope>): <subject>

feat(ocr): add super-resolution for low-res images
fix(mtgo): correct land count detection bug
docs(readme): update installation instructions
test(api): add validation tests for Scryfall service
refactor(cache): optimize Redis connection pooling
```

### Pull Request Process
1. Créer branche depuis `develop`
2. Développer la fonctionnalité
3. Écrire/mettre à jour les tests
4. S'assurer que tous les tests passent
5. Créer PR vers `develop`
6. Code review obligatoire
7. Merge après approbation

---

## 🎨 Guidelines Frontend

### Composants React
```tsx
// components/CardList.tsx
interface CardListProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}

export const CardList: React.FC<CardListProps> = ({ 
  cards, 
  onCardClick 
}) => {
  return (
    <div className="card-list">
      {cards.map(card => (
        <CardItem 
          key={card.id}
          card={card}
          onClick={() => onCardClick?.(card)}
        />
      ))}
    </div>
  );
};
```

### Custom Hooks
```typescript
// hooks/useOcrStatus.ts
export function useOcrStatus(jobId: string) {
  const [status, setStatus] = useState<OcrStatus>('pending');
  const [result, setResult] = useState<DeckList | null>(null);
  
  useEffect(() => {
    const poll = async () => {
      const response = await checkOcrStatus(jobId);
      setStatus(response.status);
      if (response.status === 'completed') {
        setResult(response.result);
      }
    };
    
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [jobId]);
  
  return { status, result };
}
```

---

## 🔧 Guidelines Backend

### Service Pattern
```typescript
// services/scryfallService.ts
export class ScryfallService {
  private cache: CacheService;
  
  constructor(cache: CacheService) {
    this.cache = cache;
  }
  
  async validateCard(name: string): Promise<Card | null> {
    // Check cache first
    const cached = await this.cache.get(name);
    if (cached) return cached;
    
    // Fetch from API
    const card = await this.fetchFromScryfall(name);
    if (card) {
      await this.cache.set(name, card);
    }
    
    return card;
  }
}
```

### Error Handling
```typescript
// middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An error occurred'
  });
}
```

---

## 🐍 Guidelines Discord Bot

### Cog Structure
```python
# cogs/ocr_commands.py
class OCRCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.ocr_service = OCRService()
        
    @slash_command(name="scan", description="Scan a deck image")
    async def scan(
        self, 
        ctx: discord.ApplicationContext,
        image: discord.Attachment
    ):
        await ctx.defer()
        
        try:
            result = await self.ocr_service.process(image.url)
            embed = create_deck_embed(result)
            await ctx.followup.send(embed=embed)
        except Exception as e:
            await ctx.followup.send(f"Error: {str(e)}")
```

---

## 📊 Performance Guidelines

### Optimisation Checklist
- [ ] Images lazy loading
- [ ] Code splitting React
- [ ] Redis cache configured
- [ ] Database indexes
- [ ] Compression enabled
- [ ] CDN pour assets
- [ ] Rate limiting API

### Monitoring Dev
```bash
# Performance profiling
npm run profile

# Bundle size analysis
npm run analyze

# Memory leaks detection
npm run test:memory
```

---

## 🔐 Sécurité en Développement

### Best Practices
- Jamais de secrets dans le code
- Utiliser `.env` pour config
- Valider tous les inputs
- Sanitizer les données utilisateur
- HTTPS même en dev
- Logs sans données sensibles

### Security Checklist
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for secrets
git secrets --scan
```

---

## 📚 Ressources Développeurs

### Documentation
- [React Docs](https://react.dev)
- [Express Guide](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Discord.py Docs](https://discordpy.readthedocs.io)

### Outils Recommandés
- **IDE**: VS Code avec extensions TypeScript
- **API Testing**: Postman / Insomnia
- **DB Client**: TablePlus / DBeaver
- **Git GUI**: GitKraken / SourceTree

---

## 🤝 Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines complètes de contribution.

### Quick Start Contribution
1. Fork le projet
2. Créer une branche feature
3. Commiter vos changements
4. Pousser vers votre fork
5. Ouvrir une Pull Request

---

*Guide de développement pour contribuer efficacement au projet*