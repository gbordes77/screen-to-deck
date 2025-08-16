#!/usr/bin/env python3
"""
Wrapper EasyOCR fonctionnel pour Node.js
Détecte mainboard ET sideboard correctement
"""

import sys
import json
import base64
import tempfile
import os
import re
import logging
import io
from PIL import Image

# Configuration des logs pour ne pas polluer stdout
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)

try:
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False)
except ImportError:
    print(json.dumps({"mainboard": [], "sideboard": [], "error": "EasyOCR not installed"}))
    sys.exit(1)

def extract_cards_from_text(text_lines):
    """
    Extrait les cartes du texte OCR en détectant mainboard et sideboard
    """
    mainboard = []
    sideboard = []
    is_sideboard = False
    
    # Patterns pour détecter les cartes (basé sur le Discord bot)
    patterns = [
        # Format: "4 Lightning Bolt"
        re.compile(r'^(\d+)\s+(.+?)(?:\s*\([A-Z0-9]+\))?$'),
        # Format: "Lightning Bolt x4"
        re.compile(r'^(.+?)\s+x\s*(\d+)$'),
        # Format: "Lightning Bolt 4"
        re.compile(r'^(.+?)\s+(\d+)$'),
    ]
    
    for line in text_lines:
        if isinstance(line, tuple):
            # EasyOCR retourne des tuples (bbox, text, confidence)
            line = line[1] if len(line) > 1 else str(line)
        
        line = str(line).strip()
        
        # Détecter le début du sideboard - CRITICAL pour MTGA/MTGO
        if any(keyword in line.lower() for keyword in ['sideboard', 'side board', 'side', 'sb', 'reserve']):
            is_sideboard = True
            continue
        
        # Ignorer les lignes non pertinentes
        if not line or len(line) < 3:
            continue
        if any(skip in line.lower() for skip in ['deck', '===', '---', 'total', 'cards']):
            continue
        
        # Essayer de matcher une carte avec différents patterns
        card_found = False
        for pattern in patterns:
            match = pattern.match(line)
            if match:
                # Déterminer quantité et nom selon le pattern
                if pattern == patterns[0]:  # "4 Lightning Bolt"
                    quantity = int(match.group(1))
                    name = match.group(2).strip()
                elif pattern == patterns[1]:  # "Lightning Bolt x4"
                    name = match.group(1).strip()
                    quantity = int(match.group(2))
                else:  # "Lightning Bolt 4"
                    # Vérifier que le dernier élément est bien un nombre
                    try:
                        quantity = int(match.group(2))
                        name = match.group(1).strip()
                    except:
                        continue
                
                # Nettoyer le nom de la carte
                name = re.sub(r'\s+', ' ', name)  # Normaliser les espaces
                name = re.sub(r'[^\w\s,\'-]', '', name)  # Garder seulement caractères valides
                
                # Validation basique
                if name and len(name) > 2 and 0 < quantity <= 20:
                    card = {"name": name, "quantity": quantity}
                    if is_sideboard:
                        sideboard.append(card)
                    else:
                        mainboard.append(card)
                    card_found = True
                    break
        
        # Si aucun pattern ne match mais que ça ressemble à une carte
        if not card_found and len(line) > 3 and not line[0].isdigit():
            # Peut-être juste un nom de carte sans quantité
            name = re.sub(r'\s+', ' ', line)
            name = re.sub(r'[^\w\s,\'-]', '', name)
            if name and len(name) > 2:
                card = {"name": name, "quantity": 1}
                if is_sideboard:
                    sideboard.append(card)
                else:
                    mainboard.append(card)
    
    return mainboard, sideboard

def process_image_with_easyocr(base64_data):
    """
    Traite une image avec EasyOCR
    """
    try:
        # Décoder le base64
        image_data = base64.b64decode(base64_data)
        
        # Créer une image PIL
        image = Image.open(io.BytesIO(image_data))
        
        # Sauvegarder temporairement (EasyOCR a besoin d'un fichier)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name
        
        try:
            # Utiliser EasyOCR pour extraire le texte
            result = reader.readtext(tmp_path)
            
            # Extraire les cartes du texte
            mainboard, sideboard = extract_cards_from_text(result)
            
            # Retourner le résultat
            return {
                "mainboard": mainboard,
                "sideboard": sideboard
            }
            
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        # En cas d'erreur, retourner un résultat vide pour que OpenAI prenne le relais
        return {
            "mainboard": [],
            "sideboard": [],
            "error": str(e)
        }

if __name__ == "__main__":
    if '--stdin-base64' in sys.argv:
        try:
            # Lire l'image base64 depuis stdin
            base64_data = sys.stdin.read().strip()
            
            # Traiter avec EasyOCR
            result = process_image_with_easyocr(base64_data)
            
            # Calculer le total pour vérifier
            total_main = sum(c["quantity"] for c in result["mainboard"])
            total_side = sum(c["quantity"] for c in result["sideboard"])
            
            # Si on a détecté un deck raisonnable, retourner le résultat
            # Sinon, laisser OpenAI prendre le relais
            if total_main >= 40 or (total_main + total_side) >= 50:
                # On a probablement un deck complet ou presque
                print(json.dumps(result))
            else:
                # Pas assez de cartes détectées, laisser OpenAI faire le travail
                print(json.dumps({"mainboard": [], "sideboard": []}))
            
            sys.exit(0)
            
        except Exception as e:
            # En cas d'erreur, retourner JSON vide pour OpenAI
            print(json.dumps({"mainboard": [], "sideboard": []}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "Usage: script.py --stdin-base64"}))
        sys.exit(1)