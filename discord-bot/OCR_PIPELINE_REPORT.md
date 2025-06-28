# Problématique actuelle et historique des tests

**Problème principal :**
- Malgré un pipeline OCR robuste et une validation Scryfall avancée, le main deck n'est pas toujours détecté (zones mal alignées, bruit OCR, etc.), alors que le sideboard l'est parfaitement.

**Tout ce qui a été testé :**
- Ajustement manuel et automatique des zones main/side (coordonnées, largeur, hauteur)
- Morphologie, seuillage, aspect ratio, whitelist Tesseract
- Debug visuel (rectangles, contours, logs ligne par ligne, texte OCR sur l'image)
- Filtrage regex, post-traitement, fusion des colonnes
- OCR global (toute l'image)
- OCR par zones fixes (main_left, main_right, sideboard)
- OCR avec auto-détection de colonnes (projection verticale)
- OCR avec ajustement manuel via éditeur web interactif
- Validation/correction Scryfall sur chaque ligne (fuzzy, suggestions, batch)
- Exports et analyse avancée (format, stats, légalité, prix)

**Constats :**
- Le sideboard est détecté à 100% (preuve que le pipeline fonctionne)
- Le main deck est partiellement ou mal détecté selon le screenshot
- Les exports et l'analyse fonctionnent si la détection est bonne

**Ce qu'on attend de l'expert :**
- Une méthode universelle pour découper les zones main/side sur tous les layouts Arena
- Des conseils pour améliorer la robustesse de l'OCR sur du bruit/règles
- Des suggestions pour fiabiliser la séparation main/side et la validation des lignes

---

# Rapport d'État du Projet – Screen To Deck (STD)

## 1. Résumé du workflow utilisateur

- L'utilisateur envoie une capture d'écran de deck MTG sur Discord.
- Le bot détecte l'image, réagit avec 📷, propose l'analyse (emoji ou commande `/scan`).
- L'analyse retourne :
  - Liste de cartes (main/side séparés)
  - Exports (formats variés)
  - Analyse avancée (stats, format, couleur, prix, légalité)
  - Gestion des erreurs et logs détaillés

## 2. Architecture technique

- **Bot Discord (Pycord)** : gestion des commandes, réactions, téléchargements d'images.
- **OCR (OpenCV + Tesseract)** : découpe zones main/side, morphologie, seuillage, extraction ligne par ligne.
- **Parsing** : patterns robustes (quantité, nom, etc.), nettoyage, détection main/side.
- **Validation Scryfall** : fuzzy, suggestions, auto-correction, batch, scoring de confiance.
- **Analyse** : format, stats, couleur, prix, légalité, export multi-format.
- **Logs** : détaillés à chaque étape (OCR, parsing, validation, analyse).

## 3. Points forts

- Pipeline OCR robuste (zones, morphologie, debug visuel possible)
- Parsing intelligent (plusieurs patterns, nettoyage, détection main/side)
- Validation Scryfall avancée (fuzzy, suggestions, auto-correction, batch)
- Intégration Discord complète (emoji, slash, feedback utilisateur)
- Exports et analyse avancée (format, stats, légalité, prix)
- Logs et gestion d'erreur (pour debug rapide)

## 4. Limites et problèmes rencontrés

- Qualité du screenshot : images floues ou compressées → OCR bruité
- Zones main/side parfois à ajuster selon le layout Arena
- Noms de cartes exotiques ou nouveaux : validation Scryfall peut échouer
- Séparation main/side parfois imparfaite si le layout change
- Logs : parfois trop verbeux ou pas assez explicites sur l'échec d'une ligne
- Fichiers de logs non générés si le bot n'a pas démarré correctement

## 5. Exemples de logs / résultats

```
2025-06-28 13:06:56,416 - ocr_parser - INFO - [ArenaOCR] main_left line 0: 'y Creature - Cat Nightmare'
2025-06-28 13:06:56,484 - ocr_parser - INFO - [ArenaOCR] main_left line 1: 'on - Each permanent card in'
2025-06-28 13:06:56,685 - ocr_parser - INFO - [ArenaOCR] main_right line 0: 'y Ghosts'
2025-06-28 13:06:56,742 - ocr_parser - INFO - [ArenaOCR] sideboard line 0: ''
2025-06-28 13:06:57,871 - ocr_parser - INFO - ✅ Main deck: 5 cartes
2025-06-28 13:06:57,871 - ocr_parser - INFO - ✅ Sideboard: 8 cartes
2025-06-28 13:06:57,872 - ocr_parser - INFO - Parsed 7 unique cards from 13 lines
2025-06-28 13:06:57,872 - scryfall_service - INFO - [Scryfall] search_card_exact: name='Y Creature Cat Nightmare' (param exact)
2025-06-28 13:06:58,139 - scryfall_service - INFO - [Scryfall] search_card_exact: response for 'Y Ghosts': None
```

## 6. Code clé (extraits)

### a) Pipeline OCR (extrait)
```python
def process_screenshot_safe(self, image_path):
    image = cv2.imread(image_path)
    # ... découpe zones, morphologie, seuillage ...
    # ... extraction ligne par ligne ...
    return {"main": main_cards, "side": side_cards, "stats": stats}
```

### b) Parsing et validation Scryfall (extrait)
```python
async def parse_deck_image(self, image_path: str, language: str = 'en', format_hint: str = None) -> ParseResult:
    extracted_lines = self.extract_text_from_image(image_path)
    parsed_cards = await self._parse_cards_enhanced(extracted_lines, language)
    validated_cards = await self._validate_cards_batch(parsed_cards, language)
    format_analysis = await self._analyze_deck_comprehensive(validated_cards, format_hint)
    return ParseResult(cards=validated_cards, format_analysis=format_analysis, ...)
```

### c) Recherche fuzzy/correction Scryfall (extrait)
```python
async def enhanced_card_search(self, card_name: str, lang: str = 'en') -> CardMatch:
    # ... exact, correction OCR, fuzzy, suggestions ...
    return CardMatch(...)
```

## 7. Prochaines pistes d'amélioration / questions à l'expert

- Comment améliorer la robustesse de l'OCR sur des images floues ou compressées ?
- Quelle stratégie recommander pour l'auto-détection des zones main/side sur des layouts Arena différents ?
- Faut-il enrichir la base de validation Scryfall (ex : noms alternatifs, tokens, promos) ?
- Conseils pour améliorer la séparation main/side de façon universelle ?
- Recommandations pour des logs plus exploitables (succès/échec ligne par ligne, stats globales, etc.) ?

---

**Fichier généré : `discord-bot/OCR_PIPELINE_REPORT.md`**

**Contact : @Holdrin / guillaumebordes**

**Pour le code complet, voir les fichiers : ocr_parser.py, bot.py, scryfall_service.py dans le repo.**

# Annexe : Code source du projet par module

Chaque module interagit via des appels directs : `bot.py` orchestre le workflow utilisateur et appelle `MTGOCRParser` (dans `ocr_parser.py`) pour l'OCR et le parsing, qui lui-même utilise `ScryfallService` (dans `scryfall_service.py`) pour la validation/correction des cartes et l'analyse avancée. Les exports sont gérés par `export_deck.py`. Le code complet est disponible dans le dépôt Git.

## 1. bot.py (Discord & orchestration)
```python
# ... Début du fichier bot.py ...
#!/usr/bin/env python3
"""
🃏 Enhanced MTG Deck Scanner Discord Bot - Phase 1
Integrates with enhanced Scryfall service for intelligent deck scanning
Now with automatic correction, format detection, and comprehensive analysis
"""

import os
import asyncio
import logging
import tempfile
from io import BytesIO
from typing import Optional, List, Dict, Any
import json

import discord
from discord.ext import commands
import aiohttp
from PIL import Image
import requests
from dotenv import load_dotenv

from ocr_parser import MTGOCRParser, ParseResult, ParsedCard
from scryfall_service import ScryfallService, DeckAnalysis

# ... (voir le dépôt pour le code complet, 670 lignes) ...
```

## 2. ocr_parser.py (OCR, parsing, validation)
```python
# ... Début du fichier ocr_parser.py ...
#!/usr/bin/env python3
"""
🔍 Enhanced MTG OCR Parser - Phase 1
Advanced OCR processing with intelligent Scryfall integration
Now with automatic correction, format detection, and confidence scoring
"""

import cv2
import numpy as np
import pytesseract
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import asyncio
import tempfile
import os

@dataclass
class ParsedCard:
    name: str
    quantity: int
    original_text: str
    confidence: float
    is_validated: bool
    correction_applied: bool
    scryfall_data: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None

# ... (voir le dépôt pour le code complet, 801 lignes) ...
```

## 3. scryfall_service.py (Scryfall, correction, analyse)
```python
# ... Début du fichier scryfall_service.py ...
#!/usr/bin/env python3
"""
🃏 Scryfall API Service - Phase 1 Enhanced
Interface with Scryfall API for MTG card validation and data enrichment
Now with intelligent card correction, format detection, and advanced validation
"""

import asyncio
import aiohttp
import logging
import time
import re
import json
from typing import Dict, List, Optional, Any, Tuple, Set
from urllib.parse import quote
from fuzzywuzzy import fuzz
from datetime import datetime, timedelta
from dataclasses import dataclass
import csv

@dataclass
class CardMatch:
    original_name: str
    matched_name: str
    confidence: float
    card_data: Dict[str, Any]
    suggestions: List[str] = None
    correction_applied: bool = False

# ... (voir le dépôt pour le code complet, 922 lignes) ...
```

## 4. export_deck.py (Exports)
```python
import csv
import json
from typing import List, Tuple

# Exemple de deck avec set (à remplacer par l'import réel)
DECK = [
    ("Lightning Bolt", 4, "2XM"),
    ("Counterspell", 2, "MH2"),
]
SIDEBOARD = [
    ("Surgical Extraction", 2, "NPH"),
]

def export_csv(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export.csv"):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["section", "name", "quantity", "set"])
        for name, qty, set_code in deck:
            writer.writerow(["main", name, qty, set_code])
        for name, qty, set_code in sideboard:
            writer.writerow(["sideboard", name, qty, set_code])
    print(f"Exporté en CSV : {path}")

def export_json(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export.json"):
    data = {
        "main": [{"name": n, "quantity": q, "set": s} for n, q, s in deck],
        "sideboard": [{"name": n, "quantity": q, "set": s} for n, q, s in sideboard],
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Exporté en JSON : {path}")

def export_moxfield(deck: List[Tuple[str, int, str]], sideboard: List[Tuple[str, int, str]], path="deck_export_moxfield.txt"):
    with open(path, "w") as f:
        for name, qty, set_code in deck:
            f.write(f"{qty}x {name} ({set_code})\n")
        f.write("\nSideboard\n")
        for name, qty, set_code in sideboard:
            f.write(f"{qty}x {name} ({set_code})\n")
    print(f"Exporté en Moxfield : {path}")

if __name__ == "__main__":
    export_csv(DECK, SIDEBOARD)
    export_json(DECK, SIDEBOARD)
    export_moxfield(DECK, SIDEBOARD) 
```

## 5. requirements.txt (Dépendances)
```
# Enhanced MTG Discord Scanner - Requirements
# Phase 1 with intelligent Scryfall integration

discord.py>=2.3.0
py-cord>=2.4.1

aiohttp>=3.8.0
opencv-python>=4.9.0
pytesseract>=0.3.10
Pillow>=9.0.0
numpy>=1.24.0
fuzzywuzzy>=0.18.0
python-Levenshtein>=0.21.0
dataclasses>=0.6; python_version < "3.7"
python-dotenv>=1.0.0
requests>=2.28.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.0.0
flake8>=6.0.0
memory-profiler>=0.61.0
# ...
``` 