# 📚 Documentation Complète - Discord Bot MTG Screen-to-Deck

## 🎯 Principe Fondamental

**LE BOT DISCORD UTILISE EXACTEMENT LES MÊMES MÉTHODES QUE LA WEB APP**

Cette documentation garantit une cohérence parfaite entre le bot Discord et la web app pour l'extraction OCR de decks Magic: The Gathering.

## 📂 Structure de la Documentation

### 1. [📖 Guide Complet du Bot Discord](01_DISCORD_BOT_COMPLETE_GUIDE.md)
Documentation exhaustive couvrant :
- Vue d'ensemble et architecture
- Installation pas à pas
- Déploiement (VPS, Docker, Cloud)
- Commandes Discord complètes
- Intégration avec la web app
- Monitoring et maintenance

**2500+ lignes** de documentation détaillée avec exemples de code

### 2. [⚙️ Configuration et Setup](02_BOT_CONFIGURATION_SETUP.md)
Guide de configuration complet :
- Fichier .env avec toutes les variables expliquées
- Scripts d'installation automatique
- Configuration Discord Developer Portal
- Setup des slash commands
- Déploiement production (Heroku, Docker, PM2)

**600+ lignes** de configuration et scripts

### 3. [🔄 Méthodes OCR Partagées](03_SHARED_OCR_METHODS.md)
Documentation technique sur le partage des méthodes :
- Appel direct à l'API web app (recommandé)
- Scripts Python partagés (fallback)
- Tests de cohérence automatiques
- Monitoring de divergence
- Configuration synchronisée

**635 lignes** garantissant l'identité des résultats

### 4. [📋 Master OCR Rules](04_MASTER_OCR_RULES.md)
Règles fondamentales d'extraction OCR :
- Architecture du système complet
- Méthodes progressives d'OCR
- Règles à ne jamais oublier
- Stratégie "Never Give Up"
- Scripts essentiels
- Métriques de succès

**429 lignes** de règles et méthodologies

## 🚀 Quick Start

### Installation Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/your-repo/screen-to-deck.git
cd screen-to-deck/discord-bot

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer
cp .env.example .env
# Éditer .env avec vos tokens

# 4. Lancer le bot
python bot.py
```

### Configuration Minimale (.env)

```env
# OBLIGATOIRE
DISCORD_TOKEN=YOUR_BOT_TOKEN
API_BASE_URL=http://localhost:3001/api
OPENAI_API_KEY=sk-proj-xxxxx

# IMPORTANT: Mêmes valeurs que la web app!
MIN_RESOLUTION=1200
UPSCALE_FACTOR=4
MAINBOARD_TARGET=60
SIDEBOARD_TARGET=15
```

## 🔗 Architecture de Partage

```
┌──────────────────────────────────────────┐
│        MÉTHODES OCR PARTAGÉES            │
│  (robust_ocr_solution.py, etc.)          │
└──────────────────────────────────────────┘
                    ↑
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐     ┌───────▼────────┐
│   Web App      │     │  Discord Bot    │
│   (Node.js)    │     │   (Python)      │
│                │     │                 │
│ /api/ocr/      │◄────│ Appelle l'API   │
│   enhanced     │     │   Web App       │
└────────────────┘     └─────────────────┘
```

## ✅ Points Critiques de Cohérence

### 1. Toujours Utiliser l'API Web App

```python
# ✅ CORRECT - Utilise l'API
async def process_image(self, image_data):
    return await self.api_service.process_image_enhanced(image_data)

# ❌ INCORRECT - Refait le travail
async def process_image(self, image_data):
    return self.local_ocr.process(image_data)
