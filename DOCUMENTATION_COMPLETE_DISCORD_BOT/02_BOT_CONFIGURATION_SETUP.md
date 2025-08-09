# ⚙️ Configuration et Setup Détaillé - Bot Discord MTG

## Configuration Complète .env

### Fichier .env Complet avec Explications

```env
# ============================================
# DISCORD CONFIGURATION
# ============================================

# Token du bot (obtenu depuis Discord Developer Portal)
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE

# Préfixe des commandes (peut être changé)
DISCORD_PREFIX=!mtg

# IDs des administrateurs (séparés par des virgules)
# Pour obtenir votre ID: Mode développeur Discord > Clic droit sur votre nom > Copier l'ID
DISCORD_ADMIN_IDS=123456789012345678,987654321098765432

# ID du serveur principal (optionnel, pour les slash commands)
DISCORD_GUILD_ID=111222333444555666

# Channel de logs (optionnel)
DISCORD_LOG_CHANNEL_ID=777888999000111222

# ============================================
# WEB APP API CONFIGURATION
# ============================================

# URL de l'API (DOIT pointer vers la même API que la web app)
# Local development
API_BASE_URL=http://localhost:3001/api

# Production (exemples)
# API_BASE_URL=https://api.mtg-ocr.com/api
# API_BASE_URL=https://your-app.herokuapp.com/api
# API_BASE_URL=http://192.168.1.100:3001/api  # Réseau local

# Clé API OpenAI (MÊME clé que la web app pour cohérence)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Clé API interne (optionnel, pour sécuriser l'accès)
INTERNAL_API_KEY=your-secret-api-key-shared-with-webapp

# ============================================
# OCR CONFIGURATION
# ============================================

# Activer la super-résolution automatique
ENABLE_SUPER_RESOLUTION=true

# Activer le mode "Never Give Up" par défaut
ENABLE_NEVER_GIVE_UP=true

# Résolution minimale avant upscaling (DOIT être 1200 comme la web app)
MIN_RESOLUTION=1200

# Facteur d'upscaling (DOIT être 4 comme la web app)
UPSCALE_FACTOR=4

# Taille maximale des images acceptées (en MB)
MAX_IMAGE_SIZE_MB=10

# Timeout pour le traitement OCR (en secondes)
OCR_TIMEOUT=30

# Utiliser EasyOCR local en fallback
USE_LOCAL_OCR_FALLBACK=true

# ============================================
# FEATURES CONFIGURATION
# ============================================

# Activer les slash commands
ENABLE_SLASH_COMMANDS=true

# Activer les réactions automatiques pour export
ENABLE_AUTO_REACTIONS=true

# Activer le cache des résultats
ENABLE_CACHE=true

# Durée du cache en secondes (1 heure)
CACHE_TTL_SECONDS=3600

# Activer les notifications de mise à jour
ENABLE_UPDATE_NOTIFICATIONS=true

# ============================================
# RATE LIMITING
# ============================================

# Nombre maximum de commandes par utilisateur
RATE_LIMIT_COMMANDS=10

# Fenêtre de temps en secondes
RATE_LIMIT_WINDOW=60

# Cooldown entre commandes OCR (en secondes)
OCR_COOLDOWN=5

# Limite globale de commandes par minute
GLOBAL_RATE_LIMIT=100

# ============================================
# LOGGING CONFIGURATION
# ============================================

# Niveau de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Fichier de log
LOG_FILE=discord_bot.log

# Taille max du fichier de log (en MB)
LOG_MAX_SIZE_MB=10

# Nombre de fichiers de log à conserver
LOG_BACKUP_COUNT=5

# Envoyer les erreurs critiques sur Discord
SEND_ERRORS_TO_DISCORD=true

# ============================================
# DATABASE (Optionnel)
# ============================================

# Pour stocker les statistiques et l'historique
# DATABASE_URL=sqlite:///bot_data.db
# DATABASE_URL=postgresql://user:pass@localhost/mtgbot
# DATABASE_URL=mysql://user:pass@localhost/mtgbot

# ============================================
# MONITORING (Optionnel)
# ============================================

# Sentry DSN pour le monitoring d'erreurs
# SENTRY_DSN=https://xxxxxx@sentry.io/xxxxxx

# Webhook pour les alertes
# ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx/xxxxx

# ============================================
# DEVELOPMENT
# ============================================

# Mode développement (active les logs debug)
DEVELOPMENT_MODE=false

# Auto-reload sur changement de fichier
AUTO_RELOAD=false

# Serveur de test (pour les tests)
TEST_SERVER_ID=999888777666555444

# ============================================
# ADVANCED
# ============================================

# Nombre de workers pour le traitement parallèle
WORKER_COUNT=4

# Taille du pool de connexions HTTP
CONNECTION_POOL_SIZE=10

# Timeout pour les requêtes API (en secondes)
API_REQUEST_TIMEOUT=30

# Réessais en cas d'échec
MAX_RETRIES=3

# Délai entre les réessais (en secondes)
RETRY_DELAY=5
```

