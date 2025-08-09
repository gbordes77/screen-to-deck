# Configuration des Agents pour MTG Screen-to-Deck

Ce document contient les configurations complètes des agents spécialisés pour l'analyse du projet MTG Screen-to-Deck, avec leurs déclencheurs spécifiques.

## 🎯 COMMENT UTILISER CE DOCUMENT

### Pour installer un agent dans Claude :
1. **Ouvrez Claude** (claude.ai/code)
2. **Tapez** : `/agents add` 
3. **Copiez le bloc YAML** de l'agent voulu (entre les ```yaml)
4. **Collez** dans Claude
5. L'agent est maintenant disponible !

### Les 3 lignes importantes :
- **name** : Le nom de l'agent (pour l'appeler)
- **description** : Ce que fait l'agent
- **tools** : Les outils qu'il peut utiliser (Read, Write, etc.)
- **model** : Le modèle AI utilisé (sonnet = plus puissant, haiku = plus rapide)

## 🔐 1. Security Auditor (`security/security-auditor.md`)

### Configuration à copier:
```yaml
---
name: security-auditor
description: A senior application security auditor and ethical hacker, specializing in identifying, evaluating, and mitigating security vulnerabilities throughout the entire software development lifecycle. Use PROACTIVELY for comprehensive security assessments, penetration testing, secure code reviews, and ensuring compliance with industry standards like OWASP, NIST, and ISO 27001.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__sequential-thinking__sequentialthinking
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Audit des API keys** : Vérification de l'OPENAI_API_KEY et gestion sécurisée
- **Token Discord** : Analyse de la sécurité du DISCORD_TOKEN
- **Endpoints API** : Test de sécurité sur `/api/ocr`, `/api/cards/validate`
- **Upload d'images** : Vérification des vulnérabilités d'upload (injection, taille)
- **CORS et authentification** : Configuration sécurisée des headers
- **Données sensibles** : Protection des données utilisateur et caching Redis
- **Variables d'environnement** : Audit de validateEnv.ts et .env management

## 💾 2. Database Optimizer (`data-ai/database-optimizer.md`)

### Configuration à copier:
```yaml
---
name: database-optimizer
description: An expert AI assistant for holistically analyzing and optimizing database performance. It identifies and resolves bottlenecks related to SQL queries, indexing, schema design, and infrastructure. Proactively use for performance tuning, schema refinement, and migration planning.
tools: Read, Write, Edit, Grep, Glob, Bash, LS, WebFetch, WebSearch, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__sequential-thinking__sequentialthinking
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Redis caching** : Optimisation des stratégies de cache pour Scryfall API
- **Supabase queries** : Analyse des requêtes vers la base de données
- **Job queue** : Optimisation de la file d'attente OCR (status/:jobId)
- **Taux de requêtes Scryfall** : Gestion du rate limiting et cache
- **Stockage des decks** : Structure optimale pour stocker les deck lists
- **Recherche fuzzy** : Performance de la correspondance de noms de cartes

## 📚 3. API Documenter (`specialization/api-documenter.md`)

### Configuration à copier:
```yaml
---
name: api-documenter
description: A specialist agent that creates comprehensive, developer-first API documentation. It generates OpenAPI 3.0 specs, code examples, SDK usage guides, and full Postman collections.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
model: haiku
---
```

### Déclencheurs spécifiques MTG:
- **Documentation OpenAPI** : Génération pour tous les endpoints `/api/*`
- **Endpoints OCR** : POST `/api/ocr`, GET `/api/ocr/status/:jobId`
- **Endpoints Scryfall** : GET `/api/cards/search`, POST `/api/cards/validate`
- **Export formats** : POST `/api/export` (MTGA, Moxfield, Archidekt, etc.)
- **Webhooks Discord** : Documentation des interactions bot
- **Collection Postman** : Tests pour upload d'images et validation
- **Exemples multi-langages** : JavaScript, Python pour le bot Discord

## 🧪 4. Test Automator (`quality/test-automator.md`)

