# 🔄 Méthodes OCR Partagées - Web App & Discord Bot

## Principe Fondamental

**LE BOT DISCORD DOIT UTILISER EXACTEMENT LES MÊMES MÉTHODES QUE LA WEB APP**

Cela garantit :
- ✅ Résultats identiques
- ✅ Maintenance simplifiée
- ✅ Cohérence totale
- ✅ Pas de duplication de code

## Architecture de Partage

```
┌──────────────────────────────────────────────┐
│           MÉTHODES OCR PARTAGÉES             │
├──────────────────────────────────────────────┤
│ • robust_ocr_solution.py                     │
│ • super_resolution_free.py                   │
│ • scryfall_color_search.py                   │
│ • mtgo_fix_lands.py                         │
└──────────────────────────────────────────────┘
                    ↑
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐     ┌───────▼────────┐
│   Web App      │     │  Discord Bot    │
│ (Node.js)      │     │   (Python)      │
└────────────────┘     └─────────────────┘
```

## Implémentation du Partage

### Option 1: Appel Direct à l'API Web App (RECOMMANDÉ)

```python
# discord-bot/services/web_app_ocr.py

import aiohttp
import os
from typing import Dict, Optional
import base64

class WebAppOCRService:
    """
    Service qui délègue TOUT le traitement OCR à la web app
    Garantit 100% de cohérence
    """
    
    def __init__(self):
        self.api_base = os.getenv('API_BASE_URL', 'http://localhost:3001/api')
        self.api_key = os.getenv('INTERNAL_API_KEY')  # Optionnel pour auth
        
    async def process_image(self, image_data: bytes, filename: str = 'discord_image.jpg') -> Dict:
        """
        Envoie l'image à l'endpoint Enhanced OCR de la web app
        
        Args:
            image_data: Données binaires de l'image
            filename: Nom du fichier
            
        Returns:
            Exactement le même format que la web app
        """
        
        async with aiohttp.ClientSession() as session:
            # Préparer le form data (identique à un upload web)
            data = aiohttp.FormData()
            data.add_field(
                'image',
                image_data,
                filename=filename,
                content_type='image/jpeg'
            )
            
            # Headers optionnels pour tracking
            headers = {
                'X-Source': 'discord-bot',
                'X-Bot-Version': '2.0.0'
            }
            
            if self.api_key:
                headers['X-API-Key'] = self.api_key
            
            # Appeler le MÊME endpoint que l'interface web
            url = f"{self.api_base}/ocr/enhanced"
            
            try:
                async with session.post(url, data=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Le résultat est EXACTEMENT le même que la web app
                        # {
                        #   "success": true,
                        #   "cards": [...],
                        #   "statistics": {...},
                        #   "validation": {...}
                        # }
                        
                        return result
                    else:
                        error_text = await response.text()
                        raise Exception(f"API Error {response.status}: {error_text}")
                        
            except aiohttp.ClientError as e:
                raise Exception(f"Connection error: {str(e)}")
    
    async def validate_cards(self, cards: list) -> Dict:
        """
        Utilise le même service de validation Scryfall
        """
        async with aiohttp.ClientSession() as session:
            url = f"{self.api_base}/cards/validate"
            
            async with session.post(url, json={"cards": cards}) as response:
                return await response.json()
    
    async def export_deck(self, cards: list, format: str) -> str:
        """
        Utilise le même service d'export
        """
        async with aiohttp.ClientSession() as session:
            url = f"{self.api_base}/export/{format}"
            
            async with session.post(url, json={"cards": cards}) as response:
                result = await response.json()
                return result.get('content', '')
```

### Option 2: Scripts Python Partagés (Fallback)

