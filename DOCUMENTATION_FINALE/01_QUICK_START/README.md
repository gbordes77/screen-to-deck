# 🚀 Quick Start Guide - MTG Screen-to-Deck

**Version**: 2.1.0  
**Temps nécessaire**: 5 minutes  
**Prérequis**: Node.js 20+, npm 9+

---

## 📚 Documentation Disponible

### Pour les Utilisateurs
👤 **[Guide Utilisateur Complet](./USER_GUIDE.md)**  
Guide détaillé pour utiliser MTG Screen-to-Deck : upload d'images, formats d'export, fonctionnalités avancées, résolution de problèmes.

### Pour les Administrateurs  
🔧 **[Guide Administrateur Complet](./ADMIN_GUIDE.md)**  
Documentation technique complète : installation, configuration, déploiement production, monitoring, maintenance, sécurité.

---

## ⚡ Démarrage Rapide (3 Options)

### Option 1: Développement Local (Recommandé)

```bash
# 1. Cloner le projet
git clone https://github.com/yourusername/screen-to-deck.git
cd screen-to-deck

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp server/env.example server/.env
# Éditer server/.env et ajouter votre OPENAI_API_KEY

# 4. Lancer l'application
npm run dev

# ✅ Accès: http://localhost:5173
```

### Option 2: Docker (Production-Ready)

```bash
# 1. Configuration
export OPENAI_API_KEY=sk-your-key-here

# 2. Lancer avec Docker Compose
docker-compose up -d

# ✅ Accès: http://localhost:3001
```

### Option 3: Self-Hosting (Réseau Local)

```bash
# 1. Configuration pour LAN
cp server/env.example server/.env
# Éditer: CORS_ORIGIN=http://<your-lan-ip>:5173

# 2. Lancer les services
npm run dev:server
# Dans un autre terminal:
npm run dev:client -- --host 0.0.0.0

# ✅ Accès: http://<your-lan-ip>:5173
```

---

## 🎯 Premier Scan OCR

### 1. Préparer votre Screenshot

- **MTGA**: Ouvrir votre deck, prendre un screenshot (F12)
- **MTGO**: Exporter > Screenshot deck complet
- **Résolution minimum**: 1200px largeur (auto-upscale sinon)

### 2. Upload et Scan

1. Ouvrir l'application web
2. Cliquer sur "Upload Image" 
3. Sélectionner votre screenshot
4. Attendre 3-5 secondes

### 3. Résultat Garanti

- ✅ **60 cartes mainboard** exactement
- ✅ **15 cartes sideboard** exactement  
- ✅ **Auto-copié** dans le presse-papier
- ✅ **Export** vers MTGA/Moxfield/Archidekt

---

## 🔧 Configuration Requise

### Variables d'Environnement Essentielles

```bash
# server/.env
OPENAI_API_KEY=sk-...        # OBLIGATOIRE
PORT=3001                     # Port API
CORS_ORIGIN=http://localhost:5173  # Frontend URL

# Optionnel mais recommandé
REDIS_URL=redis://localhost:6379   # Cache (95% hit rate)
SCRYFALL_CACHE_TTL=86400          # 24h cache
```

### Prérequis Système

- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **RAM**: 2GB minimum
- **Espace disque**: 500MB
- **OS**: Windows, macOS, Linux

---

## 🐳 Docker Production

### Build et Déploiement

```bash
# Build images
docker-compose build

# Lancer en production
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### Configuration Docker

```yaml
# docker-compose.yml
services:
  web-api:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
    ports:
      - "3001:3001"
```

---

## 🤖 Discord Bot (Optionnel)

### Installation Bot Discord

```bash
# 1. Aller dans le dossier bot
cd discord-bot

# 2. Installer dépendances Python
pip install -r requirements.txt

# 3. Configurer le bot
cp .env.example .env
# Ajouter DISCORD_TOKEN dans .env

# 4. Lancer le bot
python bot.py
```

### Commandes Discord

- `/scan` - Scanner une image
- `/clipboard` - Copier le dernier deck
- `/export [format]` - Exporter vers un format

---

## 📊 Vérification du Système

### Health Checks

```bash
# API Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:5173

# Redis Cache (si installé)
redis-cli ping

# Discord Bot
curl http://localhost:8080/health
```

### Tests de Validation

```bash
# Tester OCR avec images réelles
npm run validate:all

# Test spécifique MTGA
npm run validate:mtga

# Test spécifique MTGO
npm run validate:mtgo
```

---

## 🆘 Troubleshooting

### Problèmes Courants

#### "OPENAI_API_KEY not found"
```bash
# Vérifier la variable
echo $OPENAI_API_KEY

# Ou ajouter dans server/.env
OPENAI_API_KEY=sk-your-key-here
```

#### Port 3001 déjà utilisé
```bash
# Changer le port dans server/.env
PORT=3002

# Et mettre à jour le proxy frontend
```

#### OCR échoue sur image
- Vérifier résolution >= 1200px largeur
- Screenshot propre sans overlays
- Format PNG ou JPG uniquement

#### Discord bot ne répond pas
- Vérifier DISCORD_TOKEN valide
- Bot invité avec permissions suffisantes
- Logs: `tail -f discord-bot/bot.log`

---

## 🚀 Prochaines Étapes

1. **Tester** avec vos decks MTGA/MTGO
2. **Configurer le cache** Redis pour performance
3. **Installer le bot Discord** si besoin
4. **Consulter** [Architecture](../03_ARCHITECTURE/README.md) pour comprendre le système
5. **Lire** [OCR Rules](../02_OCR_RULES/MASTER_OCR_RULES.md) pour optimisation

---

## 📞 Support

- **Documentation complète**: [Index Principal](../README.md)
- **Issues GitHub**: [github.com/yourusername/screen-to-deck/issues](https://github.com/yourusername/screen-to-deck/issues)
- **Discord**: [Serveur Support](https://discord.gg/yourserver)

---

*Démarrage rapide pour être opérationnel en 5 minutes*