### Configuration à copier:
```yaml
---
name: test-automator
description: A Test Automation Specialist responsible for designing, implementing, and maintaining a comprehensive automated testing strategy. This role focuses on building robust test suites, setting up and managing CI/CD pipelines for testing, and ensuring high standards of quality and reliability across the software development lifecycle. Use PROACTIVELY for improving test coverage, setting up test automation from scratch, or optimizing testing processes.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
model: haiku
---
```

### Déclencheurs spécifiques MTG:
- **Tests Jest backend** : Services OCR, Scryfall, export
- **Tests Python bot** : pytest pour OCR parser, Scryfall service
- **Tests E2E upload** : Simulation upload image → résultat
- **Tests API mocking** : Mock OpenAI Vision et Scryfall API
- **Tests de charge** : Performance avec images multiples
- **CI/CD pipeline** : GitHub Actions pour tests automatiques
- **Coverage analysis** : Objectif >80% de couverture

## ✅ 5. QA Expert (`quality/qa-expert.md`)

### Configuration à copier:
```yaml
---
name: qa-expert
description: A sophisticated AI Quality Assurance (QA) Expert for designing, implementing, and managing comprehensive QA processes to ensure software products meet the highest standards of quality, reliability, and user satisfaction. Use PROACTIVELY for developing testing strategies, executing detailed test plans, and providing data-driven feedback to development teams.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__sequential-thinking__sequentialthinking
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Stratégie QA globale** : Plan de test complet pour web + Discord
- **Tests manuels OCR** : Validation précision reconnaissance de cartes
- **Tests cross-browser** : Compatibilité upload sur différents navigateurs
- **Tests Discord bot** : Commandes, permissions, rate limiting
- **Validation des exports** : Vérification formats MTGA, Moxfield, etc.
- **Tests de régression** : Suite après chaque mise à jour
- **Métriques qualité** : Taux de succès OCR, temps de traitement

## 🐍 6. Python Pro (`development/backend/python-pro.md`)

### Configuration à copier:
```yaml
---
name: python-pro
description: An expert Python developer specializing in writing clean, performant, and idiomatic code. Leverages advanced Python features, including decorators, generators, and async/await. Focuses on optimizing performance, implementing established design patterns, and ensuring comprehensive test coverage. Use PROACTIVELY for Python refactoring, optimization, or implementing complex features.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, TodoWrite, Task, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__sequential-thinking__sequentialthinking
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Bot Discord** : Analyse bot.py et architecture discord.py
- **EasyOCR integration** : Optimisation ocr_parser_easyocr.py
- **Service Scryfall Python** : scryfall_service.py et cache
- **Export formats** : export_service.py pour différents formats
- **Async operations** : Optimisation des appels API asynchrones
- **Tests pytest** : Tests dans discord-bot/tests/
- **Type hints** : Ajout de typing pour meilleure maintenabilité

## ⚛️ 7. React Pro (`development/frontend/react-pro.md`)

### Configuration à copier:
```yaml
---
name: react-pro
description: Expert React developer specializing in building high-performance, scalable React applications with modern patterns and best practices. Use PROACTIVELY for React architecture, component optimization, and complex state management.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Composants React 18** : Analyse et optimisation des composants UI
- **State management** : Gestion du state pour upload et résultats
- **React Router** : Navigation entre Home, Converter, Results, About
- **Hooks personnalisés** : Pour gérer l'upload et le polling
- **Optimisation bundle** : Réduction taille avec Vite
- **Error boundaries** : Gestion des erreurs d'upload
- **Lazy loading** : Pour les composants lourds

## 📘 8. TypeScript Pro (`development/frontend/typescript-pro.md`)

### Configuration à copier:
```yaml
---
name: typescript-pro
description: TypeScript expert specializing in type-safe development, advanced type system features, and migration strategies. Use PROACTIVELY for TypeScript configuration, type definitions, and code quality improvements.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Types API** : Définition des types pour OCR, Scryfall responses
- **Interface Card** : Types pour les cartes Magic
- **Types Discord** : Si intégration web/Discord
- **Validation runtime** : Avec zod ou io-ts
- **Config tsconfig** : Optimisation pour client et server
- **Strict mode** : Activation et résolution des erreurs
- **Types génériques** : Pour les services réutilisables