```python
# discord-bot/services/shared_ocr_methods.py

import sys
import os
from pathlib import Path

# Ajouter le chemin des scripts partagés
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Importer les MÊMES scripts que la web app utilise
try:
    from robust_ocr_solution import MTGSideboardOCR
    from super_resolution_free import SuperResolution
    from scryfall_color_search import ScryfallColorSearch
    from mtgo_fix_lands import MTGOLandsFixer
    
    SHARED_METHODS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Scripts partagés non disponibles: {e}")
    SHARED_METHODS_AVAILABLE = False

class SharedOCRMethods:
    """
    Utilise les MÊMES méthodes Python que la web app
    Pour le cas où l'API n'est pas accessible
    """
    
    def __init__(self):
        if not SHARED_METHODS_AVAILABLE:
            raise ImportError("Scripts OCR partagés non trouvés")
            
        self.ocr = MTGSideboardOCR()
        self.super_res = SuperResolution()
        self.scryfall = ScryfallColorSearch()
        self.mtgo_fixer = MTGOLandsFixer()
        
        # IMPORTANT: Utiliser les MÊMES configurations
        self.config = self.load_shared_config()
    
    def load_shared_config(self) -> dict:
        """
        Charge la configuration IDENTIQUE à enhancedOcrService.ts
        """
        return {
            'MIN_RESOLUTION': 1200,  # DOIT être identique
            'UPSCALE_FACTOR': 4,     # DOIT être identique
            'TEXT_MIN_HEIGHT': 15,   # DOIT être identique
            'MAINBOARD_TARGET': 60,  # DOIT être identique
            'SIDEBOARD_TARGET': 15,  # DOIT être identique
            'CONFIDENCE_THRESHOLD': 0.7,
            'SCRYFALL_RATE_LIMIT': 100,  # ms entre requêtes
        }
    
    async def process_with_shared_pipeline(self, image_path: str) -> dict:
        """
        Pipeline IDENTIQUE à enhancedOcrService.ts
        """
        
        # 1. Analyse de qualité (même logique)
        quality = self.analyze_quality(image_path)
        
        # 2. Super-résolution si nécessaire (même seuil)
        if quality['width'] < self.config['MIN_RESOLUTION']:
            image_path = await self.super_res.upscale(
                image_path, 
                factor=self.config['UPSCALE_FACTOR']
            )
        
        # 3. Détection de format (même méthode)
        format_type = self.detect_format(image_path)
        
        # 4. OCR progressif (même ordre)
        result = await self.progressive_ocr(image_path, format_type)
        
        # 5. Validation et correction (mêmes règles)
        result = await self.validate_and_fix(result, format_type)
        
        return result
    
    def analyze_quality(self, image_path: str) -> dict:
        """Même analyse que la web app"""
        from PIL import Image
        
        with Image.open(image_path) as img:
            width, height = img.size
            
        return {
            'width': width,
            'height': height,
            'needs_upscale': width < self.config['MIN_RESOLUTION']
        }
    
    def detect_format(self, image_path: str) -> str:
        """Même détection de format"""
        from PIL import Image
        
        with Image.open(image_path) as img:
            width, height = img.size
            aspect_ratio = width / height
            
            # Mêmes règles que enhancedOcrService.ts
            if aspect_ratio > 1.8:
                return 'mtgo'
            elif width > 1500:
                return 'arena'
            else:
                return 'paper'
    
    async def progressive_ocr(self, image_path: str, format_type: str) -> dict:
        """Même progression de méthodes"""
        
        methods = [
            ('easyocr_basic', self.try_easyocr_basic),
            ('easyocr_enhanced', self.try_easyocr_enhanced),
            ('scryfall_partial', self.try_scryfall_partial),
        ]
        
        for method_name, method_func in methods:
            try:
                result = await method_func(image_path, format_type)
                if result and len(result.get('cards', [])) > 0:
                    return result
            except Exception as e:
                print(f"Method {method_name} failed: {e}")
                continue
        
        # Si tout échoue, retourner vide
        return {'cards': [], 'success': False}
    
    async def validate_and_fix(self, result: dict, format_type: str) -> dict:
        """Mêmes règles de validation que la web app"""
        
        cards = result.get('cards', [])
        mainboard = [c for c in cards if c.get('section') != 'sideboard']
        sideboard = [c for c in cards if c.get('section') == 'sideboard']
        
        mainboard_count = sum(c.get('quantity', 1) for c in mainboard)
        sideboard_count = sum(c.get('quantity', 1) for c in sideboard)
        
        # Règle: DOIT avoir 60 mainboard et 15 sideboard
        if mainboard_count != 60 or sideboard_count != 15:
            # Appliquer les corrections spécifiques au format
            if format_type == 'mtgo' and mainboard_count < 60:
                # Utiliser mtgo_fix_lands (même script que web app)
                fixed = await self.mtgo_fixer.fix_lands(cards)
                if fixed:
                    result['cards'] = fixed
        
        return result
```

## Synchronisation des Configurations

### Configuration Partagée