## Scripts de Configuration

### 1. Script d'Installation Automatique

```bash
#!/bin/bash
# install_bot.sh

echo "🤖 Installation du Bot Discord MTG Screen-to-Deck"
echo "================================================"

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    exit 1
fi

echo "✅ Python 3 détecté: $(python3 --version)"

# Créer l'environnement virtuel
echo "📦 Création de l'environnement virtuel..."
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
echo "📚 Installation des dépendances..."
pip install --upgrade pip
pip install -r requirements.txt

# Télécharger les modèles EasyOCR
echo "🔍 Téléchargement des modèles OCR..."
python3 -c "import easyocr; reader = easyocr.Reader(['en'], gpu=False)"

# Créer les dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p logs
mkdir -p cache
mkdir -p temp

# Copier le fichier de configuration
if [ ! -f .env ]; then
    echo "⚙️ Création du fichier .env..."
    cp .env.example .env
    echo "⚠️ N'oubliez pas de configurer le fichier .env !"
else
    echo "✅ Fichier .env existant conservé"
fi

echo ""
echo "✅ Installation terminée !"
echo ""
echo "Prochaines étapes:"
echo "1. Éditer le fichier .env avec vos tokens"
echo "2. Lancer le bot avec: python3 bot.py"
echo "3. Inviter le bot sur votre serveur Discord"
```

### 2. Script de Vérification de Configuration

