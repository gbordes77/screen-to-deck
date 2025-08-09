#!/usr/bin/env python3
"""
Application de la solution Super-Résolution sur image.webp (677x309)
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import easyocr
import json

class SuperResolutionOCR:
    def __init__(self):
        print("🔧 Initialisation du système...")
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        
    def analyze_image(self, img):
        """Analyse la qualité de l'image"""
        h, w = img.shape[:2]
        text_height = h // 15 // 3
        
        print(f"📊 Analyse de l'image:")
        print(f"  • Dimensions: {w}x{h} pixels")
        print(f"  • Hauteur texte estimée: {text_height}px")
        
        if w < 800:
            return "CRITIQUE", text_height
        elif w < 1200:
            return "FAIBLE", text_height
        elif w < 1600:
            return "MOYENNE", text_height
        else:
            return "BONNE", text_height
            
    def aggressive_super_resolution(self, img, target_width=3000):
        """Super-résolution agressive pour images très basse résolution"""
        h, w = img.shape[:2]
        scale = target_width / w
        
        print(f"\n🚀 Super-Résolution Agressive:")
        print(f"  • Facteur: {scale:.1f}x")
        print(f"  • Cible: {target_width}x{int(h*scale)}")
        
        # Étape 1: Pre-processing pour réduire le bruit
        print("\n⚡ Étape 1: Préparation...")
        denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
        
        # Étape 2: Upscaling progressif en plusieurs passes
        print("⚡ Étape 2: Upscaling multi-passes...")
        current = denoised.copy()
        current_w = w
        
        passes = []
        while current_w < target_width:
            step_scale = min(2.0, target_width / current_w)
            new_w = int(current_w * step_scale)
            new_h = int(current.shape[0] * step_scale)
            
            print(f"  • Pass: {current_w} → {new_w}")
            
            # Utiliser différentes méthodes et combiner
            methods = []
            
            # INTER_CUBIC pour smoothness
            cubic = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            methods.append(cubic)
            
            # INTER_LANCZOS4 pour sharpness
            lanczos = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            methods.append(lanczos)
            
            # INTER_LINEAR pour balance
            linear = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            methods.append(linear)
            
            # Combiner avec pondération
            current = np.average(methods, axis=0, weights=[0.4, 0.4, 0.2]).astype(np.uint8)
            
            # Sharpening intermédiaire
            if current_w < target_width / 2:
                kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]]) / 2
                current = cv2.filter2D(current, -1, kernel)
            
            current_w = new_w
            passes.append(current.copy())
        
        # Étape 3: Enhancement spécifique au texte
        print("⚡ Étape 3: Optimisation pour le texte...")
        
        # Convertir en PIL pour filtres avancés
        pil_img = Image.fromarray(cv2.cvtColor(current, cv2.COLOR_BGR2RGB))
        
        # Unsharp masking agressif
        pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=3, percent=200, threshold=2))
        
        # Edge enhancement
        pil_img = pil_img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        
        # Augmenter le contraste
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.5)
        
        # Augmenter la netteté
        enhancer = ImageEnhance.Sharpness(pil_img)
        pil_img = enhancer.enhance(2.0)
        
        # Retour en OpenCV
        enhanced = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
        # Étape 4: CLAHE pour contraste local
        print("⚡ Étape 4: Amélioration du contraste local...")
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Étape 5: Final sharpening pour le texte
        print("⚡ Étape 5: Finalisation...")
        kernel = np.array([[-1,-1,-1,-1,-1],
                          [-1,2,2,2,-1],
                          [-1,2,8,2,-1],
                          [-1,2,2,2,-1],
                          [-1,-1,-1,-1,-1]]) / 8.0
        final = cv2.filter2D(enhanced, -1, kernel)
        
        print(f"✅ Résolution finale: {final.shape[1]}x{final.shape[0]}")
        
        return final
        
    def extract_sideboard(self, img):
        """Extrait le sideboard de l'image"""
        h, w = img.shape[:2]
        
        # Pour cette image, le sideboard est dans la partie droite
        sideboard_x = int(w * 0.65)  # Prendre un peu plus large
        sideboard = img[:, sideboard_x:]
        
        return sideboard
        
    def run_ocr_on_region(self, img, region_name=""):
        """Execute OCR sur une région"""
        print(f"\n🤖 OCR sur {region_name}...")
        
        # Plusieurs configurations pour maximiser la détection
        configs = [
            {'paragraph': False, 'width_ths': 0.7, 'height_ths': 0.7},
            {'paragraph': True, 'width_ths': 0.5, 'height_ths': 0.5},
            {'paragraph': False, 'width_ths': 0.9, 'height_ths': 0.9}
        ]
        
        all_texts = []
        for i, config in enumerate(configs, 1):
            print(f"  • Configuration {i}/{len(configs)}...")
            results = self.reader.readtext(img, **config)
            for result in results:
                if len(result) >= 2:
                    text = result[1]
                    conf = result[2] if len(result) > 2 else 0.5
                    all_texts.append((text.strip(), conf))
        
        # Dédupliquer et garder la meilleure confiance
        unique_texts = {}
        for text, conf in all_texts:
            if text not in unique_texts or conf > unique_texts[text]:
                unique_texts[text] = conf
        
        return unique_texts
        
    def parse_sideboard_cards(self, texts):
        """Parse les cartes du sideboard depuis les textes détectés"""
        cards = []
        
        # Filtrer les éléments UI
        ui_elements = ['sideboard', 'done', 'cards', '15', 'best of three only']
        
        for text, conf in texts.items():
            # Ignorer UI et textes trop courts
            if len(text) < 3 or any(ui in text.lower() for ui in ui_elements):
                continue
            
            # Essayer de parser la quantité
            quantity = 1
            card_name = text
            
            # Pattern: (1) Card Name
            if text.startswith('(') and ')' in text:
                try:
                    parts = text[1:].split(')', 1)
                    if parts[0].isdigit():
                        quantity = int(parts[0])
                        card_name = parts[1].strip()
                except:
                    pass
            
            # Pattern: 1x Card Name ou Card Name x1
            elif 'x' in text.lower():
                parts = text.lower().split('x')
                if len(parts) == 2:
                    if parts[0].strip().isdigit():
                        quantity = int(parts[0].strip())
                        card_name = text[text.lower().index('x')+1:].strip()
                    elif parts[1].strip().isdigit():
                        quantity = int(parts[1].strip())
                        card_name = text[:text.lower().index('x')].strip()
            
            if card_name and len(card_name) > 2:
                cards.append({
                    'name': card_name,
                    'quantity': quantity,
                    'confidence': conf
                })
        
        return cards
        
    def process_image(self, image_path):
        """Pipeline complet de traitement"""
        print("\n" + "="*60)
        print(f"🎯 TRAITEMENT DE {image_path}")
        print("="*60)
        
        # Charger l'image
        img = cv2.imread(image_path)
        if img is None:
            print("❌ Impossible de charger l'image")
            return []
        
        # Analyser la qualité
        quality, text_height = self.analyze_image(img)
        
        if quality == "CRITIQUE":
            print(f"\n⚠️ QUALITÉ CRITIQUE ({img.shape[1]}x{img.shape[0]})")
            print("➡️ Super-résolution agressive requise")
            
            # Appliquer super-résolution agressive
            img = self.aggressive_super_resolution(img, target_width=3000)
            
            # Sauvegarder pour debug
            cv2.imwrite('/tmp/super_res_aggressive.png', img)
            print(f"\n💾 Image améliorée: /tmp/super_res_aggressive.png")
        
        # Extraire le sideboard
        sideboard = self.extract_sideboard(img)
        
        # Sauvegarder le sideboard pour debug
        cv2.imwrite('/tmp/sideboard_region.png', sideboard)
        print(f"💾 Région sideboard: /tmp/sideboard_region.png")
        
        # OCR sur le sideboard
        texts = self.run_ocr_on_region(sideboard, "SIDEBOARD")
        
        # Parser les cartes
        cards = self.parse_sideboard_cards(texts)
        
        return cards

