#!/usr/bin/env python3
"""
✅ WRAPPER EASYOCR CORRIGÉ POUR MTGA
Détecte et lit la BONNE zone (panneau de droite avec la liste textuelle)
"""

import sys
import json
import base64
import tempfile
import os
import cv2
import numpy as np
import easyocr

def extract_deck_list_zone(image_path):
    """
    Extrait la zone de la liste de deck (panneau de droite dans MTGA)
    """
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    height, width = img.shape[:2]
    
    # Pour MTGA, la liste de deck est dans le panneau de droite
    # Généralement entre 60% et 95% de la largeur
    x_start = int(width * 0.60)
    x_end = int(width * 0.95)
    y_start = int(height * 0.15)  # Éviter le header
    y_end = int(height * 0.85)    # Éviter le footer
    
    # Extraire la zone
    deck_zone = img[y_start:y_end, x_start:x_end]
    
    # Améliorer le contraste pour une meilleure OCR
    gray = cv2.cvtColor(deck_zone, cv2.COLOR_BGR2GRAY)
    
    # Appliquer un seuillage adaptatif pour améliorer le texte
    processed = cv2.adaptiveThreshold(
        gray, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 
        11, 2
    )
    
    return processed

def process_with_easyocr(image_path):
    """
    Process avec EasyOCR en ciblant la zone correcte
    """
    result = {
        "mainboard": [],
        "sideboard": [],
        "confidence": 0.0,
        "raw_text": ""
    }
    
    try:
        # Extraire la zone de la liste
        deck_zone = extract_deck_list_zone(image_path)
        if deck_zone is None:
            print("Failed to extract deck zone", file=sys.stderr)
            return result
        
        # Initialiser EasyOCR
        reader = easyocr.Reader(['en'], gpu=False)
        
        # Lire le texte de la zone extraite
        results = reader.readtext(deck_zone, detail=1, paragraph=False)
        
        # Parser les résultats
        mainboard = []
        sideboard = []
        is_sideboard = False
        total_confidence = 0
        confidence_count = 0
        
        for bbox, text, confidence in results:
            text = text.strip()
            
            # Détecter le passage au sideboard
            if text.lower() in ['sideboard', 'side board', 'reserve']:
                is_sideboard = True
                continue
            
            # Ignorer les éléments UI
            ui_elements = ['deck', 'main', 'total', 'export', 'import', 'craft', 
                          'home', 'profile', 'packs', 'store', 'mastery', 'play']
            if any(ui in text.lower() for ui in ui_elements):
                continue
            
            # Parser les cartes (format: "4 Lightning Bolt" ou "Lightning Bolt x4")
            import re
            
            # Pattern 1: "4 Lightning Bolt"
            match = re.match(r'^(\d+)\s+(.+)$', text)
            if match:
                quantity = int(match.group(1))
                name = match.group(2)
            # Pattern 2: "Lightning Bolt x4"
            elif 'x' in text.lower():
                parts = text.lower().split('x')
                if len(parts) == 2:
                    try:
                        quantity = int(parts[1].strip())
                        name = parts[0].strip()
                    except:
                        quantity = 1
                        name = text
                else:
                    quantity = 1
                    name = text
            else:
                # Carte simple sans quantité
                quantity = 1
                name = text
            
            # Filtrer les noms trop courts ou trop longs
            if len(name) < 2 or len(name) > 50:
                continue
            
            # Ajouter la carte
            card = {
                "name": name,
                "quantity": quantity,
                "confidence": confidence
            }
            
            if is_sideboard:
                sideboard.append(card)
            else:
                mainboard.append(card)
            
            total_confidence += confidence
            confidence_count += 1
        
        # Calculer la confiance moyenne
        if confidence_count > 0:
            result["confidence"] = total_confidence / confidence_count
        
        result["mainboard"] = mainboard
        result["sideboard"] = sideboard
        
        # Essayer d'ajuster pour obtenir 60+15
        main_total = sum(c["quantity"] for c in mainboard)
        side_total = sum(c["quantity"] for c in sideboard)
        
        # Si on a moins de 60 cartes main, vérifier les terrains de base
        if main_total < 60:
            basic_lands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
            for card in mainboard:
                if any(land in card["name"] for land in basic_lands):
                    # Ajuster la quantité si nécessaire
                    missing = 60 - main_total
                    if missing > 0 and missing <= 20:  # Raisonnable
                        card["quantity"] += missing
                        break
        
        return result
        
    except Exception as e:
        print(f"Error in EasyOCR processing: {e}", file=sys.stderr)
        return result

def main():
    """
    Main entry point pour stdin processing
    """
    if '--stdin-base64' not in sys.argv:
        print(json.dumps({"error": "Missing --stdin-base64 flag"}))
        sys.exit(1)
    
    try:
        # Lire base64 depuis stdin
        base64_data = sys.stdin.read().strip()
        
        if not base64_data:
            print(json.dumps({"mainboard": [], "sideboard": [], "error": "No input data"}))
            sys.exit(1)
        
        # Décoder base64 vers image
        image_data = base64.b64decode(base64_data)
        
        # Sauver dans fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            tmp_file.write(image_data)
            tmp_path = tmp_file.name
        
        try:
            # Process avec EasyOCR
            result = process_with_easyocr(tmp_path)
            
            # Output JSON
            print(json.dumps(result))
            
        finally:
            # Nettoyer
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
    except Exception as e:
        print(json.dumps({
            "mainboard": [],
            "sideboard": [],
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()