```python
#!/usr/bin/env python3
# check_config.py

import os
import sys
from dotenv import load_dotenv
import requests
import discord

# Charger la configuration
load_dotenv()

def check_config():
    """Vérifier que la configuration est complète et valide"""
    
    errors = []
    warnings = []
    
    print("🔍 Vérification de la configuration...")
    print("=" * 50)
    
    # 1. Vérifier le token Discord
    discord_token = os.getenv('DISCORD_TOKEN')
    if not discord_token:
        errors.append("❌ DISCORD_TOKEN non configuré")
    elif len(discord_token) < 50:
        errors.append("❌ DISCORD_TOKEN semble invalide (trop court)")
    else:
        print("✅ Token Discord configuré")
    
    # 2. Vérifier l'API URL
    api_url = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ API accessible à {api_url}")
        else:
            warnings.append(f"⚠️ API retourne le code {response.status_code}")
    except requests.exceptions.RequestException as e:
        warnings.append(f"⚠️ API non accessible: {e}")
    
    # 3. Vérifier OpenAI API Key
    openai_key = os.getenv('OPENAI_API_KEY')
    if not openai_key:
        warnings.append("⚠️ OPENAI_API_KEY non configuré (OCR limité)")
    elif not openai_key.startswith('sk-'):
        errors.append("❌ OPENAI_API_KEY format invalide")
    else:
        print("✅ OpenAI API Key configurée")
    
    # 4. Vérifier les paramètres OCR
    min_res = os.getenv('MIN_RESOLUTION', '1200')
    if min_res != '1200':
        warnings.append(f"⚠️ MIN_RESOLUTION={min_res} (devrait être 1200)")
    
    upscale = os.getenv('UPSCALE_FACTOR', '4')
    if upscale != '4':
        warnings.append(f"⚠️ UPSCALE_FACTOR={upscale} (devrait être 4)")
    
    # 5. Vérifier EasyOCR
    try:
        import easyocr
        print("✅ EasyOCR installé")
    except ImportError:
        errors.append("❌ EasyOCR non installé")
    
    # 6. Vérifier discord.py
    try:
        import discord
        print(f"✅ discord.py version {discord.__version__}")
    except ImportError:
        errors.append("❌ discord.py non installé")
    
    # Résumé
    print("\n" + "=" * 50)
    
    if errors:
        print("\n❌ ERREURS CRITIQUES:")
        for error in errors:
            print(f"  {error}")
    
    if warnings:
        print("\n⚠️ AVERTISSEMENTS:")
        for warning in warnings:
            print(f"  {warning}")
    
    if not errors and not warnings:
        print("\n✅ Configuration parfaite ! Le bot est prêt.")
        return True
    elif not errors:
        print("\n✅ Configuration acceptable avec quelques avertissements.")
        return True
    else:
        print("\n❌ Configuration invalide. Corrigez les erreurs ci-dessus.")
        return False

if __name__ == "__main__":
    if not check_config():
        sys.exit(1)
```

### 3. Script de Test de Connexion

```python
#!/usr/bin/env python3
# test_connection.py

import asyncio
import os
from dotenv import load_dotenv
import discord
import aiohttp

load_dotenv()

async def test_discord_connection():
    """Tester la connexion Discord"""
    print("🔌 Test de connexion Discord...")
    
    intents = discord.Intents.default()
    intents.message_content = True
    
    client = discord.Client(intents=intents)
    
    @client.event
    async def on_ready():
        print(f"✅ Connecté en tant que {client.user}")
        print(f"📊 Serveurs: {len(client.guilds)}")
        for guild in client.guilds:
            print(f"  - {guild.name} ({guild.member_count} membres)")
        await client.close()
    
    try:
        await client.start(os.getenv('DISCORD_TOKEN'))
    except discord.LoginFailure:
        print("❌ Token Discord invalide")
    except Exception as e:
        print(f"❌ Erreur: {e}")

async def test_api_connection():
    """Tester la connexion à l'API web app"""
    print("\n🔌 Test de connexion API...")
    
    api_url = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test health endpoint
            async with session.get(f"{api_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ API accessible: {data}")
                else:
                    print(f"⚠️ API retourne: {response.status}")
            
            # Test enhanced OCR status
            async with session.get(f"{api_url}/ocr/enhanced/status") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Enhanced OCR disponible:")
                    print(f"  - Super-résolution: {data['capabilities']['super_resolution']}")
                    print(f"  - Never Give Up: {data['capabilities']['never_give_up_mode']}")
                    print(f"  - Formats: {data['capabilities']['format_detection']}")
                    
        except aiohttp.ClientError as e:
            print(f"❌ Erreur de connexion API: {e}")

async def main():
    print("🧪 Test de Configuration du Bot Discord MTG")
    print("=" * 50)
    
    await test_discord_connection()
    await test_api_connection()
    
    print("\n" + "=" * 50)
    print("✅ Tests terminés")

if __name__ == "__main__":
    asyncio.run(main())
```

## Configuration Discord Developer Portal

### Étapes Détaillées avec Screenshots

#### 1. Créer l'Application

1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquer sur "New Application"
3. Nommer: "MTG Screen-to-Deck"
4. Accepter les ToS

#### 2. Configuration Bot

Dans la section "Bot":