def main():
    """Test sur image.webp (677x309)"""
    
    processor = SuperResolutionOCR()
    
    # Traiter l'image
    cards = processor.process_image("/Volumes/DataDisk/_Projects/screen to deck/image.webp")
    
    # Afficher les résultats
    print("\n" + "="*60)
    print("📊 RÉSULTATS FINAUX")
    print("="*60)
    
    if cards:
        print(f"\n✅ {len(cards)} cartes détectées:")
        
        # Trier par confiance
        cards.sort(key=lambda x: x['confidence'], reverse=True)
        
        for i, card in enumerate(cards, 1):
            conf_emoji = "✅" if card['confidence'] > 0.8 else "⚠️" if card['confidence'] > 0.6 else "❓"
            print(f"  {i:2}. {conf_emoji} {card['quantity']}x {card['name']} ({card['confidence']:.0%})")
        
        # Vérifier contre les cartes attendues
        expected_cards = [
            "Devout Decree", "Faerie Mastermind", "Tishana's Tidebinder",
            "Rest in Peace", "Negate", "Kaito's Pursuit"
        ]
        
        print(f"\n🎯 Vérification des cartes clés:")
        for expected in expected_cards:
            found = any(expected.lower() in c['name'].lower() for c in cards)
            print(f"  • {expected}: {'✅' if found else '❌'}")
            
        # Calculer le taux de succès
        total_expected = 15  # Sideboard standard
        success_rate = min(len(cards) / total_expected * 100, 100)
        print(f"\n📈 Taux de détection: {success_rate:.0f}%")
        
        # Sauvegarder le résultat
        result = {
            'sideboard': [{'name': c['name'], 'quantity': c['quantity']} for c in cards],
            'total_detected': len(cards),
            'success_rate': success_rate,
            'resolution_original': '677x309',
            'resolution_processed': '3000x1380 (estimé)'
        }
        
        with open('/tmp/result_sr_aggressive.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Résultat JSON: /tmp/result_sr_aggressive.json")
        
    else:
        print("❌ Aucune carte détectée")
        print("\n💡 L'image est trop basse résolution (677x309)")
        print("   Même avec super-résolution agressive, le texte de 6px")
        print("   d'origine est trop dégradé pour être reconstruit.")
        print("\n📌 Recommandation: Utiliser OpenAI Vision API pour cette image")
        print("   ou capturer une image de meilleure qualité (min 1200px)")

if __name__ == "__main__":
    main()