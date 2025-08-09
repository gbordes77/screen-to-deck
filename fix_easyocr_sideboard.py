#!/usr/bin/env python3
"""
Fix EasyOCR pour mieux lire le sideboard
"""
import cv2
import easyocr
import numpy as np
from PIL import Image

def preprocess_sideboard(image_path):
    """Prétraitement spécifique pour le sideboard (panneau droit)"""
    print("🔧 Prétraitement de l'image...")
    
    # Charger l'image
    img = cv2.imread(image_path)
    height, width = img.shape[:2]
    
    # CROP : Extraire uniquement le panneau droit (sideboard)
    # Le sideboard est à droite, environ 30% de la largeur
    x_start = int(width * 0.65)  # Commence à 65% de la largeur
    cropped = img[:, x_start:]
    
    print(f"  ✂️ Crop: {cropped.shape}")
    cv2.imwrite('/tmp/sideboard_crop.png', cropped)
    
    # Convertir en niveaux de gris
    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    
    # AGRANDIR l'image pour améliorer la lisibilité
    scale_factor = 3
    new_width = int(cropped.shape[1] * scale_factor)
    new_height = int(cropped.shape[0] * scale_factor)
    resized = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
    print(f"  🔍 Resize: {resized.shape}")
    
    # Améliorer le contraste
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced = clahe.apply(resized)
    
    # Binarisation adaptative
    binary = cv2.adaptiveThreshold(
        enhanced, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 
        11, 2
    )
    
    # Inversion si nécessaire (texte blanc sur fond noir)
    mean_val = np.mean(binary)
    if mean_val > 127:  # Plus de blanc que de noir
        binary = cv2.bitwise_not(binary)
    
    # Sauvegarder pour debug
    cv2.imwrite('/tmp/sideboard_processed.png', binary)
    print("  💾 Image prétraitée sauvegardée: /tmp/sideboard_processed.png")
    
    return binary, resized

def extract_sideboard_cards(image_path):
    """Extraire les cartes du sideboard avec EasyOCR"""
    
    # Prétraiter l'image
    processed, grayscale = preprocess_sideboard(image_path)
    
    # Initialiser EasyOCR
    print("\n🤖 Initialisation EasyOCR...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    # OCR sur l'image prétraitée
    print("🔍 Analyse OCR en cours...")
    results = reader.readtext(grayscale)
    
    print(f"\n✅ {len(results)} éléments détectés")
    
    # Filtrer et organiser les résultats
    cards = []
    for bbox, text, conf in results:
        # Nettoyer le texte
        text = text.strip()
        
        # Ignorer les textes trop courts ou les nombres seuls
        if len(text) < 3 or text.isdigit():
            continue
            
        # Chercher les patterns de quantité (1x, x1, (1), etc.)
        quantity = 1
        card_name = text
        
        # Pattern: "1x Card" ou "Card x1"
        if 'x' in text.lower():
            parts = text.split('x')
            if len(parts) == 2:
                if parts[0].strip().isdigit():
                    quantity = int(parts[0].strip())
                    card_name = parts[1].strip()
                elif parts[1].strip().isdigit():
                    quantity = int(parts[1].strip())
                    card_name = parts[0].strip()
        
        # Pattern: "(1) Card"
        elif text.startswith('(') and ')' in text:
            try:
                end_paren = text.index(')')
                qty_str = text[1:end_paren]
                if qty_str.isdigit():
                    quantity = int(qty_str)
                    card_name = text[end_paren+1:].strip()
            except:
                pass
        
        if card_name and len(card_name) > 2:
            cards.append({
                'name': card_name,
                'quantity': quantity,
                'confidence': conf,
                'position': bbox[0][1]  # Position Y pour trier
            })
    
    # Trier par position verticale
    cards.sort(key=lambda x: x['position'])
    
    return cards

# Test
if __name__ == "__main__":
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/image.webp"
    
    print("="*60)
    print("🎯 EXTRACTION DU SIDEBOARD MTG")
    print("="*60)
    
    cards = extract_sideboard_cards(image_path)
    
    print("\n📋 CARTES DU SIDEBOARD:")
    print("-"*40)
    
    if cards:
        for i, card in enumerate(cards, 1):
            conf_emoji = "✅" if card['confidence'] > 0.8 else "⚠️" if card['confidence'] > 0.5 else "❌"
            print(f"{i:2}. {conf_emoji} {card['quantity']}x {card['name']} (conf: {card['confidence']:.2%})")
    else:
        print("❌ Aucune carte détectée")
    
    # Format JSON pour export
    print("\n📤 FORMAT JSON:")
    import json
    output = {
        "sideboard": [
            {"name": c['name'], "quantity": c['quantity']} 
            for c in cards
        ]
    }
    print(json.dumps(output, indent=2))
    
    print("\n💡 Images de debug sauvegardées:")
    print("  • /tmp/sideboard_crop.png (zone extraite)")
    print("  • /tmp/sideboard_processed.png (après prétraitement)")