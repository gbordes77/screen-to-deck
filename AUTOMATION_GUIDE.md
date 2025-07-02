# 🚀 Guide d'Automatisation - Screen to Deck

Ce guide vous explique comment utiliser le système d'automatisation complet mis en place pour le projet Screen to Deck.

## 📋 Table des Matières

- [Installation Rapide](#installation-rapide)
- [Configuration Cursor](#configuration-cursor)
- [Scripts d'Automatisation](#scripts-dautomatisation)
- [GitHub Actions](#github-actions)
- [Git Hooks](#git-hooks)
- [Raccourcis de Commandes](#raccourcis-de-commandes)
- [Déploiement](#déploiement)
- [Monitoring](#monitoring)

## 🚀 Installation Rapide

### 1. Installation Complète (Recommandée)

```bash
# Installation complète avec toutes les dépendances
./scripts/setup-automation.sh --full
```

### 2. Installation Minimale

```bash
# Installation minimale (hooks + scripts seulement)
./scripts/setup-automation.sh --minimal
```

### 3. Installation Manuelle

Si vous préférez installer étape par étape :

```bash
# 1. Rendre les scripts exécutables
chmod +x scripts/*.sh

# 2. Installer les Git hooks
./scripts/setup-hooks.sh

# 3. Configurer les alias Git
git config --global alias.auto '!./scripts/auto-commit.sh'
git config --global alias.dev '!./scripts/dev.sh'
git config --global alias.deploy '!./scripts/deploy.sh'
```

## ⚙️ Configuration Cursor

### Extensions Installées Automatiquement

Le système installe automatiquement les extensions suivantes dans Cursor :

#### 🛠️ Outils d'Automatisation

- **GitHub Actions** - Gestion des workflows CI/CD
- **GitHub Pull Request** - Gestion des PR directement dans l'éditeur
- **GitHub Copilot** - Assistant IA pour le code
- **GitLens** - Historique Git avancé

#### 🎨 Développement Frontend

- **TypeScript** - Support TypeScript avancé
- **TailwindCSS** - IntelliSense pour Tailwind
- **Prettier** - Formatage automatique
- **ESLint** - Linting JavaScript/TypeScript

#### 🐍 Développement Python

- **Python** - Support Python complet
- **Black Formatter** - Formatage Python
- **Pylint** - Linting Python

#### 🐳 DevOps

- **Docker** - Support Docker/Docker Compose
- **YAML** - Support YAML pour les workflows

### Configuration Automatique

Toutes les configurations sont appliquées automatiquement :

- **Formatage automatique** à la sauvegarde
- **Linting** en temps réel
- **Auto-import** des modules
- **Chemin d'interpréteur Python** vers `discord-bot/venv`
- **Exclusion des dossiers** (`node_modules`, `venv`, `dist`)

## 📜 Scripts d'Automatisation

### 🔄 Auto-Commit (`scripts/auto-commit.sh`)

Script intelligent qui automatise le processus de commit avec vérifications.

#### Usage

```bash
# Commit automatique avec message par défaut
./scripts/auto-commit.sh

# Commit avec message personnalisé
./scripts/auto-commit.sh "feat: add new feature"

# Via l'alias Git
git auto "fix: bug correction"
```

#### Fonctionnalités

✅ **Vérifications préalables**

- État du repository Git
- Protection des branches principales (main/master)
- Détection des changements

✅ **Tests automatiques**

- Lint du code TypeScript/JavaScript
- Build du serveur
- Vérification syntaxe Python
- Tests unitaires (si configurés)

✅ **Formatage automatique**

- Prettier pour TS/JS
- Black pour Python
- Correction automatique des erreurs de lint

✅ **Commit sécurisé**

- Signature GPG (si configurée)
- Message de commit intelligent
- Protection contre les commits directs sur main

✅ **Push optionnel**

- Demande de confirmation
- Création de branches upstream
- Suggestion de Pull Request

### 🚀 Développement Rapide (`scripts/dev.sh`)

Lance tous les services de développement en parallèle.

#### Usage

```bash
# Lancer tous les services
./scripts/dev.sh

# Nettoyer et relancer
./scripts/dev.sh --clean

# Voir les logs en temps réel
./scripts/dev.sh --logs

# Arrêter tous les services
./scripts/dev.sh --stop
```

#### Services Lancés

🌐 **Client React** (port 5173)

- Vite dev server
- Hot reload activé
- Proxy vers l'API backend

🖥️ **Serveur Node.js** (port 3001)

- Express avec TypeScript
- Rechargement automatique
- Variables d'environnement de dev

🤖 **Bot Discord**

- Environnement Python virtuel
- Rechargement automatique
- Logs détaillés

#### Monitoring

- **Health checks** automatiques
- **Surveillance continue** des processus
- **Redémarrage automatique** en cas d'arrêt
- **Statistiques** en temps réel

### 📦 Déploiement (`scripts/deploy.sh`)

Système de déploiement automatisé pour staging et production.

#### Usage

```bash
# Déploiement staging
./scripts/deploy.sh staging

# Déploiement production
./scripts/deploy.sh production

# Forcer le déploiement (bypass les vérifications)
./scripts/deploy.sh production --force
```

#### Pipeline de Déploiement

1. **Vérifications prérequis**
   - Docker, Node.js, Git
   - Variables d'environnement
   - Permissions

2. **Vérifications Git**
   - Branche correcte (main pour prod, develop pour staging)
   - Pas de changements non commitées
   - Synchronisation avec origin

3. **Tests complets**
   - Build client et serveur
   - Lint de tout le code
   - Tests unitaires
   - Vérifications de sécurité

4. **Build Docker**
   - Construction des images
   - Tag avec hash de commit
   - Push vers registry (production)

5. **Déploiement**
   - **Staging** : Local avec Docker Compose
   - **Production** : SSH vers serveur distant

6. **Post-déploiement**
   - Nettoyage des images obsolètes
   - Tag Git pour releases
   - Notifications Discord

## 🔄 GitHub Actions

Le système configure automatiquement des workflows GitHub Actions.

### 🧪 CI/CD Principal (`.github/workflows/ci-cd.yml`)

#### Déclencheurs

- Push sur `main` et `develop`
- Pull requests vers `main`
- Déclenchement manuel avec choix d'environnement

#### Jobs Exécutés

1. **Tests parallèles**
   - Client React (lint, build, tests)
   - Serveur Node.js (lint, build, tests)
   - Bot Discord Python (lint, tests)

2. **Vérifications de sécurité**
   - Scan Trivy des vulnérabilités
   - Audit npm des dépendances
   - Upload vers GitHub Security

3. **Build et Docker**
   - Construction des images Docker
   - Push vers Docker Hub
   - Cache optimisé

4. **Déploiement automatique**
   - Staging sur `develop`
   - Production sur `main`
   - Environnements protégés

5. **Notifications**
   - Discord webhook
   - Statut de déploiement

### 🔄 Gestion Automatique (`.github/workflows/auto-pr.yml`)

#### Fonctionnalités

✅ **Création automatique de PR**

- Détection de nouvelles branches
- Template de PR automatique
- Assignment à l'auteur

✅ **Mise à jour des dépendances**

- Scan hebdomadaire des dépendances
- Mise à jour automatique
- PR automatique pour les updates

✅ **Contrôle qualité**

- SonarCloud pour l'analyse de code
- CodeClimate pour la couverture
- Métriques de qualité

✅ **Nettoyage automatique**

- Suppression des branches mergées
- Nettoyage des références Git

## 🪝 Git Hooks

### Pre-Commit Hook

Vérifications avant chaque commit :

🔍 **Vérifications générales**

- Conflits de merge non résolus
- TODO/FIXME critiques

🔍 **TypeScript/JavaScript**

- ESLint sur les fichiers modifiés
- Correction automatique si possible

🔍 **Python**

- Vérification syntaxe
- Formatage Black
- Application automatique du formatage

🔍 **Fichiers de configuration**

- Validation JSON (package.json)
- Syntaxe Docker Compose

🔒 **Sécurité**

- Détection de secrets/tokens
- URLs hardcodées

### Commit-Msg Hook

Validation des messages de commit :

✅ **Formats acceptés**

- Conventional Commits : `feat: add feature`
- Emoji Commits : `✨ Add feature`

✅ **Vérifications**

- Longueur minimale (10 caractères)
- Longueur maximale de ligne (72 caractères)
- Format cohérent

### Post-Commit Hook

Actions après commit :

📊 **Statistiques**

- Fichiers modifiés
- Lignes ajoutées/supprimées
- Suggestions d'actions

💡 **Suggestions**

- Push vers origin
- Création de PR

## ⚡ Raccourcis de Commandes

Le script `std` (Screen To Deck) simplifie l'utilisation :

```bash
# Développement
./std dev          # Lancer l'environnement de développement
./std start        # Alias pour dev
./std stop         # Arrêter tous les services
./std logs         # Voir les logs en temps réel
./std clean        # Nettoyer et réinstaller

# Git et déploiement
./std commit       # Commit automatique
./std c            # Alias pour commit
./std deploy       # Déployer
./std d            # Alias pour deploy

# Maintenance
./std hooks        # Réinstaller les Git hooks
./std help         # Aide
```

### Alias Git Configurés

```bash
git auto           # Commit automatique
git dev            # Lancer développement
git deploy         # Déployer
git st             # Status
git co             # Checkout
git br             # Branch
git lg             # Log graphique
git unstage        # Unstage files
```

## 🚀 Déploiement

### Environnements

#### 🧪 Staging

- **URL** : `http://localhost:3000`
- **API** : `http://localhost:3001`
- **Base de données** : PostgreSQL locale
- **Monitoring** : Grafana sur port 3010

#### 🌟 Production

- **Docker Registry** : Docker Hub
- **Déploiement** : SSH vers serveur
- **SSL** : Certificats automatiques
- **Monitoring** : Prometheus + Grafana

### Configuration Docker

#### Staging (`docker-compose.staging.yml`)

Services complets avec monitoring :

- **Application** (Client, Server, Bot)
- **Base de données** (PostgreSQL, Redis)
- **Monitoring** (Prometheus, Grafana, Node Exporter)
- **Utilities** (Traefik, Adminer, Mailhog)

#### Variables d'Environnement

Créez un fichier `.env` avec :

```env
# API Keys
OPENAI_API_KEY=your-openai-key
DISCORD_TOKEN=your-discord-token
DISCORD_TOKEN_STAGING=your-staging-token

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
RATE_LIMIT_MAX=100

# Docker (pour production)
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Deployment
PRODUCTION_SERVER=your-server.com
PRODUCTION_USER=deploy
DISCORD_WEBHOOK=your-webhook-url
```

## 📊 Monitoring

### Logs

#### Emplacements

- **Client** : `scripts/logs/client.log`
- **Serveur** : `scripts/logs/server.log`
- **Bot Discord** : `scripts/logs/discord-bot.log`
- **Déploiement** : `scripts/logs/deploy.log`
- **Auto-commit** : `scripts/logs/auto-commit.log`

#### Visualisation

```bash
# Logs en temps réel de tous les services
./std logs

# Logs spécifiques
tail -f scripts/logs/client.log
tail -f scripts/logs/server.log
```

### Métriques (Staging)

#### Grafana (Port 3010)

- **Dashboards** préconfigurés
- **Métriques applicatives**
- **Métriques système**

#### Prometheus (Port 9090)

- **Collecte de métriques**
- **Alerting** (configurable)
- **Rétention 7 jours**

## 🐛 Résolution de Problèmes

### Problèmes Courants

#### Scripts non exécutables

```bash
chmod +x scripts/*.sh
./scripts/setup-automation.sh
```

#### Services qui ne démarrent pas

```bash
./std clean  # Nettoyer et réinstaller
./std dev    # Relancer
```

#### Erreurs de Git hooks

```bash
./scripts/setup-hooks.sh  # Réinstaller les hooks
git config core.hooksPath .git/hooks
```

#### Variables d'environnement manquantes

```bash
cp .env.example .env
# Éditer .env avec vos vraies valeurs
```

### Logs de Debug

```bash
# Activer les logs debug
export DEBUG=*
./std dev

# Voir tous les logs
./std logs
```

## 🎯 Bonnes Pratiques

### Workflow de Développement

1. **Démarrer** : `./std dev`
2. **Développer** avec hot reload
3. **Commiter** : `./std commit "feat: nouvelle fonctionnalité"`
4. **Tester** en staging : `./std deploy staging`
5. **Merge** vers main
6. **Déployer** en production : `./std deploy production`

### Organisation des Commits

```bash
# Fonctionnalités
git commit -m "feat: add user authentication"
git commit -m "✨ Add user authentication"

# Corrections
git commit -m "fix: resolve login issue"
git commit -m "🐛 Resolve login issue"

# Documentation
git commit -m "docs: update API documentation"
git commit -m "📚 Update API documentation"
```

### Branches

- **`main`** : Production stable
- **`develop`** : Intégration continue
- **`feature/*`** : Nouvelles fonctionnalités
- **`bugfix/*`** : Corrections de bugs
- **`hotfix/*`** : Corrections urgentes

## 🎉 Conclusion

Le système d'automatisation est maintenant configuré ! Vous disposez de :

✅ **Développement rapide** avec hot reload  
✅ **Commits sécurisés** avec vérifications  
✅ **Déploiement automatisé** multi-environnements  
✅ **CI/CD complet** avec GitHub Actions  
✅ **Monitoring** en temps réel  
✅ **Raccourcis pratiques** pour toutes les tâches  

**Commencez par** : `./std dev` 🚀

---

*Pour toute question ou problème, consultez les logs ou ouvrez une issue GitHub.*