```python
# shared_config.py - À la racine du projet

"""
Configuration UNIQUE partagée entre Web App et Discord Bot
NE JAMAIS avoir de valeurs différentes !
"""

OCR_CONFIG = {
    # Résolution
    'MIN_RESOLUTION': 1200,
    'UPSCALE_FACTOR': 4,
    
    # Validation
    'MAINBOARD_TARGET': 60,
    'SIDEBOARD_TARGET': 15,
    
    # OCR
    'TEXT_MIN_HEIGHT': 15,
    'CONFIDENCE_THRESHOLD': 0.7,
    
    # API
    'SCRYFALL_RATE_LIMIT_MS': 100,
    'OPENAI_TIMEOUT': 30,
    
    # Méthodes (ordre important)
    'METHOD_PRIORITY': [
        'easyocr_basic',
        'easyocr_enhanced', 
        'openai_vision',
        'never_give_up'
    ],
    
    # Formats
    'SUPPORTED_FORMATS': ['arena', 'mtgo', 'paper'],
    
    # Export
    'EXPORT_FORMATS': ['mtga', 'moxfield', 'archidekt', 'tappedout', 'json']
}

# Validation au chargement
def validate_config():
    """S'assurer que la config est valide"""
    assert OCR_CONFIG['MIN_RESOLUTION'] == 1200, "MIN_RESOLUTION must be 1200"
    assert OCR_CONFIG['UPSCALE_FACTOR'] == 4, "UPSCALE_FACTOR must be 4"
    assert OCR_CONFIG['MAINBOARD_TARGET'] == 60, "MAINBOARD_TARGET must be 60"
    assert OCR_CONFIG['SIDEBOARD_TARGET'] == 15, "SIDEBOARD_TARGET must be 15"
    return True

# Valider au chargement du module
validate_config()
```

### Utilisation dans le Bot

```python
# discord-bot/bot.py

import sys
sys.path.insert(0, '..')  # Accéder au dossier parent

from shared_config import OCR_CONFIG
from services.web_app_ocr import WebAppOCRService

class MTGBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix='!mtg ',
            intents=discord.Intents.all()
        )
        
        # Utiliser le service qui appelle la web app
        self.ocr_service = WebAppOCRService()
        
        # Charger la config partagée
        self.ocr_config = OCR_CONFIG
        
    async def process_image(self, image_data: bytes) -> dict:
        """
        Traite une image en utilisant EXACTEMENT les mêmes méthodes
        que la web app
        """
        
        # Option 1: Appeler l'API (recommandé)
        try:
            result = await self.ocr_service.process_image(image_data)
            return result
            
        except Exception as api_error:
            print(f"API non disponible: {api_error}")
            
            # Option 2: Fallback sur scripts locaux (mêmes méthodes)
            if SHARED_METHODS_AVAILABLE:
                from services.shared_ocr_methods import SharedOCRMethods
                shared = SharedOCRMethods()
                
                # Sauver temporairement l'image
                temp_path = f"/tmp/discord_{datetime.now().timestamp()}.jpg"
                with open(temp_path, 'wb') as f:
                    f.write(image_data)
                
                try:
                    result = await shared.process_with_shared_pipeline(temp_path)
                    return result
                finally:
                    os.remove(temp_path)
            else:
                raise Exception("Ni l'API ni les méthodes locales ne sont disponibles")
```

## Tests de Cohérence

### Test Automatique de Cohérence

```python
# discord-bot/tests/test_same_results.py

import unittest
import asyncio
import json
from pathlib import Path

class TestSameResults(unittest.TestCase):
    """
    CRITIQUE: S'assurer que le bot donne EXACTEMENT les mêmes résultats
    que la web app
    """
    
    def setUp(self):
        self.test_images = Path('test_images')
        self.expected_results = Path('expected_results')
    
    def test_all_test_images(self):
        """Test toutes les images de référence"""
        
        for image_file in self.test_images.glob('*.jpg'):
            with self.subTest(image=image_file.name):
                # Résultat du bot
                bot_result = self.process_with_bot(image_file)
                
                # Résultat attendu (depuis web app)
                expected_file = self.expected_results / f"{image_file.stem}.json"
                with open(expected_file) as f:
                    expected = json.load(f)
                
                # Comparer les résultats
                self.assertEqual(
                    bot_result['statistics']['mainboard_count'],
                    expected['statistics']['mainboard_count'],
                    f"Mainboard mismatch for {image_file.name}"
                )
                
                self.assertEqual(
                    bot_result['statistics']['sideboard_count'],
                    expected['statistics']['sideboard_count'],
                    f"Sideboard mismatch for {image_file.name}"
                )
                
                # Vérifier que les cartes sont identiques
                bot_cards = sorted([c['name'] for c in bot_result['cards']])
                expected_cards = sorted([c['name'] for c in expected['cards']])
                
                self.assertEqual(
                    bot_cards,
                    expected_cards,
                    f"Cards mismatch for {image_file.name}"
                )
    
    def process_with_bot(self, image_path):
        """Traiter avec le bot"""
        from services.web_app_ocr import WebAppOCRService
        
        service = WebAppOCRService()
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        result = asyncio.run(service.process_image(image_data))
        return result

# Script pour générer les résultats attendus
def generate_expected_results():
    """
    À exécuter une fois avec la web app pour générer les références
    """
    import requests
    
    test_images = Path('test_images')
    expected_results = Path('expected_results')
    expected_results.mkdir(exist_ok=True)
    
    for image_file in test_images.glob('*.jpg'):
        print(f"Processing {image_file.name}...")
        
        with open(image_file, 'rb') as f:
            response = requests.post(
                'http://localhost:3001/api/ocr/enhanced',
                files={'image': f}
            )
        
        if response.status_code == 200:
            result = response.json()
            
            output_file = expected_results / f"{image_file.stem}.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            
            print(f"✅ Saved expected result for {image_file.name}")
        else:
            print(f"❌ Failed for {image_file.name}")
```

