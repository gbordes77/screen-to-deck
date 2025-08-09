#!/usr/bin/env python3
"""
Upscale intelligent + détection améliorée pour les cartes manquantes
"""
import cv2
import numpy as np
import easyocr
from PIL import Image, ImageEnhance, ImageFilter

def super_resolution_upscale(img, scale=4):
    """Upscaling avancé avec interpolation bicubique + sharpening"""
    
    # 1. Upscale avec différentes méthodes et moyenner
    h, w = img.shape[:2]
    new_size = (w * scale, h * scale)
    
    # Méthode 1: Cubic
    cubic = cv2.resize(img, new_size, interpolation=cv2.INTER_CUBIC)
    
    # Méthode 2: Lanczos
    lanczos = cv2.resize(img, new_size, interpolation=cv2.INTER_LANCZOS4)
    
    # Combiner les deux (moyenne pondérée)
    upscaled = cv2.addWeighted(cubic, 0.5, lanczos, 0.5, 0)
    
    # 2. Améliorer la netteté
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(upscaled, -1, kernel)
    
    # 3. Réduire le bruit
    denoised = cv2.bilateralFilter(sharpened, 9, 75, 75)
    
    return denoised

def extract_sideboard_enhanced(image_path):
    """Extraction améliorée du sideboard avec super-résolution"""
    
    print("🔧 Chargement de l'image...")
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    
    # Extraire le sideboard
    print("✂️ Extraction du sideboard...")
    sideboard_x = int(w * 0.70)  # Prendre un peu plus large
    sideboard = img[:, sideboard_x:]
    
    # Super-résolution
    print("🔍 Super-résolution 4x...")
    upscaled = super_resolution_upscale(sideboard, scale=4)
    
    # Amélioration du contraste avec CLAHE
    print("🎨 Amélioration du contraste...")
    lab = cv2.cvtColor(upscaled, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    # Sauvegarder pour debug
    debug_path = '/tmp/sideboard_enhanced.png'
    cv2.imwrite(debug_path, enhanced)
    print(f"💾 Image améliorée: {debug_path}")
    print(f"   Nouvelle résolution: {enhanced.shape[1]}x{enhanced.shape[0]}")
    
    # OCR avec EasyOCR
    print("🤖 Analyse OCR...")
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    
    # Plusieurs passes avec différents paramètres
    all_detections = []
    
    # Pass 1: Standard
    results1 = reader.readtext(enhanced, paragraph=False)
    all_detections.extend(results1)
    
    # Pass 2: Avec regroupement
    results2 = reader.readtext(enhanced, paragraph=True)
    all_detections.extend(results2)
    
    # Dédupliquer et nettoyer
    seen = set()
    cards = []
    
    for detection in all_detections:
        if len(detection) >= 2:
            text = detection[1].strip()
            
            # Ignorer les doublons et textes courts
            if text in seen or len(text) < 3:
                continue
                
            # Ignorer UI
            if text.lower() in ['sideboard', 'done', 'cards', 'best of three only']:
                continue
                
            seen.add(text)
            
            # Parser quantité
            quantity = 1
            card_name = text
            
            # Chercher les patterns de quantité
            if text and text[0].isdigit():
                parts = text.split(' ', 1)
                if len(parts) == 2 and parts[0].replace('x', '').isdigit():
                    quantity = int(parts[0].replace('x', ''))
                    card_name = parts[1]
            
            cards.append({
                'name': card_name,
                'quantity': quantity,
                'confidence': detection[2] if len(detection) > 2 else 0.5
            })
    
    return cards

def detect_all_cards(image_path):
    """Détection complète avec focus sur les cartes manquantes"""
    
    print("\n" + "="*60)
    print("🎯 DÉTECTION AVANCÉE AVEC SUPER-RÉSOLUTION")
    print("="*60)
    
    cards = extract_sideboard_enhanced(image_path)
    
    # Cartes attendues dans le sideboard (d'après ta capture haute résolution)
    expected = [
        "Fire Magic", "Fire Magic",  # 2x
        "Torch the Tower", "Torch the Tower",  # 2x  
        "Ghost Vacuum", "Ghost Vacuum",  # 2x
        "Disdainful Stroke",  # 1x
        "Smuggler's Surprise",  # 1x
        "Negate",  # 1x
        "Scrapshooter",  # 1x
        "Surrak, Elusive Hunter",  # 1x
        "Vaultborn Tyrant",  # 1x
        "Ugin, Eye of the Storms",  # 1x
        "Spectral Denial",  # 1x
        "Spectr..."  # 1x (nom coupé)
    ]
    
    print(f"\n📊 RÉSULTATS:")
    print(f"  • Cartes détectées: {len(cards)}")
    print(f"  • Cartes attendues: 15")
    
    if cards:
        print("\n🎴 CARTES TROUVÉES:")
        for i, card in enumerate(cards, 1):
            conf = card['confidence'] * 100
            status = "✅" if conf > 80 else "⚠️" if conf > 60 else "❓"
            print(f"  {i:2}. {status} {card['quantity']}x {card['name']} ({conf:.0f}%)")
    
    # Identifier les manquantes
    detected_names = [c['name'].lower() for c in cards]
    missing = []
    
    for exp in set(expected):
        if not any(exp.lower() in det or det in exp.lower() for det in detected_names):
            missing.append(exp)
    
    if missing:
        print(f"\n❌ CARTES MANQUANTES ({len(missing)}):")
        for m in missing:
            print(f"  • {m}")
    
    return cards

# Test
if __name__ == "__main__":
    import sys
    image = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/DataDisk/_Projects/screen to deck/image2.webp"
    detect_all_cards(image)