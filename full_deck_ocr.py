#!/usr/bin/env python3
"""
OCR complet pour extraire TOUTES les cartes (mainboard + sideboard)
"""
import cv2
import easyocr
import numpy as np
import json
import sys
from fuzzywuzzy import fuzz, process

class FullDeckOCR:
    def __init__(self):
        print("🔧 Initialisation EasyOCR...", file=sys.stderr)
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        
    def extract_mainboard(self, img):
        """Extrait les cartes du mainboard (partie gauche/centre)"""
        h, w = img.shape[:2]
        
        # Le mainboard est généralement dans les 75% gauche de l'écran
        mainboard = img[:, :int(w * 0.75)]
        
        # Agrandir pour meilleure lisibilité
        scale = 3
        resized = cv2.resize(mainboard, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # Améliorer le contraste
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return enhanced
        
    def extract_sideboard(self, img):
        """Extrait les cartes du sideboard (partie droite)"""
        h, w = img.shape[:2]
        
        # Le sideboard est dans les 25% droite
        sideboard = img[:, int(w * 0.75):]
        
        # Agrandir et améliorer
        scale = 4
        resized = cv2.resize(sideboard, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # Améliorer le contraste
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return enhanced
        
    def extract_cards_from_region(self, img, region_name="region"):
        """Extrait les cartes d'une région spécifique"""
        print(f"🔍 Analyse {region_name}...", file=sys.stderr)
        
        # OCR avec EasyOCR
        results = self.reader.readtext(img, 
                                      paragraph=False,
                                      width_ths=0.7,
                                      height_ths=0.7)
        
        cards = {}
        for bbox, text, conf in results:
            # Nettoyer le texte
            text = text.strip()
            
            # Ignorer les éléments UI
            ui_elements = ['sideboard', 'mainboard', 'done', 'submit', 'commander', 
                          'best of three only', 'cards', 'deck', 'export', 'import']
            if text.lower() in ui_elements or len(text) < 3:
                continue
                
            # Extraire quantité et nom
            quantity = 1
            card_name = text
            
            # Patterns pour quantité
            if text and text[0].isdigit():
                try:
                    # Format: "4 Lightning Bolt" ou "4x Lightning Bolt"
                    parts = text.split(' ', 1)
                    if len(parts) == 2:
                        qty_str = parts[0].replace('x', '')
                        if qty_str.isdigit():
                            quantity = int(qty_str)
                            card_name = parts[1].strip()
                except:
                    pass
                    
            # Ajouter la carte
            if card_name and len(card_name) > 2:
                if card_name in cards:
                    cards[card_name] += quantity
                else:
                    cards[card_name] = quantity
                    
        return cards
        
    def process_full_deck(self, image_path):
        """Traite l'image complète pour extraire toutes les cartes"""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Impossible de charger l'image: {image_path}")
            
        # Extraire mainboard
        print("\n📋 EXTRACTION DU MAINBOARD", file=sys.stderr)
        mainboard_img = self.extract_mainboard(img)
        mainboard_cards = self.extract_cards_from_region(mainboard_img, "mainboard")
        
        # Extraire sideboard
        print("\n📋 EXTRACTION DU SIDEBOARD", file=sys.stderr)
        sideboard_img = self.extract_sideboard(img)
        sideboard_cards = self.extract_cards_from_region(sideboard_img, "sideboard")
        
        # Compter les cartes
        mainboard_count = sum(mainboard_cards.values())
        sideboard_count = sum(sideboard_cards.values())
        total_count = mainboard_count + sideboard_count
        
        return {
            "success": True,
            "mainboard": [
                {"name": name, "quantity": qty}
                for name, qty in mainboard_cards.items()
            ],
            "sideboard": [
                {"name": name, "quantity": qty}
                for name, qty in sideboard_cards.items()
            ],
            "stats": {
                "mainboard_unique": len(mainboard_cards),
                "mainboard_total": mainboard_count,
                "sideboard_unique": len(sideboard_cards),
                "sideboard_total": sideboard_count,
                "total_unique": len(mainboard_cards) + len(sideboard_cards),
                "total_cards": total_count
            }
        }

def main():
    """Test sur les images"""
    ocr = FullDeckOCR()
    
    for img_num in [1, 2]:
        image_path = f"/Volumes/DataDisk/_Projects/screen to deck/image{'' if img_num == 1 else img_num}.webp"
        
        print(f"\n{'='*60}")
        print(f"📸 ANALYSE COMPLÈTE IMAGE {img_num}")
        print(f"{'='*60}")
        
        try:
            result = ocr.process_full_deck(image_path)
            
            print(f"\n📊 STATISTIQUES:")
            stats = result['stats']
            print(f"  • Mainboard: {stats['mainboard_total']} cartes ({stats['mainboard_unique']} uniques)")
            print(f"  • Sideboard: {stats['sideboard_total']} cartes ({stats['sideboard_unique']} uniques)")
            print(f"  • TOTAL: {stats['total_cards']} / 75 cartes")
            
            if stats['total_cards'] < 75:
                print(f"\n❌ MANQUE {75 - stats['total_cards']} CARTES!")
            
            # Afficher les cartes trouvées
            if result['mainboard']:
                print(f"\n🎴 MAINBOARD ({stats['mainboard_total']} cartes):")
                for card in result['mainboard'][:10]:  # Montrer les 10 premières
                    print(f"  • {card['quantity']}x {card['name']}")
                if len(result['mainboard']) > 10:
                    print(f"  ... et {len(result['mainboard']) - 10} autres")
                    
            if result['sideboard']:
                print(f"\n🎴 SIDEBOARD ({stats['sideboard_total']} cartes):")
                for card in result['sideboard']:
                    print(f"  • {card['quantity']}x {card['name']}")
                    
        except Exception as e:
            print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    main()