### Monitoring de Divergence

```python
# discord-bot/monitoring/consistency_monitor.py

class ConsistencyMonitor:
    """
    Monitore si le bot diverge de la web app
    """
    
    def __init__(self):
        self.divergences = []
        self.comparison_count = 0
    
    async def compare_with_web_app(self, image_data: bytes, bot_result: dict):
        """
        Compare le résultat du bot avec celui de la web app
        """
        
        # Appeler directement la web app pour comparaison
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field('image', image_data, filename='compare.jpg')
            
            async with session.post(
                f"{API_BASE_URL}/ocr/enhanced",
                data=data
            ) as response:
                if response.status == 200:
                    web_result = await response.json()
                    
                    # Comparer
                    divergence = self.find_divergences(bot_result, web_result)
                    
                    if divergence:
                        self.divergences.append({
                            'timestamp': datetime.now(),
                            'divergence': divergence
                        })
                        
                        # Alerter
                        await self.alert_divergence(divergence)
                    
                    self.comparison_count += 1
    
    def find_divergences(self, bot_result: dict, web_result: dict) -> dict:
        """Trouver les différences"""
        
        divergences = {}
        
        # Comparer les totaux
        if bot_result['statistics']['mainboard_count'] != web_result['statistics']['mainboard_count']:
            divergences['mainboard_count'] = {
                'bot': bot_result['statistics']['mainboard_count'],
                'web': web_result['statistics']['mainboard_count']
            }
        
        if bot_result['statistics']['sideboard_count'] != web_result['statistics']['sideboard_count']:
            divergences['sideboard_count'] = {
                'bot': bot_result['statistics']['sideboard_count'],
                'web': web_result['statistics']['sideboard_count']
            }
        
        return divergences if divergences else None
    
    async def alert_divergence(self, divergence: dict):
        """Alerter en cas de divergence"""
        
        print(f"⚠️ DIVERGENCE DÉTECTÉE: {divergence}")
        
        # Optionnel: envoyer une alerte Discord
        # await send_discord_alert(f"Divergence: {divergence}")
```

## Checklist de Vérification

### Avant le Déploiement

- [ ] L'API web app est accessible depuis le bot
- [ ] Les configurations sont identiques (MIN_RESOLUTION, etc.)
- [ ] Les scripts Python partagés sont copiés/liés
- [ ] Les tests de cohérence passent
- [ ] Le monitoring de divergence est activé

### Configuration à Vérifier

```python
# Vérifier que ces valeurs sont IDENTIQUES

# Web App (enhancedOcrService.ts)
MIN_RESOLUTION = 1200
UPSCALE_FACTOR = 4
MAINBOARD_TARGET = 60
SIDEBOARD_TARGET = 15

# Discord Bot (.env)
MIN_RESOLUTION=1200
UPSCALE_FACTOR=4
MAINBOARD_TARGET=60
SIDEBOARD_TARGET=15
```

### Script de Vérification

```bash
#!/bin/bash
# verify_consistency.sh

echo "🔍 Vérification de la cohérence Web App / Discord Bot"

# Vérifier les configs
WEB_CONFIG=$(grep "MIN_RESOLUTION" server/src/services/enhancedOcrService.ts)
BOT_CONFIG=$(grep "MIN_RESOLUTION" discord-bot/.env)

if [ "$WEB_CONFIG" != "$BOT_CONFIG" ]; then
    echo "❌ Configurations différentes détectées!"
    exit 1
fi

# Vérifier l'API
curl -s http://localhost:3001/api/ocr/enhanced/status > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ API web app non accessible"
    exit 1
fi

echo "✅ Cohérence vérifiée!"
```

---

*Documentation des méthodes OCR partagées*
*Garantit que le bot Discord utilise EXACTEMENT les mêmes méthodes que la web app*