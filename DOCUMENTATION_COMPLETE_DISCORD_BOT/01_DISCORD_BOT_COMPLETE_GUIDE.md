# 📚 Documentation Complète - Bot Discord MTG Screen-to-Deck

## Table des Matières
1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture du Bot](#architecture-du-bot)
3. [Installation et Configuration](#installation-et-configuration)
4. [Déploiement](#déploiement)
5. [Commandes Discord](#commandes-discord)
6. [Intégration avec la Web App](#intégration-avec-la-web-app)
7. [Méthodes OCR Partagées](#méthodes-ocr-partagées)
8. [Monitoring et Logs](#monitoring-et-logs)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce que le Bot Discord MTG ?

Le **Bot Discord MTG Screen-to-Deck** est un bot qui permet aux utilisateurs Discord d'extraire des decklists directement depuis des images postées dans les channels. Il utilise **EXACTEMENT les mêmes méthodes OCR** que la web app pour garantir une cohérence parfaite.

### Fonctionnalités Principales

- ✅ **Mêmes méthodes que la web app** (Enhanced OCR, Never Give Up)
- ✅ **Détection automatique** des images dans les messages
- ✅ **Support multi-format** : Arena, MTGO, papier
- ✅ **Export direct** en format MTGA dans Discord
- ✅ **Super-résolution** automatique
- ✅ **Validation 60+15** garantie

### Architecture Hybride

```
Discord User → Discord Bot (Python) → Web App API (Node.js) → OCR Pipeline
                     ↓
              Local OCR (EasyOCR)
```

---

## 🏗️ Architecture du Bot

### Stack Technique

```
┌─────────────────────────────────────────────┐
│            DISCORD BOT (Python)             │
├─────────────────────────────────────────────┤
│ • discord.py 2.3+                           │
│ • aiohttp (async HTTP)                      │
│ • EasyOCR (local OCR)                       │
│ • Pillow (image processing)                 │
│ • python-dotenv (config)                    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│         WEB APP API (Réutilisation)         │
├─────────────────────────────────────────────┤
│ • /api/ocr/enhanced (même endpoint)         │
│ • /api/cards/validate                       │
│ • /api/export/*                             │
└─────────────────────────────────────────────┘
```

### Structure des Fichiers

```
discord-bot/
├── bot.py                      # Bot principal
├── cogs/
│   ├── ocr_commands.py        # Commandes OCR
│   ├── deck_management.py     # Gestion des decks
│   └── admin_commands.py      # Commandes admin
├── services/
│   ├── ocr_service.py         # Service OCR (appelle web app)
│   ├── image_processor.py     # Prétraitement images
│   └── deck_formatter.py      # Formatage des decks
├── utils/
│   ├── config.py              # Configuration
│   ├── logger.py              # Logging
│   └── validators.py          # Validation
├── requirements.txt           # Dépendances Python
├── .env.example              # Template config
└── docker/
    ├── Dockerfile            # Container Discord bot
    └── docker-compose.yml    # Orchestration
```

---

## 🚀 Installation et Configuration

### Prérequis

- **Python 3.8+**
- **Node.js 18+** (pour la web app API)
- **Discord Bot Token**
- **OpenAI API Key** (partagée avec web app)

### Étape 1: Créer le Bot Discord

#### 1.1 Discord Developer Portal
1. Aller sur https://discord.com/developers/applications
2. Cliquer "New Application"
3. Nommer le bot: "MTG Screen-to-Deck"
4. Aller dans "Bot" → "Add Bot"
5. Copier le TOKEN

#### 1.2 Permissions Bot
```
Permissions requises:
- Read Messages
- Send Messages
- Attach Files
- Embed Links
- Read Message History
- Add Reactions
- Use Slash Commands
```

URL d'invitation:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=379968&scope=bot%20applications.commands
```

### Étape 2: Configuration Environnement

#### 2.1 Cloner le Repository
```bash
git clone https://github.com/your-repo/screen-to-deck.git
cd screen-to-deck/discord-bot
```

#### 2.2 Créer le fichier .env
```bash
cp .env.example .env
```

#### 2.3 Configuration .env
```env
# Discord Configuration
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_PREFIX=!mtg
DISCORD_ADMIN_IDS=123456789,987654321

# Web App API (IMPORTANT: même config que web app)
API_BASE_URL=http://localhost:3001/api
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Features
ENABLE_SUPER_RESOLUTION=true
ENABLE_NEVER_GIVE_UP=true
MAX_IMAGE_SIZE_MB=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=discord_bot.log

# Rate Limiting
RATE_LIMIT_COMMANDS=10
RATE_LIMIT_WINDOW=60

# Cache
ENABLE_CACHE=true
CACHE_TTL_SECONDS=3600
```

### Étape 3: Installation des Dépendances

#### 3.1 Dépendances Python
```bash
cd discord-bot
pip install -r requirements.txt
```

#### 3.2 Contenu requirements.txt
```txt
discord.py>=2.3.0
aiohttp>=3.8.0
python-dotenv>=1.0.0
Pillow>=10.0.0
easyocr>=1.7.0
opencv-python-headless>=4.8.0
numpy>=1.24.0
requests>=2.31.0
asyncio>=3.4.3
```

#### 3.3 Vérifier l'Installation
```bash
python -c "import discord; print(f'Discord.py version: {discord.__version__}')"
python -c "import easyocr; print('EasyOCR installed ✓')"
```

### Étape 4: Lancer le Bot

#### 4.1 Mode Développement
```bash
# Terminal 1: Lancer la web app API
cd ../
npm run dev

# Terminal 2: Lancer le bot Discord
cd discord-bot
python bot.py
```

#### 4.2 Vérifier le Statut
Le bot devrait afficher:
```
[INFO] Discord Bot Starting...
[INFO] Connecting to Web App API at http://localhost:3001/api
[INFO] Bot logged in as: MTG Screen-to-Deck#1234
[INFO] Connected to 5 guilds
[INFO] Ready to process deck images!
```

---

## 🚢 Déploiement

### Option 1: VPS/Serveur Dédié

#### 1.1 Préparation Serveur
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.8 python3-pip nodejs npm git

# Installation globale
sudo npm install -g pm2
```

#### 1.2 Clone et Configuration
```bash
cd /opt
sudo git clone https://github.com/your-repo/screen-to-deck.git
cd screen-to-deck

# Configuration
cp .env.example .env
sudo nano .env  # Ajouter les tokens
```

#### 1.3 Installation
```bash
# Web App
npm install
npm run build

# Discord Bot
cd discord-bot
pip3 install -r requirements.txt
```

#### 1.4 Lancement avec PM2
```bash
# Web App API
pm2 start server/dist/index.js --name "mtg-api"

# Discord Bot
pm2 start discord-bot/bot.py --interpreter python3 --name "mtg-discord"

# Sauvegarder la config
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

#### 2.1 Dockerfile pour le Bot
```dockerfile
# discord-bot/Dockerfile
FROM python:3.8-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    wget \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download EasyOCR models
RUN python -c "import easyocr; reader = easyocr.Reader(['en'], gpu=False)"

# Copy bot code
COPY . .

CMD ["python", "bot.py"]
```

#### 2.2 Docker Compose Complet
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Web App API
  web-api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./uploads:/app/uploads
    networks:
      - mtg-network

  # Discord Bot
  discord-bot:
    build: ./discord-bot
    depends_on:
      - web-api
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - API_BASE_URL=http://web-api:3001/api
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./logs:/app/logs
    networks:
      - mtg-network
    restart: unless-stopped

networks:
  mtg-network:
    driver: bridge
```

#### 2.3 Lancement Docker
```bash
# Build et lancement
docker-compose up -d

# Voir les logs
docker-compose logs -f discord-bot

# Redémarrer
docker-compose restart discord-bot
```

### Option 3: Cloud Hosting

#### Heroku
```bash
# Heroku CLI
heroku create mtg-discord-bot
heroku config:set DISCORD_TOKEN=xxx
heroku config:set API_BASE_URL=https://your-api.herokuapp.com

# Deploy
git push heroku main
```

#### Railway/Render
- Upload du code
- Configuration des variables d'environnement
- Déploiement automatique

### Option 4: Bot Hosting Spécialisé

Services recommandés:
- **Bot-Hosting.net**
- **PloxHost**
- **Sparked Host**

---

## 💬 Commandes Discord

### Commandes Utilisateur

#### !mtg scan / /scan
```
Description: Scanner une image pour extraire le deck
Usage: !mtg scan [image attachée ou URL]
Exemple: !mtg scan [upload image.jpg]
```

#### !mtg enhance / /enhance
```
Description: Utiliser l'OCR amélioré (Never Give Up mode)
Usage: !mtg enhance [image]
Note: Garantit 60+15 cartes
```

#### !mtg export / /export
```
Description: Exporter le dernier deck scanné
Usage: !mtg export [format]
Formats: mtga, moxfield, archidekt, json
```

#### !mtg help / /help
```
Description: Afficher l'aide
Usage: !mtg help [commande]
```

### Commandes Admin

#### !mtg status
```
Description: Vérifier le statut du bot et de l'API
Permissions: Admin only
```

#### !mtg reload
```
Description: Recharger la configuration
Permissions: Admin only
```

#### !mtg stats
```
Description: Statistiques d'utilisation
Permissions: Admin only
```

### Slash Commands

```python
# Configuration dans bot.py
@bot.tree.command(name="scan", description="Scanner une image MTG")
async def scan_slash(interaction: discord.Interaction, image: discord.Attachment):
    await process_image(interaction, image)
```

---

## 🔗 Intégration avec la Web App

### Principe: Réutilisation de l'API

Le bot Discord **NE REFAIT PAS** le travail OCR mais utilise l'API de la web app:

```python
# discord-bot/services/ocr_service.py
import aiohttp
import os
from typing import Dict, List

class OCRService:
    def __init__(self):
        self.api_base = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
        self.headers = {
            'X-Source': 'discord-bot',
            'X-Bot-Version': '2.0.0'
        }
    
    async def process_image_enhanced(self, image_data: bytes) -> Dict:
        """
        Utilise EXACTEMENT le même endpoint que la web app
        Garantit les mêmes résultats
        """
        async with aiohttp.ClientSession() as session:
            # Créer le form data
            data = aiohttp.FormData()
            data.add_field('image', 
                          image_data, 
                          filename='discord_image.jpg',
                          content_type='image/jpeg')
            
            # Appeler l'API Enhanced OCR
            async with session.post(
                f"{self.api_base}/ocr/enhanced",
                data=data,
                headers=self.headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"API Error: {response.status}")
    
    async def validate_cards(self, cards: List[str]) -> Dict:
        """
        Validation via Scryfall (même service que web app)
        """
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_base}/cards/validate",
                json={"cards": cards},
                headers=self.headers
            ) as response:
                return await response.json()
```

### Workflow Complet

```python
# discord-bot/cogs/ocr_commands.py
import discord
from discord.ext import commands
from services.ocr_service import OCRService

class OCRCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.ocr_service = OCRService()
    
    @commands.command(name='scan')
    async def scan_image(self, ctx: commands.Context):
        """Scanner une image avec l'OCR enhanced"""
        
        # 1. Vérifier qu'il y a une image
        if not ctx.message.attachments:
            await ctx.reply("❌ Merci d'attacher une image!")
            return
        
        attachment = ctx.message.attachments[0]
        
        # 2. Vérifier le format
        if not attachment.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            await ctx.reply("❌ Format non supporté. Utilisez JPG, PNG ou WebP.")
            return
        
        # 3. Message de traitement
        processing_msg = await ctx.reply("🔄 Analyse en cours (Never Give Up Mode activé)...")
        
        try:
            # 4. Télécharger l'image
            image_data = await attachment.read()
            
            # 5. Appeler l'API web app (MÊME MÉTHODE)
            result = await self.ocr_service.process_image_enhanced(image_data)
            
            # 6. Formater le résultat
            if result['success']:
                embed = self.create_deck_embed(result)
                await processing_msg.edit(content="✅ Deck extrait avec succès!", embed=embed)
                
                # 7. Ajouter les réactions pour export
                await processing_msg.add_reaction("📋")  # Copy MTGA
                await processing_msg.add_reaction("📊")  # Stats
                await processing_msg.add_reaction("💾")  # Save
            else:
                await processing_msg.edit(content="❌ Erreur lors de l'extraction")
                
        except Exception as e:
            await processing_msg.edit(content=f"❌ Erreur: {str(e)}")
    
    def create_deck_embed(self, result: dict) -> discord.Embed:
        """Créer un embed Discord avec les résultats"""
        stats = result['statistics']
        validation = result['validation']
        
        # Couleur selon la validation
        color = discord.Color.green() if validation['complete'] else discord.Color.orange()
        
        embed = discord.Embed(
            title="🎴 Deck MTG Extrait",
            color=color,
            description=f"**Mainboard**: {stats['mainboard_count']}/60 {'✅' if validation['mainboard_valid'] else '❌'}\n"
                       f"**Sideboard**: {stats['sideboard_count']}/15 {'✅' if validation['sideboard_valid'] else '❌'}"
        )
        
        # Mainboard (limité pour Discord)
        mainboard = [c for c in result['cards'] if c['section'] != 'sideboard'][:10]
        mainboard_text = "\n".join([f"{c['quantity']}x {c['name']}" for c in mainboard])
        if len(mainboard) < stats['mainboard_count']:
            mainboard_text += f"\n... et {stats['mainboard_count'] - 10} autres"
        embed.add_field(name="Mainboard", value=mainboard_text or "Vide", inline=True)
        
        # Sideboard
        sideboard = [c for c in result['cards'] if c['section'] == 'sideboard'][:5]
        sideboard_text = "\n".join([f"{c['quantity']}x {c['name']}" for c in sideboard])
        if len(sideboard) < stats['sideboard_count']:
            sideboard_text += f"\n... et {stats['sideboard_count'] - 5} autres"
        embed.add_field(name="Sideboard", value=sideboard_text or "Vide", inline=True)
        
        # Stats
        embed.add_field(
            name="📊 Statistiques",
            value=f"**Temps**: {stats['processing_time_ms']/1000:.1f}s\n"
                  f"**Confiance**: {stats['confidence']*100:.0f}%\n"
                  f"**Cartes uniques**: {stats['total_unique_cards']}",
            inline=False
        )
        
        embed.set_footer(text="Réagissez avec 📋 pour copier en format MTGA")
        
        return embed
```

---

## 🔄 Méthodes OCR Partagées

### Configuration pour Utiliser les Mêmes Méthodes

#### 1. Scripts Python Partagés

```python
# discord-bot/services/shared_ocr.py
import sys
import os

# Ajouter le chemin des scripts partagés
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

# Importer les MÊMES scripts que la web app
from robust_ocr_solution import MTGSideboardOCR
from super_resolution_free import SuperResolution
from scryfall_color_search import ScryfallColorSearch

class SharedOCRMethods:
    """
    Utilise EXACTEMENT les mêmes méthodes que la web app
    """
    def __init__(self):
        self.sideboard_ocr = MTGSideboardOCR()
        self.super_res = SuperResolution()
        self.scryfall = ScryfallColorSearch()
    
    async def process_with_same_methods(self, image_path: str):
        """
        Pipeline identique à enhancedOcrService.ts
        """
        # 1. Check resolution (même seuil: 1200px)
        if self.needs_upscale(image_path):
            image_path = await self.super_res.upscale(image_path)
        
        # 2. Try EasyOCR first
        result = await self.sideboard_ocr.process(image_path)
        
        # 3. If incomplete, use API endpoint
        if not self.is_complete(result):
            return await self.call_web_api(image_path)
        
        return result
```

#### 2. Synchronisation des Configurations

```python
# discord-bot/config/ocr_config.py
"""
IMPORTANT: Ces valeurs DOIVENT être identiques à celles de la web app
Voir: server/src/services/enhancedOcrService.ts
"""

OCR_CONFIG = {
    # Mêmes seuils que la web app
    'MIN_RESOLUTION': 1200,
    'UPSCALE_FACTOR': 4,
    'TEXT_MIN_HEIGHT': 15,
    
    # Mêmes targets de validation
    'MAINBOARD_TARGET': 60,
    'SIDEBOARD_TARGET': 15,
    
    # Mêmes timeouts
    'OCR_TIMEOUT': 30,
    'API_TIMEOUT': 60,
    
    # Même ordre de méthodes
    'METHOD_PRIORITY': [
        'easyocr_basic',
        'easyocr_enhanced',
        'openai_vision',
        'never_give_up'
    ]
}
```

### Assurance Qualité: Tests de Cohérence

```python
# discord-bot/tests/test_consistency.py
import unittest
import asyncio
from services.ocr_service import OCRService

class TestConsistencyWithWebApp(unittest.TestCase):
    """
    Tests pour s'assurer que le bot donne les MÊMES résultats que la web app
    """
    
    def setUp(self):
        self.ocr_service = OCRService()
        self.test_images = [
            'test_images/arena_high_res.jpg',
            'test_images/mtgo_deck.png',
            'test_images/low_res_paper.jpg'
        ]
    
    def test_same_results_as_web_app(self):
        """
        Vérifie que les résultats sont identiques
        """
        for image_path in self.test_images:
            # Résultat via bot
            bot_result = asyncio.run(
                self.ocr_service.process_image_enhanced(open(image_path, 'rb').read())
            )
            
            # Résultat attendu (depuis web app)
            expected = self.get_expected_result(image_path)
            
            # Vérifier l'égalité
            self.assertEqual(
                bot_result['statistics']['mainboard_count'],
                expected['statistics']['mainboard_count'],
                f"Mainboard count mismatch for {image_path}"
            )
            
            self.assertEqual(
                bot_result['statistics']['sideboard_count'],
                expected['statistics']['sideboard_count'],
                f"Sideboard count mismatch for {image_path}"
            )
```

---

## 📊 Monitoring et Logs

### Configuration des Logs

```python
# discord-bot/utils/logger.py
import logging
import os
from datetime import datetime

def setup_logger():
    """Configuration du logger pour le bot"""
    
    # Créer le dossier logs
    os.makedirs('logs', exist_ok=True)
    
    # Format des logs
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Handler fichier
    file_handler = logging.FileHandler(
        f'logs/bot_{datetime.now().strftime("%Y%m%d")}.log'
    )
    file_handler.setFormatter(formatter)
    
    # Handler console
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # Logger principal
    logger = logging.getLogger('discord_bot')
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger
```

### Métriques à Suivre

```python
# discord-bot/utils/metrics.py
import time
from collections import defaultdict
from datetime import datetime, timedelta

class BotMetrics:
    def __init__(self):
        self.stats = defaultdict(int)
        self.processing_times = []
        self.start_time = datetime.now()
    
    def track_command(self, command_name: str):
        """Track l'utilisation d'une commande"""
        self.stats[f'command_{command_name}'] += 1
    
    def track_ocr_processing(self, duration: float, success: bool):
        """Track le traitement OCR"""
        self.processing_times.append(duration)
        if success:
            self.stats['ocr_success'] += 1
        else:
            self.stats['ocr_failure'] += 1
    
    def get_summary(self) -> dict:
        """Résumé des métriques"""
        uptime = datetime.now() - self.start_time
        
        return {
            'uptime': str(uptime),
            'total_commands': sum(v for k, v in self.stats.items() if k.startswith('command_')),
            'ocr_success_rate': self.stats['ocr_success'] / max(1, self.stats['ocr_success'] + self.stats['ocr_failure']),
            'avg_processing_time': sum(self.processing_times) / max(1, len(self.processing_times)),
            'total_images_processed': self.stats['ocr_success'] + self.stats['ocr_failure']
        }
```

### Dashboard de Monitoring

```python
# discord-bot/cogs/admin_commands.py
@commands.command(name='stats')
@commands.has_permissions(administrator=True)
async def show_stats(self, ctx):
    """Afficher les statistiques du bot"""
    metrics = self.bot.metrics.get_summary()
    
    embed = discord.Embed(
        title="📊 Statistiques du Bot",
        color=discord.Color.blue()
    )
    
    embed.add_field(
        name="Uptime",
        value=metrics['uptime'],
        inline=True
    )
    
    embed.add_field(
        name="Images Traitées",
        value=f"{metrics['total_images_processed']}",
        inline=True
    )
    
    embed.add_field(
        name="Taux de Succès",
        value=f"{metrics['ocr_success_rate']*100:.1f}%",
        inline=True
    )
    
    embed.add_field(
        name="Temps Moyen",
        value=f"{metrics['avg_processing_time']:.1f}s",
        inline=True
    )
    
    await ctx.send(embed=embed)
```

---

## 🔧 Troubleshooting

### Problèmes Courants et Solutions

#### 1. Bot ne se connecte pas
```
Erreur: discord.errors.LoginFailure: Improper token has been passed
```
**Solution**:
- Vérifier le token dans .env
- Régénérer le token sur Discord Developer Portal
- S'assurer qu'il n'y a pas d'espaces

#### 2. API Web App non accessible
```
Erreur: aiohttp.ClientConnectorError: Cannot connect to host localhost:3001
```
**Solution**:
```bash
# Vérifier que la web app tourne
curl http://localhost:3001/health

# Si non, la démarrer
cd .. && npm run dev
```

#### 3. EasyOCR installation échoue
```
Erreur: ModuleNotFoundError: No module named 'easyocr'
```
**Solution**:
```bash
pip install --upgrade pip
pip install torch torchvision
pip install easyocr
```

#### 4. Rate Limiting Discord
```
Erreur: discord.errors.HTTPException: 429 Too Many Requests
```
**Solution**:
```python
# Ajouter des delays
import asyncio

@commands.cooldown(1, 10, commands.BucketType.user)
async def scan_image(self, ctx):
    # Commande limitée à 1 usage toutes les 10 secondes
```

#### 5. Images trop grandes
```
Erreur: File size exceeds maximum allowed (10MB)
```
**Solution**:
```python
# Compresser l'image avant traitement
from PIL import Image
import io

def compress_image(image_data: bytes, max_size_mb: int = 10) -> bytes:
    img = Image.open(io.BytesIO(image_data))
    
    # Redimensionner si trop grande
    max_dimension = 2048
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension))
    
    # Sauvegarder avec compression
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    return output.getvalue()
```

### Logs de Debug

```python
# Activer le mode debug
import logging
logging.basicConfig(level=logging.DEBUG)

# Dans le code
logger.debug(f"Processing image: {attachment.filename}")
logger.debug(f"API Response: {result}")
```

---

## 🔄 Maintenance

### Mises à Jour

#### 1. Mise à jour des dépendances
```bash
# Python
pip install --upgrade -r requirements.txt

# Vérifier les vulnérabilités
pip audit
```

#### 2. Synchronisation avec Web App
```bash
# Script de synchronisation
#!/bin/bash
# sync_methods.sh

# Copier les méthodes partagées
cp ../robust_ocr_solution.py ./services/
cp ../super_resolution_free.py ./services/
cp ../scryfall_color_search.py ./services/

echo "✅ Méthodes synchronisées avec la web app"
```

#### 3. Backup de la Configuration
```bash
# Sauvegarder la config
cp .env .env.backup.$(date +%Y%m%d)
cp -r logs/ logs_backup_$(date +%Y%m%d)/
```

### Health Checks

```python
# discord-bot/utils/health_check.py
async def check_health():
    """Vérifier la santé du bot et des services"""
    checks = {
        'discord_connected': bot.is_ready(),
        'web_api_accessible': await check_api(),
        'easyocr_available': check_easyocr(),
        'disk_space_ok': check_disk_space() > 1000  # 1GB minimum
    }
    
    return all(checks.values()), checks

async def auto_health_check():
    """Check automatique toutes les heures"""
    while True:
        healthy, checks = await check_health()
        if not healthy:
            logger.error(f"Health check failed: {checks}")
            # Alerter l'admin
        await asyncio.sleep(3600)  # 1 heure
```

### Redémarrage Automatique

```bash
# restart_on_failure.sh
#!/bin/bash

while true; do
    python3 bot.py
    echo "Bot crashed with exit code $?. Restarting in 10 seconds..."
    sleep 10
done
```

---

## 📌 Points Clés pour la Cohérence Web App/Bot

### 1. Toujours Utiliser l'API Web App
```python
# ✅ BON - Utilise l'API
result = await self.call_api('/ocr/enhanced', image_data)

# ❌ MAUVAIS - Refait le travail
result = self.process_ocr_locally(image)
```

### 2. Mêmes Configurations
```python
# Les deux doivent avoir:
MIN_RESOLUTION = 1200
UPSCALE_FACTOR = 4
MAINBOARD_TARGET = 60
SIDEBOARD_TARGET = 15
```

### 3. Mêmes Validations
```python
# Validation identique
if mainboard_count != 60 or sideboard_count != 15:
    # Appliquer Never Give Up mode
    result = await self.never_give_up(image)
```

### 4. Tests de Régression
```bash
# Tester que les résultats sont identiques
python tests/test_consistency.py
```

---

## 🎯 Checklist de Déploiement

- [ ] Token Discord configuré
- [ ] Web App API accessible
- [ ] OpenAI API Key configurée
- [ ] EasyOCR installé et testé
- [ ] Scripts Python partagés copiés
- [ ] Configuration .env complète
- [ ] Tests de cohérence passés
- [ ] Logs configurés
- [ ] Health checks actifs
- [ ] Monitoring en place
- [ ] Documentation à jour
- [ ] Backup de la config
- [ ] Bot invité sur le serveur Discord
- [ ] Permissions correctes
- [ ] Rate limiting configuré

---

*Documentation complète du Bot Discord MTG Screen-to-Deck v2.0*
*Garantit l'utilisation des MÊMES méthodes que la web app*