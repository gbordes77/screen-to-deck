#!/usr/bin/env python3
"""
Super-Résolution GRATUITE pour éviter OpenAI
Utilise Real-ESRGAN ou des méthodes avancées d'upscaling
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import easyocr

class FreeSupeResolution:
    def __init__(self):
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        
    def advanced_upscale(self, img, target_width=2400):
        """
        Upscaling avancé GRATUIT pour atteindre une résolution optimale
        Objectif: Passer de 1575x749 à 2400x1140 (ou plus)
        """
        h, w = img.shape[:2]
        scale = target_width / w
        
        print(f"📐 Résolution actuelle: {w}x{h}")
        print(f"🎯 Objectif: {target_width}x{int(h*scale)}")
        print(f"🔍 Facteur d'agrandissement: {scale:.2f}x")
        
        # Étape 1: EDSR-style upscaling (sans le modèle, mais avec les techniques)
        print("\n⚡ Étape 1: Multi-scale upscaling...")
        
        # Upscale progressif pour meilleure qualité
        current = img.copy()
        current_scale = 1.0
        
        while current_scale < scale:
            # Augmenter par étapes de 1.5x max
            step_scale = min(1.5, scale / current_scale)
            new_w = int(current.shape[1] * step_scale)
            new_h = int(current.shape[0] * step_scale)
            
            # Combiner plusieurs méthodes d'interpolation
            cubic = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            lanczos = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            linear = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            
            # Moyenne pondérée (Lanczos privilégié pour le texte)
            current = cv2.addWeighted(lanczos, 0.5, cubic, 0.3, 0)
            current = cv2.addWeighted(current, 0.8, linear, 0.2, 0)
            
            current_scale *= step_scale
            print(f"  • Upscale à {current.shape[1]}x{current.shape[0]}")
        
        # Étape 2: Edge Enhancement (améliorer les contours du texte)
        print("\n🔪 Étape 2: Amélioration des contours...")
        
        # Convertir en PIL pour filtres avancés
        pil_img = Image.fromarray(cv2.cvtColor(current, cv2.COLOR_BGR2RGB))
        
        # Unsharp mask pour améliorer la netteté
        pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        # Edge enhance
        pil_img = pil_img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        
        # Retour en OpenCV
        enhanced = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
        # Étape 3: Contrast Enhancement spécifique au texte
        print("\n🎨 Étape 3: Optimisation du contraste pour OCR...")
        
        # CLAHE sur chaque canal
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # CLAHE plus agressif pour le texte
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Étape 4: Denoising intelligent
        print("\n🧹 Étape 4: Réduction du bruit...")
        
        # Bilateral filter préserve les edges
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Étape 5: Text-specific enhancement
        print("\n📝 Étape 5: Optimisation spécifique au texte MTG...")
        
        # Convertir en gris pour analyse
        gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
        
        # Seuillage adaptatif pour identifier les zones de texte
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY, 11, 2)
        
        # Créer un masque pour les zones de texte
        kernel = np.ones((3,3), np.uint8)
        text_mask = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        text_mask = cv2.morphologyEx(text_mask, cv2.MORPH_OPEN, kernel)
        
        # Appliquer un sharpening supplémentaire sur les zones de texte
        sharpening_kernel = np.array([[-1,-1,-1],
                                      [-1, 9,-1],
                                      [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, sharpening_kernel)
        
        # Combiner: zones de texte sharp, reste normal
        text_mask_3ch = cv2.cvtColor(text_mask, cv2.COLOR_GRAY2BGR) / 255.0
        final = (sharpened * text_mask_3ch + denoised * (1 - text_mask_3ch)).astype(np.uint8)
        
        print(f"\n✅ Résolution finale: {final.shape[1]}x{final.shape[0]}")
        print(f"📈 Amélioration: {final.shape[1]/w:.1f}x")
        
        return final
        
    def extract_with_free_sr(self, image_path):
        """Pipeline complet avec Super-Résolution gratuite"""
        
        print("\n" + "="*60)
        print("🚀 EXTRACTION AVEC SUPER-RÉSOLUTION GRATUITE")
        print("="*60)
        
        # Charger l'image
        img = cv2.imread(image_path)
        h, w = img.shape[:2]
        
        # Analyser la qualité
        text_height = h // 15 // 3
        print(f"\n📊 Analyse initiale:")
        print(f"  • Résolution: {w}x{h}")
        print(f"  • Taille texte estimée: {text_height}px")
        
        if text_height < 20:
            print(f"  ⚠️ Texte trop petit ({text_height}px < 20px)")
            print(f"  ➡️ Super-résolution requise")
            
            # Appliquer la super-résolution
            img = self.advanced_upscale(img, target_width=2400)
            
            # Sauvegarder pour debug
            cv2.imwrite('/tmp/super_res_free.png', img)
            print(f"\n💾 Image améliorée sauvée: /tmp/super_res_free.png")
        else:
            print(f"  ✅ Résolution suffisante")
            
        # Extraire sideboard (partie droite)
        sideboard_x = int(img.shape[1] * 0.70)
        sideboard = img[:, sideboard_x:]
        
        # OCR avec EasyOCR
        print("\n🤖 OCR avec EasyOCR sur image améliorée...")
        results = self.reader.readtext(sideboard, paragraph=False)
        
        # Parser les résultats
        cards = []
        for bbox, text, conf in results:
            text = text.strip()
            
            # Ignorer UI
            if len(text) < 3 or text.lower() in ['sideboard', 'done', 'cards']:
                continue
                
            # Parser quantité
            quantity = 1
            card_name = text
            
            if 'x' in text.lower():
                parts = text.replace('X', 'x').split('x')
                if len(parts) == 2:
                    if parts[0].strip().isdigit():
                        quantity = int(parts[0].strip())
                        card_name = parts[1].strip()
                        
            cards.append({
                'name': card_name,
                'quantity': quantity,
                'confidence': conf
            })
            
        return cards

def test_comparison():
    """Compare avec et sans super-résolution"""
    
    sr = FreeSupeResolution()
    
    # Test 1: Sans super-résolution (direct)
    print("\n" + "="*60)
    print("TEST 1: OCR DIRECT (sans amélioration)")
    print("="*60)
    
    img = cv2.imread("/Volumes/DataDisk/_Projects/screen to deck/image2.webp")
    sideboard = img[:, int(img.shape[1] * 0.70):]
    
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    results_direct = reader.readtext(sideboard, paragraph=False)
    
    cards_direct = []
    for _, text, conf in results_direct:
        text = text.strip()
        if len(text) > 3 and text.lower() not in ['sideboard', 'done', 'cards']:
            cards_direct.append(text)
            
    print(f"✅ Cartes détectées: {len(cards_direct)}")
    for i, card in enumerate(cards_direct[:5], 1):
        print(f"  {i}. {card}")
    if len(cards_direct) > 5:
        print(f"  ... et {len(cards_direct)-5} autres")
        
    # Test 2: Avec super-résolution
    print("\n" + "="*60)
    print("TEST 2: OCR AVEC SUPER-RÉSOLUTION GRATUITE")
    print("="*60)
    
    cards_sr = sr.extract_with_free_sr("/Volumes/DataDisk/_Projects/screen to deck/image2.webp")
    
    print(f"\n✅ Cartes détectées: {len(cards_sr)}")
    for i, card in enumerate(cards_sr, 1):
        print(f"  {i}. {card['quantity']}x {card['name']} ({card['confidence']:.0%})")
        
    # Comparaison
    print("\n" + "="*60)
    print("📊 COMPARAISON DES RÉSULTATS")
    print("="*60)
    
    print(f"Sans SR: {len(cards_direct)} cartes")
    print(f"Avec SR: {len(cards_sr)} cartes")
    print(f"Amélioration: +{len(cards_sr) - len(cards_direct)} cartes")
    
    # Vérifier si on a les cartes clés
    key_cards = ["Fire Magic", "Spectral Denial", "Negate", "Ghost Vacuum"]
    
    print("\n🎯 Détection des cartes clés:")
    for key in key_cards:
        found = any(key.lower() in str(card).lower() for card in cards_sr)
        print(f"  • {key}: {'✅' if found else '❌'}")
        
    print("\n💰 ÉCONOMIE:")
    print("  • Coût OpenAI Vision: ~$0.01 par image")
    print("  • Coût Super-Résolution locale: GRATUIT")
    print("  • Pour 1000 images: économie de $10")

if __name__ == "__main__":
    test_comparison()