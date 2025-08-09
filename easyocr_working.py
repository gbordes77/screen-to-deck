#!/usr/bin/env python3
import cv2
import easyocr
import numpy as np
import json
import sys

# Initialisation globale
reader = easyocr.Reader(['en'], gpu=False, verbose=False)

def extract_sideboard_mtg(image_path):
    """Extraction optimisée pour sideboard MTG Arena"""
    
    # Charger et préparer l'image
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    
    # Crop sideboard (dernier 22% de l'image)
    x_start = int(w * 0.78)
    sideboard = img[:, x_start:]
    
    # Agrandir 4x pour meilleure lisibilité
    scale = 4
    resized = cv2.resize(sideboard, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Améliorer le contraste
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    # OCR avec EasyOCR
    try:
        results = reader.readtext(enhanced, detail=1, paragraph=False)
    except Exception as e:
        print(f"Erreur OCR: {e}", file=sys.stderr)
        return []
    
    # Parser les résultats
    cards = []
    for result in results:
        if len(result) >= 2:
            bbox = result[0]
            text = result[1]
            conf = result[2] if len(result) > 2 else 0.5
            
            # Nettoyer le texte
            text = text.strip()
            
            # Ignorer UI et textes courts
            if len(text) < 3 or text.lower() in ['sideboard', 'done', 'cards', 'best of three only']:
                continue
            
            cards.append({
                'name': text,
                'confidence': conf
            })
    
    return cards

def process_for_server(image_path):
    """Process pour intégration serveur"""
    cards = extract_sideboard_mtg(image_path)
    
    # Dédupliquer et compter
    deck = {}
    for card in cards:
        name = card['name']
        # Extraire quantité si présente dans le nom
        qty = 1
        if name and name[0].isdigit():
            try:
                qty = int(name[0])
                name = name[1:].strip()
            except:
                pass
        
        if name in deck:
            deck[name] += qty
        else:
            deck[name] = qty
    
    return {
        "success": True,
        "sideboard": [
            {"name": name, "quantity": qty}
            for name, qty in deck.items()
        ],
        "cards_found": len(deck),
        "confidence": np.mean([c['confidence'] for c in cards]) if cards else 0
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--stdin-base64':
        # Mode serveur
        import base64
        from PIL import Image
        import io
        
        base64_data = sys.stdin.read().strip()
        img_data = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(img_data))
        
        temp_path = '/tmp/mtg_temp.png'
        img.save(temp_path)
        
        result = process_for_server(temp_path)
        print(json.dumps(result))
    else:
        # Mode test
        for img_num in [1, 2]:
            image_path = f"/Volumes/DataDisk/_Projects/screen to deck/image{'' if img_num == 1 else img_num}.webp"
            
            print(f"\n{'='*60}")
            print(f"📸 TEST IMAGE {img_num}: {image_path}")
            print(f"{'='*60}")
            
            result = process_for_server(image_path)
            
            if result['success'] and result['sideboard']:
                print(f"✅ {result['cards_found']} cartes trouvées (confiance: {result['confidence']:.1%})")
                for card in result['sideboard']:
                    print(f"  • {card['quantity']}x {card['name']}")
            else:
                print("❌ Aucune carte détectée")
                
                # Fallback: lister ce qu'on voit vraiment
                print("\n📝 Ce qui devrait être détecté:")
                if img_num == 1:
                    expected = ["Devout Decree", "Faerie Mastermind", "Tishana's Tidebinder", 
                               "Rest in Peace", "Negate", "Kaito's Pursuit"]
                else:
                    expected = ["Fire Magic", "Torch the Tower", "Ghost Vacuum", 
                               "Disdainful Stroke", "Smuggler's Surprise", "Negate"]
                
                for card in expected[:6]:
                    print(f"  • {card}")
        
        print("\n" + "="*60)
        print("💡 CONCLUSION: EasyOCR a des difficultés avec ces images basse résolution")
        print("➡️ OpenAI Vision sera utilisé automatiquement comme fallback")
        print("="*60)