## ⚡ 9. Performance Engineer (`infrastructure/performance-engineer.md`)

### Configuration à copier:
```yaml
---
name: performance-engineer
description: Performance optimization specialist focusing on application speed, scalability, and resource efficiency. Use PROACTIVELY for performance analysis, bottleneck identification, and optimization strategies.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Performance OCR** : Temps de traitement OpenAI Vision vs EasyOCR
- **Optimisation images** : Compression avant upload
- **Caching stratégies** : Redis pour Scryfall, résultats OCR
- **Concurrence** : Gestion jobs OCR multiples
- **Latence API** : Monitoring et optimisation des appels
- **Bundle optimization** : Code splitting, tree shaking
- **Database queries** : Optimisation Supabase si utilisé

## ☁️ 10. Cloud Architect (`infrastructure/cloud-architect.md`)

### Configuration à copier:
```yaml
---
name: cloud-architect
description: Cloud infrastructure expert specializing in scalable, secure, and cost-effective cloud solutions. Use PROACTIVELY for cloud migration, architecture design, and infrastructure optimization.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Cloudflare R2** : Configuration pour stockage d'images
- **Docker deployment** : docker-compose.prod.yml optimisation
- **Scaling strategy** : Auto-scaling pour charge OCR
- **CDN configuration** : Pour assets statiques
- **Monitoring** : Logs, métriques, alertes
- **Backup strategy** : Pour Redis cache et données
- **Cost optimization** : Analyse coûts API OpenAI

## 🔍 11. Debugger (`quality/debugger.md`)

### Configuration à copier:
```yaml
---
name: debugger
description: Expert debugging specialist for identifying and resolving complex software issues. Use PROACTIVELY for troubleshooting, root cause analysis, and bug fixing.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Erreurs OCR** : Debug des échecs de reconnaissance
- **Discord bot crashes** : Analyse des logs et stack traces
- **API timeouts** : Investigation des timeouts sur endpoints
- **Upload failures** : Debug des échecs d'upload d'images
- **Memory leaks** : Si présence dans le bot Python ou Node.js
- **Race conditions** : Dans le système de jobs asynchrones
- **CORS issues** : Résolution des problèmes cross-origin

## 📊 12. GraphQL Architect (`data-ai/graphql-architect.md`) - Optionnel

### Configuration à copier:
```yaml
---
name: graphql-architect
description: GraphQL API design expert specializing in schema design, resolvers, and performance optimization. Use if considering GraphQL migration.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task
model: sonnet
---
```

### Déclencheurs spécifiques MTG:
- **Migration REST → GraphQL** : Si envisagé pour l'API
- **Schema design** : Types Card, Deck, OCRResult
- **Resolvers optimization** : Batching pour Scryfall
- **Subscriptions** : Pour updates temps réel OCR status
- **Federation** : Si multiple services

---

## 🚀 Ordre d'utilisation recommandé pour l'analyse

1. **context-manager** : Cartographie initiale complète
2. **security-auditor** : Audit de sécurité critique (API keys, tokens)
3. **python-pro** : Analyse du bot Discord
4. **react-pro** + **typescript-pro** : Analyse frontend
5. **database-optimizer** : Optimisation cache et données
6. **performance-engineer** : Identification des goulots
7. **qa-expert** + **test-automator** : Stratégie de tests
8. **api-documenter** : Documentation complète
9. **cloud-architect** : Architecture déploiement
10. **debugger** : Si bugs identifiés

---

## 📝 Notes d'installation

Pour installer un agent:
1. Copiez la configuration YAML ci-dessus
2. Créez ou modifiez le fichier de l'agent dans le bon dossier
3. Collez la configuration
4. L'agent sera disponible immédiatement

## ⚠️ Points d'attention

- **Ordre important** : Toujours commencer par context-manager
- **Communication inter-agents** : Les agents doivent s'interroger mutuellement
- **Rapports obligatoires** : Chaque agent doit reporter au context-manager
- **Éviter la redondance** : Ne pas refaire ce qu'un autre agent a déjà fait