```

### 2. Configuration Identique

Les valeurs suivantes DOIVENT être identiques entre web app et bot :

| Paramètre | Valeur | Fichier Web App | Fichier Bot |
|-----------|--------|-----------------|-------------|
| MIN_RESOLUTION | 1200 | enhancedOcrService.ts | .env |
| UPSCALE_FACTOR | 4 | enhancedOcrService.ts | .env |
| MAINBOARD_TARGET | 60 | enhancedOcrService.ts | .env |
| SIDEBOARD_TARGET | 15 | enhancedOcrService.ts | .env |

### 3. Validation des Résultats

```python
# Test automatique de cohérence
python discord-bot/tests/test_same_results.py
```

## 📊 Commandes Principales

### Commandes Utilisateur

| Commande | Description | Usage |
|----------|-------------|-------|
| `!mtg scan` | Scanner une image standard | Attacher une image |
| `!mtg enhance` | Mode "Never Give Up" | Garantit 60+15 cartes |
| `!mtg export` | Exporter le deck | Formats: mtga, moxfield |
| `/scan` | Slash command équivalent | Image en paramètre |

### Commandes Admin

| Commande | Description | Permissions |
|----------|-------------|-------------|
| `!mtg status` | État du bot et API | Admin only |
| `!mtg reload` | Recharger config | Admin only |
| `!mtg stats` | Statistiques | Admin only |

## 🔧 Scripts Utiles

### Vérification de Configuration

```bash
# Vérifier que tout est correctement configuré
python check_config.py
```

### Test de Connexion

```bash
# Tester Discord et API
python test_connection.py
```

### Synchronisation des Méthodes

```bash
# Copier les scripts partagés depuis la web app
./sync_methods.sh
```

## 📈 Monitoring

### Métriques Suivies

- **Uptime** : Temps de fonctionnement
- **Images traitées** : Total et taux de succès
- **Temps moyen** : Performance OCR
- **Cohérence** : Divergences avec web app

### Health Checks

```python
# Vérifications automatiques
- Discord connecté
- API accessible
- EasyOCR disponible
- Espace disque OK
```

## 🐛 Troubleshooting

### Problèmes Fréquents

1. **Token Discord invalide**
   - Vérifier dans .env
   - Régénérer sur Discord Developer Portal

2. **API non accessible**
   - Vérifier que la web app tourne
   - `curl http://localhost:3001/api/health`

3. **Résultats différents de la web app**
   - Vérifier les configurations (MIN_RESOLUTION, etc.)
   - Lancer les tests de cohérence

4. **Rate limiting Discord**
   - Implémenter cooldown sur les commandes
   - Utiliser @commands.cooldown()

## 🚢 Déploiement

### Options Disponibles

1. **VPS/Serveur dédié** - Guide complet avec PM2
2. **Docker** - Dockerfile et docker-compose fournis
3. **Cloud (Heroku/Railway)** - Configuration incluse
4. **Bot Hosting** - Services spécialisés Discord

Voir [01_DISCORD_BOT_COMPLETE_GUIDE.md](01_DISCORD_BOT_COMPLETE_GUIDE.md#déploiement) pour les détails.

## 📝 Checklist de Déploiement

- [ ] Token Discord configuré
- [ ] Web App API accessible
- [ ] OpenAI API Key configurée
- [ ] Configurations identiques (MIN_RESOLUTION, etc.)
- [ ] Scripts partagés synchronisés
- [ ] Tests de cohérence passés
- [ ] Bot invité sur le serveur
- [ ] Permissions correctes accordées
- [ ] Monitoring actif
- [ ] Logs configurés

## 🔄 Maintenance

### Mises à jour régulières

```bash
# Mettre à jour les dépendances
pip install --upgrade -r requirements.txt

# Synchroniser avec la web app
./sync_methods.sh

# Vérifier la cohérence
python tests/test_consistency.py
```

## 📞 Support

- **Issues GitHub** : [Ouvrir une issue](https://github.com/your-repo/issues)
- **Discord** : Rejoindre le serveur de support
- **Documentation Web App** : Voir [DOCUMENTATION_COMPLETE_WEBAPP](../DOCUMENTATION_COMPLETE_WEBAPP/)

## 🎯 Objectif Principal

**Garantir que le bot Discord et la web app donnent EXACTEMENT les mêmes résultats pour toute image de deck MTG.**

Cette documentation assure :
- ✅ Cohérence parfaite des résultats
- ✅ Maintenance simplifiée
- ✅ Pas de duplication de code
- ✅ Tests automatiques de régression
- ✅ Monitoring des divergences

---

*Documentation Discord Bot MTG Screen-to-Deck v2.0*
*Dernière mise à jour : Décembre 2024*