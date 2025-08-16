#!/usr/bin/env python3
"""
Wrapper EasyOCR intelligent avec filtrage des éléments UI
Ignore automatiquement les textes qui ne sont PAS des cartes MTG
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

# LISTE NOIRE - Textes de l'interface MTGA/MTGO à ignorer
UI_BLACKLIST = {
    # Mots qui ne sont JAMAIS des cartes
    'long', 'as', 'its', 'untapped', 'amount', 'equal', 'your', 'control',
    'blocks', 'add', 'create', 'token', 'enters', 'battlefield', 'under',
    'whenever', 'target', 'permanent', 'creature', 'spell', 'ability',
    'controller', 'owner', 'player', 'opponent', 'turn', 'phase', 'step',
    'beginning', 'end', 'combat', 'damage', 'life', 'card', 'cards',
    'draw', 'discard', 'exile', 'library', 'graveyard', 'hand',
    'tapped', 'untap', 'tap', 'mana', 'color', 'colorless', 'any',
    'each', 'all', 'other', 'another', 'that', 'this', 'those', 'these',
    'may', 'must', 'can', 'cannot', 'would', 'could', 'should',
    'instead', 'unless', 'until', 'if', 'when', 'where', 'then',
    'or', 'and', 'but', 'not', 'only', 'also', 'more', 'less',
    'than', 'equal', 'greater', 'fewer', 'most', 'least', 'same',
    'different', 'legendary', 'basic', 'snow', 'artifact', 'enchantment',
    'planeswalker', 'instant', 'sorcery', 'tribal', 'world',
    # Interface MTGA
    'home', 'profile', 'packs', 'store', 'mastery', 'play', 'decks',
    'settings', 'craft', 'search', 'searcha', 'collection', 'deck builder',
    'import', 'export', 'save', 'cancel', 'confirm', 'close', 'back',
    'next', 'previous', 'done', 'edit', 'delete', 'duplicate', 'rename',
    'filter', 'sort', 'view', 'options', 'preferences', 'account',
    'logout', 'exit', 'quit', 'help', 'tutorial', 'guide', 'news',
    'events', 'rewards', 'quests', 'daily', 'weekly', 'season',
    'rank', 'ladder', 'mythic', 'diamond', 'platinum', 'gold', 'silver', 'bronze',
    'standard', 'historic', 'explorer', 'alchemy', 'brawl', 'draft', 'sealed',
    'best of three', 'best of one', 'bo1', 'bo3', 'sideboard only',
    'main deck', 'companion', 'commander', 'learn more', 'get started',
    'submit', 'ready', 'waiting', 'loading', 'connecting', 'disconnected',
    'victory', 'defeat', 'draw', 'concede', 'timeout', 'turn', 'phase',
    'untap', 'upkeep', 'draw step', 'main phase', 'combat', 'end step',
    'priority', 'stack', 'trigger', 'response', 'pass', 'resolve',
    'attack', 'block', 'damage', 'life', 'mana', 'library', 'graveyard',
    'exile', 'battlefield', 'hand', 'mulligan', 'keep', 'shuffle',
    # Dates et crédits
    'january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    '2023', '2024', '2025', '2026', 'wizards', 'hasbro', 'copyright',
    # Interface MTGO
    'file', 'game', 'buddies', 'clan', 'trade', 'chat', 'marketplace',
    'limited', 'constructed', 'casual', 'tournament', 'league', 'queue',
    'open play', 'tournament practice', 'new deck', 'load deck', 'save deck',
    'print', 'clear', 'undo', 'redo', 'zoom', 'actual size',
    # Formats et labels
    'green dev', 'red aggro', 'blue control', 'white weenie', 'black midrange',
    'deck name', 'format', 'legal', 'not legal', 'banned', 'restricted',
    'total', 'cards', 'lands', 'creatures', 'spells', 'artifacts', 'enchantments',
    'planeswalkers', 'instants', 'sorceries', 'curve', 'colors', 'stats',
    # Noms de développeurs/artistes souvent mal détectés
    'chris', 'rana', 'jnab', 'gregory', 'park', 'richard', 'garfield'
}

# LISTE BLANCHE - Mots qui indiquent probablement une vraie carte
CARD_INDICATORS = {
    # Types de cartes
    'creature', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker', 'land',
    # Mots-clés de capacités
    'flying', 'trample', 'haste', 'vigilance', 'deathtouch', 'lifelink', 'hexproof',
    'menace', 'reach', 'defender', 'flash', 'first strike', 'double strike',
    'indestructible', 'protection', 'shroud', 'ward', 'prowess',
    # Actions communes
    'destroy', 'counter', 'exile', 'return', 'create', 'draw', 'discard', 'sacrifice',
    'tap', 'untap', 'target', 'deal', 'gain', 'lose', 'search', 'reveal', 'put',
    # Noms de terrains basiques (toujours valides)
    'plains', 'island', 'swamp', 'mountain', 'forest',
    'snow-covered', 'wastes'
}

def is_ui_element(text):
    """
    Détermine si un texte est un élément de l'UI (pas une carte)
    """
    text_lower = text.lower().strip()
    
    # Ignorer les textes très courts (sauf chiffres pour quantités)
    if len(text_lower) < 3 and not text_lower.isdigit():
        return True
    
    # Ignorer si dans la blacklist
    for ui_word in UI_BLACKLIST:
        if ui_word in text_lower:
            return True
    
    # Si contient des indicateurs de carte, probablement valide
    for card_word in CARD_INDICATORS:
        if card_word in text_lower:
            return False
    
    # Ignorer les textes qui sont clairement du flavor text ou des règles
    if any(phrase in text_lower for phrase in [
        'enters the battlefield', 'when', 'whenever', 'at the beginning',
        'end of turn', 'your turn', 'opponent', 'you control', 'target player'
    ]):
        return True
    
    # Si ressemble à un nom propre (commence par majuscule), probablement une carte
    if text and text[0].isupper() and len(text) > 4:
        return False
    
    return False

def clean_card_name(name):
    """
    Nettoie le nom d'une carte
    """
    # Enlever les caractères bizarres mais garder apostrophes et virgules
    name = re.sub(r'[^\w\s,\'-]', '', name)
    # Normaliser les espaces
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def extract_cards_from_text(text_lines):
    """
    Extrait les cartes du texte OCR en filtrant les éléments UI
    """
    mainboard = []
    sideboard = []
    is_sideboard = False
    
    # Patterns pour détecter les cartes
    patterns = [
        # Format: "4 Lightning Bolt" ou "4x Lightning Bolt"
        re.compile(r'^(\d+)x?\s+(.+?)$'),
        # Format: "Lightning Bolt x4"
        re.compile(r'^(.+?)\s+x\s*(\d+)$'),
        # Format: "Lightning Bolt 4" (mais attention aux faux positifs)
        re.compile(r'^(.+?)\s+(\d+)$'),
    ]
    
    for line in text_lines:
        if isinstance(line, tuple):
            # EasyOCR retourne des tuples (bbox, text, confidence)
            text = line[1] if len(line) > 1 else str(line)
            confidence = line[2] if len(line) > 2 else 0.5
        else:
            text = str(line)
            confidence = 0.5
        
        text = text.strip()
        
        # Ignorer si c'est un élément UI
        if is_ui_element(text):
            continue
        
        # Détecter le début du sideboard - SEULEMENT si c'est clairement un label
        if text.lower().strip() in ['sideboard', 'side board', 'side', 'sb'] and len(text) < 15:
            is_sideboard = True
            continue
        
        # Ignorer les lignes vides ou trop courtes
        if not text or len(text) < 3:
            continue
        
        # Essayer de matcher une carte avec différents patterns
        card_found = False
        for pattern in patterns:
            match = pattern.match(text)
            if match:
                # Déterminer quantité et nom selon le pattern
                if pattern == patterns[0]:  # "4 Lightning Bolt"
                    try:
                        quantity = int(match.group(1))
                        name = match.group(2).strip()
                    except:
                        continue
                elif pattern == patterns[1]:  # "Lightning Bolt x4"
                    name = match.group(1).strip()
                    try:
                        quantity = int(match.group(2))
                    except:
                        continue
                else:  # "Lightning Bolt 4"
                    # Vérifier que le dernier élément est bien un nombre petit
                    try:
                        quantity = int(match.group(2))
                        if quantity > 20:  # Probablement pas une quantité
                            continue
                        name = match.group(1).strip()
                    except:
                        continue
                
                # Vérifier que ce n'est pas un élément UI
                if is_ui_element(name):
                    continue
                
                # Nettoyer le nom
                name = clean_card_name(name)
                
                # Validation finale
                if name and len(name) > 2 and 0 < quantity <= 20:
                    # Ignorer si confidence trop basse ET nom suspect
                    if confidence < 0.3 and len(name) < 5:
                        continue
                    
                    card = {"name": name, "quantity": quantity}
                    if is_sideboard:
                        sideboard.append(card)
                    else:
                        mainboard.append(card)
                    card_found = True
                    break
        
        # Si aucun pattern ne match mais haute confidence et ressemble à un nom de carte
        if not card_found and confidence > 0.7 and len(text) > 4:
            # Vérifier que ce n'est pas un élément UI
            if not is_ui_element(text):
                name = clean_card_name(text)
                if name and len(name) > 3:
                    # Probablement une carte sans quantité
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
            
            # Extraire les cartes du texte avec filtrage intelligent
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
            
            # Log pour debug (vers stderr pour ne pas polluer stdout)
            sys.stderr.write(f"Detected: {total_main} mainboard, {total_side} sideboard\n")
            
            # Si on a détecté au moins quelques cartes, retourner le résultat
            # Mieux vaut des résultats partiels d'EasyOCR que OpenAI qui détecte l'UI
            if total_main >= 1 or total_side >= 10 or (total_main + total_side) >= 15:
                # On a détecté des cartes, utilisons ce résultat
                print(json.dumps(result))
            else:
                # Vraiment aucune carte détectée, laisser OpenAI essayer
                print(json.dumps({"mainboard": [], "sideboard": []}))
            
            sys.exit(0)
            
        except Exception as e:
            # En cas d'erreur, retourner JSON vide pour OpenAI
            sys.stderr.write(f"Error: {str(e)}\n")
            print(json.dumps({"mainboard": [], "sideboard": []}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "Usage: script.py --stdin-base64"}))
        sys.exit(1)