```yaml
# Paramètres recommandés
Public Bot: ✅ (ou ❌ pour bot privé)
Requires OAuth2 Code Grant: ❌

# Privileged Gateway Intents
Presence Intent: ❌ (pas nécessaire)
Server Members Intent: ✅ (pour les commandes)
Message Content Intent: ✅ (OBLIGATOIRE pour lire les images)
```

#### 3. Permissions Requises

```python
# Permissions en code binaire
permissions = 0x0000000000019C00

# Détail des permissions:
# - Read Messages (VIEW_CHANNEL)
# - Send Messages (SEND_MESSAGES)
# - Embed Links (EMBED_LINKS)
# - Attach Files (ATTACH_FILES)
# - Read Message History (READ_MESSAGE_HISTORY)
# - Add Reactions (ADD_REACTIONS)
# - Use Slash Commands (USE_APPLICATION_COMMANDS)
```

#### 4. URL d'Invitation

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=105472&scope=bot%20applications.commands

# Remplacer YOUR_CLIENT_ID par l'ID de votre application
```

## Configuration des Slash Commands

### Enregistrement des Commandes

```python
# discord-bot/setup_commands.py
import discord
from discord import app_commands
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def setup_slash_commands():
    """Enregistrer les slash commands globalement"""
    
    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    
    @client.event
    async def on_ready():
        print(f"🤖 Bot connecté: {client.user}")
        
        # Définir les commandes
        commands = [
            app_commands.Command(
                name="scan",
                description="Scanner une image MTG pour extraire le deck",
                callback=lambda i: i.response.send_message("Processing...")
            ),
            app_commands.Command(
                name="enhance",
                description="Utiliser l'OCR amélioré (Never Give Up mode)",
                callback=lambda i: i.response.send_message("Enhanced processing...")
            ),
            app_commands.Command(
                name="export",
                description="Exporter le dernier deck scanné",
                callback=lambda i: i.response.send_message("Exporting...")
            ),
            app_commands.Command(
                name="help",
                description="Afficher l'aide",
                callback=lambda i: i.response.send_message("Help...")
            )
        ]
        
        # Enregistrer globalement
        for command in commands:
            client.tree.add_command(command)
        
        # Synchroniser
        await client.tree.sync()
        print("✅ Commandes slash enregistrées")
        
        await client.close()
    
    await client.start(os.getenv('DISCORD_TOKEN'))

if __name__ == "__main__":
    asyncio.run(setup_slash_commands())
```

## Configuration Réseau Local

### Pour un Déploiement sur Réseau Local

```env
# Configuration pour réseau local
API_BASE_URL=http://192.168.1.100:3001/api  # IP de la machine avec la web app

# Si derrière un firewall
PROXY_URL=http://proxy.company.com:8080
PROXY_USERNAME=user
PROXY_PASSWORD=pass
```

### Configuration Firewall

```bash
# Ouvrir les ports nécessaires (Ubuntu/Debian)
sudo ufw allow 3001/tcp  # API Web App
sudo ufw allow 443/tcp   # Discord WebSocket

# Windows PowerShell (Admin)
New-NetFirewallRule -DisplayName "MTG API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

## Variables d'Environnement pour Production

### Configuration Heroku

```bash
heroku config:set DISCORD_TOKEN=xxx
heroku config:set API_BASE_URL=https://your-api.herokuapp.com/api
heroku config:set OPENAI_API_KEY=xxx
heroku config:set MIN_RESOLUTION=1200
heroku config:set UPSCALE_FACTOR=4
```

### Configuration Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  discord-bot:
    build: .
    env_file: .env.production
    environment:
      - NODE_ENV=production
      - API_BASE_URL=http://web-api:3001/api
```

### Configuration PM2

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mtg-discord-bot',
    script: 'bot.py',
    interpreter: 'python3',
    env: {
      NODE_ENV: 'production',
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      API_BASE_URL: 'http://localhost:3001/api'
    }
  }]
}
```

---

*Configuration complète pour le Bot Discord MTG Screen-to-Deck*
*Assure la cohérence parfaite avec la web app*