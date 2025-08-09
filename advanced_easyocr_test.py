#!/usr/bin/env python3
import cv2
import easyocr
import numpy as np
from PIL import Image, ImageEnhance
import json

def test_multiple_preprocessing(image_path):
    """Test plusieurs méthodes de prétraitement"""
    img = cv2.imread(image_path)
    height, width = img.shape[:2]
    
    # Extraire le sideboard (panneau droit)
    x_start = int(width * 0.78)
    cropped = img[:, x_start:]
    
    # Test 1: Haute résolution
    scale = 4
    high_res = cv2.resize(cropped, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Test 2: Amélioration du contraste avec PIL
    pil_img = Image.fromarray(cv2.cvtColor(high_res, cv2.COLOR_BGR2RGB))
    enhancer = ImageEnhance.Contrast(pil_img)
    enhanced = enhancer.enhance(2.0)
    enhanced_cv = cv2.cvtColor(np.array(enhanced), cv2.COLOR_RGB2BGR)
    
    # Test 3: Sharpening
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced_cv, -1, kernel)
    
    # Test 4: Débruitage
    denoised = cv2.fastNlMeansDenoisingColored(sharpened, None, 10, 10, 7, 21)
    
    # Conversion finale en gris
    gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    
    # Sauvegarder pour debug
    cv2.imwrite('/tmp/sideboard_highres.png', high_res)
    cv2.imwrite('/tmp/sideboard_final.png', gray)
    
    return gray, denoised

def extract_sideboard_advanced(image_path):
    """Extraction avancée avec EasyOCR"""
    print("🔧 Prétraitement avancé...")
    processed, color = test_multiple_preprocessing(image_path)
    
    print("🤖 Initialisation EasyOCR avec paramètres optimisés...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    print("🔍 Analyse avec différents paramètres...")
    
    # Test avec image couleur haute résolution
    results_color = reader.readtext(color, 
                                   width_ths=0.7,
                                   height_ths=0.7,
                                   paragraph=False,
                                   mag_ratio=1.5)
    
    # Test avec image en niveaux de gris
    results_gray = reader.readtext(processed,
                                  width_ths=0.5,
                                  height_ths=0.5,
                                  paragraph=True)
    
    # Combiner les résultats
    all_results = results_color + results_gray
    
    # Dédupliquer et filtrer
    seen_texts = set()
    cards = []
    
    for bbox, text, conf in all_results:
        text = text.strip()
        
        # Ignorer les doublons et textes courts
        if text in seen_texts or len(text) < 3:
            continue
        
        # Ignorer les mots UI
        if text.lower() in ['sideboard', 'done', 'cards', 'best of three only']:
            continue
            
        seen_texts.add(text)
        
        # Parser quantité
        quantity = 1
        card_name = text
        
        # Chercher patterns de quantité
        for pattern in [' x', 'x ', '(', ')']:
            if pattern in text:
                parts = text.replace('(', '').replace(')', '').split('x')
                if len(parts) == 2:
                    try:
                        if parts[0].strip().isdigit():
                            quantity = int(parts[0].strip())
                            card_name = parts[1].strip()
                        elif parts[1].strip().isdigit():
                            quantity = int(parts[1].strip())
                            card_name = parts[0].strip()
                    except:
                        pass
                break
        
        if card_name and len(card_name) > 2:
            cards.append({
                'name': card_name,
                'quantity': quantity,
                'confidence': conf
            })
    
    return cards

# Test principal
image_path = "/Volumes/DataDisk/_Projects/screen to deck/image2.webp"
print("="*60)
print("🎯 TEST AVANCÉ EASYOCR - IMAGE2")
print("="*60)

cards = extract_sideboard_advanced(image_path)

print(f"\n✅ {len(cards)} cartes détectées:")
for i, card in enumerate(cards, 1):
    print(f"{i:2}. {card['quantity']}x {card['name']} (conf: {card['confidence']:.2%})")

if not cards or len(cards) < 5:
    print("\n⚠️ Peu de cartes détectées, test avec approche différente...")
    
    # Approche 2: Focus sur les zones de texte blanc
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    sideboard = img[:, int(w*0.78):]
    
    # Masque pour texte blanc/clair
    hsv = cv2.cvtColor(sideboard, cv2.COLOR_BGR2HSV)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Appliquer le masque
    result = cv2.bitwise_and(sideboard, sideboard, mask=mask)
    
    # Agrandir et améliorer
    result = cv2.resize(result, None, fx=3, fy=3, interpolation=cv2.INTER_LINEAR)
    
    cv2.imwrite('/tmp/sideboard_masked.png', result)
    
    print("🔄 Nouvelle tentative avec masque de texte blanc...")
    reader = easyocr.Reader(['en'], gpu=False)
    results = reader.readtext(result, paragraph=False)
    
    cards2 = []
    for bbox, text, conf in results:
        text = text.strip()
        if len(text) > 3 and text.lower() not in ['sideboard', 'done', 'best']:
            cards2.append({'name': text, 'quantity': 1, 'confidence': conf})
    
    print(f"\n✅ Avec masque: {len(cards2)} cartes détectées:")
    for i, card in enumerate(cards2, 1):
        print(f"{i:2}. {card['name']} (conf: {card['confidence']:.2%})")
    
    if len(cards2) > len(cards):
        cards = cards2

# Résultat final
print("\n" + "="*60)
print("📋 RÉSULTAT FINAL")
print("="*60)

if cards:
    output = {"sideboard": [{"name": c['name'], "quantity": c['quantity']} for c in cards]}
    print(json.dumps(output, indent=2))
else:
    print("❌ Échec de la reconnaissance")
    
print("\n💾 Images de debug:")
print("  • /tmp/sideboard_highres.png")
print("  • /tmp/sideboard_final.png")
print("  • /tmp/sideboard_masked.png")