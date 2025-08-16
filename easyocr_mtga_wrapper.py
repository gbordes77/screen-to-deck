#!/usr/bin/env python3
"""
Wrapper EasyOCR optimisé pour MTGA
Comprend que les quantités (x4, x3) sont séparées des noms de cartes
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

def process_mtga_ocr_results(results):
    """
    Traite les résultats EasyOCR pour MTGA
    Comprend que les quantités sont souvent séparées des noms
    """
    mainboard = []
    sideboard = []
    
    # Filtrer les éléments UI évidents
    ui_elements = {
        'home', 'profile', 'decks', 'packs', 'store', 'mastery',
        'search', 'searcha', 'craft', 'play', 'settings',
        'green dev', 'red aggro', 'blue control', 'historic', 'standard'
    }
    
    # Dans MTGA, "Sideboard" est un titre de colonne, pas un séparateur dans la liste
    # Les cartes APRÈS "Sideboard" dans l'ordre de lecture sont le mainboard !
    # Le sideboard est dans une colonne séparée à droite
    
    sideboard_index = -1
    for i, (bbox, text, confidence) in enumerate(results):
        if text.lower().strip() == 'sideboard':
            sideboard_index = i
            break
    
    # Collecter les textes avec leurs positions
    texts_with_pos = []
    for bbox, text, confidence in results:
        # Ignorer les éléments UI
        text_lower = text.lower().strip()
        if any(ui in text_lower for ui in ui_elements):
            continue
        
        # Position approximative (x, y)
        x = bbox[0][0]  # Coin supérieur gauche x
        y = bbox[0][1]  # Coin supérieur gauche y
        
        texts_with_pos.append({
            'text': text.strip(),
            'x': x,
            'y': y,
            'confidence': confidence
        })
    
    # Trier par position verticale puis horizontale
    texts_with_pos.sort(key=lambda t: (t['y'], t['x']))
    
    # Regrouper les éléments proches verticalement (même ligne)
    lines = []
    current_line = []
    last_y = -1
    y_threshold = 30  # Pixels de tolérance verticale
    
    for item in texts_with_pos:
        if last_y == -1 or abs(item['y'] - last_y) <= y_threshold:
            current_line.append(item)
            last_y = item['y']
        else:
            if current_line:
                # Trier la ligne par position horizontale
                current_line.sort(key=lambda t: t['x'])
                lines.append(current_line)
            current_line = [item]
            last_y = item['y']
    
    if current_line:
        current_line.sort(key=lambda t: t['x'])
        lines.append(current_line)
    
    # Analyser chaque ligne pour trouver des cartes
    for line in lines:
        # Joindre les éléments de la ligne
        line_text = ' '.join([item['text'] for item in line])
        
        # Patterns pour détecter les cartes avec quantités
        # Pattern 1: quantité au début (4 Lightning Bolt)
        match = re.match(r'^(\d+)\s+(.+)$', line_text)
        if match:
            quantity = int(match.group(1))
            name = match.group(2)
            # Vérifier que ce n'est pas "60/60 Cards" ou similaire
            if 'cards' not in name.lower() and quantity <= 20:
                card = {'name': name, 'quantity': quantity}
                # Déterminer si c'est mainboard ou sideboard basé sur la position X
                # Dans MTGA, le sideboard est généralement à droite (x > 1400 environ)
                avg_x = sum(item['x'] for item in line) / len(line)
                if avg_x > 1400:  # Ajuster ce seuil selon la résolution
                    sideboard.append(card)
                else:
                    mainboard.append(card)
                continue
        
        # Pattern 2: quantité à la fin (Lightning Bolt x4)
        match = re.match(r'^(.+?)\s+x?(\d+)$', line_text)
        if match:
            name = match.group(1)
            quantity = int(match.group(2))
            if quantity <= 20:
                card = {'name': name, 'quantity': quantity}
                avg_x = sum(item['x'] for item in line) / len(line)
                if avg_x > 1400:
                    sideboard.append(card)
                else:
                    mainboard.append(card)
                continue
        
        # Pattern 3: chercher x4, x3, etc. comme élément séparé
        quantity = 0
        name = None
        for i, item in enumerate(line):
            text = item['text']
            # Chercher les patterns de quantité
            if re.match(r'^x?\d+$', text.lower()):
                quantity = int(re.sub(r'[^0-9]', '', text))
            elif re.match(r'^\d+x$', text.lower()):
                quantity = int(re.sub(r'[^0-9]', '', text))
            # Si ce n'est pas une quantité et qu'on a une confidence décente
            elif item['confidence'] > 0.3 and len(text) > 2:
                # Ignorer les mots qui sont clairement des règles
                if not any(word in text.lower() for word in [
                    'has', 'hexproof', 'untapped', 'add', 'mana', 'draw',
                    'creature', 'spell', 'target', 'control', 'battlefield'
                ]):
                    name = text
        
        if name and quantity > 0 and quantity <= 20:
            card = {'name': name, 'quantity': quantity}
            # Utiliser la position moyenne pour déterminer mainboard/sideboard
            avg_x = sum(item['x'] for item in line) / len(line)
            if avg_x > 1400:
                sideboard.append(card)
            else:
                mainboard.append(card)
        elif name and quantity == 0:
            # Carte sans quantité visible, assumer 1
            card = {'name': name, 'quantity': 1}
            avg_x = sum(item['x'] for item in line) / len(line)
            if avg_x > 1400:
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
            
            # Traiter les résultats spécifiquement pour MTGA
            mainboard, sideboard = process_mtga_ocr_results(result)
            
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
            
            # Log pour debug (vers stderr pour ne pas polluer stdout)
            sys.stderr.write(f"Detected: {total_main} mainboard, {total_side} sideboard\n")
            
            # Retourner le résultat même si incomplet
            # Mieux vaut des données partielles que rien
            print(json.dumps(result))
            
            sys.exit(0)
            
        except Exception as e:
            # En cas d'erreur, retourner JSON vide pour OpenAI
            sys.stderr.write(f"Error: {str(e)}\n")
            print(json.dumps({"mainboard": [], "sideboard": []}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "Usage: script.py --stdin-base64"}))
        sys.exit(1)