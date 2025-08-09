#!/usr/bin/env python3
"""
Test final combinant EasyOCR avec corrections Fuzzy Matching
"""
import cv2
import easyocr
import numpy as np
from fuzzywuzzy import fuzz, process
import json

# Liste des vraies cartes MTG communes (pour le fuzzy matching)
KNOWN_CARDS = [
    "Devout Decree", "Faerie Mastermind", "Tishana's Tidebinder",
    "Rest in Peace", "Negate", "Kaito's Pursuit", 
    "Gix, Yawgmoth Praetor", "Overlord of the Mistmoors",
    "Lightning Bolt", "Counterspell", "Path to Exile",
    "Thoughtseize", "Fatal Push", "Teferi, Time Raveler"
]

def preprocess_for_ocr(image_path):
    """Prétraitement optimisé pour MTG Arena/MTGO screenshots"""
    img = cv2.imread(image_path)
    height, width = img.shape[:2]
    
    # Extraire le sideboard (partie droite)
    x_start = int(width * 0.65)
    cropped = img[:, x_start:]
    
    # Agrandir 2x pour meilleure lisibilité
    scale = 2
    new_w = int(cropped.shape[1] * scale)
    new_h = int(cropped.shape[0] * scale)
    resized = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    
    # Convertir en gris
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Améliorer contraste
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    return enhanced, resized

def fuzzy_correct_card_name(ocr_text, threshold=75):
    """Corrige le nom de carte avec fuzzy matching"""
    
    # Nettoyer le texte OCR
    cleaned = ocr_text.strip()
    
    # Ignorer les mots courts ou nombres
    if len(cleaned) < 3 or cleaned.isdigit():
        return None, 0
    
    # Chercher la meilleure correspondance
    result = process.extractOne(cleaned, KNOWN_CARDS, scorer=fuzz.ratio)
    
    if result and result[1] >= threshold:
        return result[0], result[1]
    
    # Essayer avec partial ratio pour les noms partiels
    result = process.extractOne(cleaned, KNOWN_CARDS, scorer=fuzz.partial_ratio)
    
    if result and result[1] >= threshold:
        return result[0], result[1]
    
    return cleaned, 50  # Garder l'original si pas de match

def extract_and_correct_cards(image_path):
    """Pipeline complet : OCR + Fuzzy Correction"""
    print("🔧 Prétraitement de l'image...")
    processed, color = preprocess_for_ocr(image_path)
    
    print("🤖 Initialisation EasyOCR...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    print("🔍 Extraction du texte...")
    results = reader.readtext(processed)
    
    print(f"📝 {len(results)} éléments détectés")
    print("\n" + "="*60)
    print("CORRECTION FUZZY MATCHING")
    print("="*60)
    
    cards = []
    for bbox, text, conf in results:
        # Ignorer "Sideboard" et "Done"
        if text.lower() in ['sideboard', 'done', 'submit']:
            continue
        
        # Extraire quantité si présente
        quantity = 1
        card_text = text
        
        # Pattern (1) ou 1x
        if text.startswith('(') and ')' in text:
            try:
                qty = text[1:text.index(')')]
                if qty.isdigit():
                    quantity = int(qty)
                    card_text = text[text.index(')')+1:].strip()
            except:
                pass
        
        # Correction fuzzy
        corrected, match_score = fuzzy_correct_card_name(card_text)
        
        if corrected and match_score > 40:
            status = "✅" if match_score > 80 else "⚠️" if match_score > 60 else "❓"
            print(f"{status} '{text}' → '{corrected}' (match: {match_score}%)")
            
            cards.append({
                'original': text,
                'corrected': corrected,
                'quantity': quantity,
                'confidence': conf,
                'match_score': match_score
            })
    
    return cards

def test_full_pipeline():
    """Test complet du pipeline OCR"""
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/image.webp"
    
    print("\n" + "🎯"*20)
    print("TEST PIPELINE COMPLET : EASYOCR + FUZZY MATCHING")
    print("🎯"*20 + "\n")
    
    cards = extract_and_correct_cards(image_path)
    
    print("\n" + "="*60)
    print("📋 RÉSULTAT FINAL - SIDEBOARD CORRIGÉ")
    print("="*60)
    
    if cards:
        # Dédupliquer et compter
        deck = {}
        for card in cards:
            name = card['corrected']
            if name in deck:
                deck[name] += card['quantity']
            else:
                deck[name] = card['quantity']
        
        for name, qty in deck.items():
            print(f"  {qty}x {name}")
        
        # Format JSON pour export
        print("\n📤 FORMAT EXPORT JSON:")
        output = {
            "sideboard": [
                {"name": name, "quantity": qty}
                for name, qty in deck.items()
            ]
        }
        print(json.dumps(output, indent=2))
        
        # Stats
        print(f"\n📊 STATISTIQUES:")
        print(f"  • Total cartes uniques: {len(deck)}")
        print(f"  • Total cartes: {sum(deck.values())}")
        avg_confidence = np.mean([c['match_score'] for c in cards])
        print(f"  • Confiance moyenne: {avg_confidence:.1f}%")
    else:
        print("❌ Aucune carte détectée")
    
    return cards

# Pour intégration serveur Node.js
def process_for_nodejs(base64_image=None, image_path=None):
    """Fonction pour être appelée depuis Node.js"""
    
    if base64_image:
        # Décoder base64 en image
        import base64
        import io
        from PIL import Image
        
        img_data = base64.b64decode(base64_image)
        img = Image.open(io.BytesIO(img_data))
        
        # Sauver temporairement
        temp_path = '/tmp/mtg_ocr_temp.png'
        img.save(temp_path)
        image_path = temp_path
    
    if not image_path:
        return {"error": "No image provided"}
    
    try:
        cards = extract_and_correct_cards(image_path)
        
        # Formater pour le serveur
        deck = {}
        for card in cards:
            name = card['corrected']
            deck[name] = deck.get(name, 0) + card['quantity']
        
        return {
            "success": True,
            "sideboard": [
                {"name": name, "quantity": qty}
                for name, qty in deck.items()
            ],
            "confidence": np.mean([c['match_score'] for c in cards]) if cards else 0
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--stdin-base64':
        # Mode pour le serveur Node.js
        base64_data = sys.stdin.read().strip()
        result = process_for_nodejs(base64_image=base64_data)
        print(json.dumps(result))
    else:
        # Mode test
        test_full_pipeline()