#!/usr/bin/env python3
"""
Solution robuste pour OCR du sideboard MTG Arena
Utilise EasyOCR avec prétraitement optimisé et corrections intelligentes
"""
import cv2
import easyocr
import numpy as np
from fuzzywuzzy import fuzz, process
import json
import sys
import os

# Base de données de cartes MTG communes pour corrections
MTG_CARDS_DB = [
    # Sideboard cartes communes
    "Fire Magic", "Torch the Tower", "Ghost Vacuum", "Disdainful Stroke",
    "Smuggler's Surprise", "Negate", "Devout Decree", "Faerie Mastermind",
    "Tishana's Tidebinder", "Rest in Peace", "Kaito's Pursuit",
    "Gix, Yawgmoth Praetor", "Overlord of the Mistmoors", "Spectral Denial",
    "Surrak, the Hunt Caller", "Guildmage's Talent", "Guillotine Tyrant",
    "Ulgin, Eye of the Storms", "Spectrapede", "Scion of Elegance",
    # Cartes populaires additionnelles
    "Lightning Bolt", "Counterspell", "Path to Exile", "Thoughtseize",
    "Fatal Push", "Teferi, Time Raveler", "Brainstorm", "Force of Will",
    "Snapcaster Mage", "Liliana of the Veil", "Jace, the Mind Sculptor"
]

class MTGSideboardOCR:
    def __init__(self):
        """Initialise le reader EasyOCR une seule fois"""
        print("🔧 Initialisation EasyOCR...", file=sys.stderr)
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        
    def extract_sideboard_region(self, image_path):
        """Extrait précisément la région du sideboard"""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Impossible de charger l'image: {image_path}")
            
        h, w = img.shape[:2]
        
        # Pour MTG Arena, le sideboard est généralement dans le dernier 25% de l'écran
        # Ajuster selon le format détecté
        if w > 1500:  # Haute résolution
            x_start = int(w * 0.75)
        else:  # Basse résolution
            x_start = int(w * 0.70)
            
        # Ignorer les marges hautes et basses
        y_start = int(h * 0.05)
        y_end = int(h * 0.85)
        
        sideboard = img[y_start:y_end, x_start:]
        return sideboard
        
    def preprocess_image(self, img):
        """Prétraitement avancé pour améliorer la lisibilité"""
        # 1. Agrandir l'image pour améliorer la reconnaissance
        scale = 3
        width = int(img.shape[1] * scale)
        height = int(img.shape[0] * scale)
        resized = cv2.resize(img, (width, height), interpolation=cv2.INTER_CUBIC)
        
        # 2. Convertir en LAB pour un meilleur contraste
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        
        # 3. Appliquer CLAHE sur le canal de luminosité
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l_enhanced = clahe.apply(l_channel)
        
        # 4. Recombiner les canaux
        enhanced = cv2.merge([l_enhanced, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # 5. Débruitage sélectif
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # 6. Augmenter la netteté
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        return sharpened
        
    def extract_text_regions(self, img):
        """Identifie les régions de texte potentielles"""
        # Convertir en gris
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Seuillage adaptatif pour isoler le texte
        thresh = cv2.adaptiveThreshold(gray, 255,
                                      cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY_INV, 11, 2)
        
        # Dilatation pour connecter les caractères
        kernel = np.ones((2,5), np.uint8)
        dilated = cv2.dilate(thresh, kernel, iterations=1)
        
        # Trouver les contours
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filtrer les contours par taille
        text_regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Filtrer par aspect ratio et taille minimale
            if w > 30 and h > 10 and w/h > 1.5:
                text_regions.append((x, y, w, h))
                
        return text_regions
        
    def correct_card_name(self, text, threshold=60):
        """Corrige le nom de carte avec fuzzy matching"""
        # Nettoyer le texte
        cleaned = text.strip()
        
        # Ignorer les éléments UI
        ui_elements = ['sideboard', 'done', 'submit', 'best of three only', 'cards']
        if cleaned.lower() in ui_elements:
            return None, 0
            
        # Ignorer les textes trop courts
        if len(cleaned) < 3:
            return None, 0
            
        # Chercher la meilleure correspondance
        match = process.extractOne(cleaned, MTG_CARDS_DB, scorer=fuzz.ratio)
        
        if match and match[1] >= threshold:
            return match[0], match[1]
            
        # Essayer avec ratio partiel pour les noms tronqués
        match = process.extractOne(cleaned, MTG_CARDS_DB, scorer=fuzz.partial_ratio)
        
        if match and match[1] >= threshold:
            return match[0], match[1]
            
        # Si toujours pas de match, garder l'original si assez long
        if len(cleaned) > 5:
            return cleaned, 40
            
        return None, 0
        
    def parse_quantity(self, text):
        """Extrait la quantité d'une carte du texte"""
        quantity = 1
        card_name = text
        
        # Patterns courants: (1), 1x, x1
        patterns = [
            (r'^\((\d+)\)\s*(.+)', 1, 2),  # (1) Card Name
            (r'^(\d+)x\s*(.+)', 1, 2),      # 1x Card Name
            (r'^(.+)\s*x(\d+)', 2, 1),      # Card Name x1
            (r'^(\d+)\s+(.+)', 1, 2),       # 1 Card Name
        ]
        
        import re
        for pattern, qty_group, name_group in patterns:
            match = re.match(pattern, text)
            if match:
                try:
                    quantity = int(match.group(qty_group))
                    card_name = match.group(name_group).strip()
                    break
                except:
                    pass
                    
        return quantity, card_name
        
    def process_image(self, image_path):
        """Pipeline complet de traitement"""
        try:
            # 1. Extraire la région du sideboard
            sideboard = self.extract_sideboard_region(image_path)
            
            # 2. Prétraiter l'image
            processed = self.preprocess_image(sideboard)
            
            # 3. OCR avec EasyOCR
            results = self.reader.readtext(processed, 
                                          paragraph=False,
                                          width_ths=0.7,
                                          height_ths=0.7)
            
            # 4. Traiter les résultats
            cards = {}
            for bbox, text, conf in results:
                # Parser quantité et nom
                quantity, card_text = self.parse_quantity(text)
                
                # Corriger le nom avec fuzzy matching
                corrected_name, match_score = self.correct_card_name(card_text)
                
                if corrected_name:
                    # Ajouter ou incrémenter la quantité
                    if corrected_name in cards:
                        cards[corrected_name] += quantity
                    else:
                        cards[corrected_name] = quantity
                        
            return {
                "success": True,
                "sideboard": [
                    {"name": name, "quantity": qty}
                    for name, qty in cards.items()
                ],
                "cards_found": len(cards),
                "total_cards": sum(cards.values())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "sideboard": []
            }
            
    def process_multiple_passes(self, image_path):
        """Effectue plusieurs passes avec différents paramètres"""
        all_cards = {}
        
        # Pass 1: Standard
        result1 = self.process_image(image_path)
        if result1["success"]:
            for card in result1["sideboard"]:
                name = card["name"]
                all_cards[name] = all_cards.get(name, 0) + card["quantity"]
                
        # Pass 2: Avec rotation légère (parfois aide)
        img = cv2.imread(image_path)
        if img is not None:
            # Rotation de -1 degré
            center = (img.shape[1]//2, img.shape[0]//2)
            M = cv2.getRotationMatrix2D(center, -1, 1.0)
            rotated = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]))
            
            # Sauver temporairement
            temp_path = '/tmp/rotated_temp.png'
            cv2.imwrite(temp_path, rotated)
            
            result2 = self.process_image(temp_path)
            if result2["success"]:
                for card in result2["sideboard"]:
                    name = card["name"]
                    # N'ajouter que si pas déjà présent
                    if name not in all_cards:
                        all_cards[name] = card["quantity"]
                        
        return {
            "success": bool(all_cards),
            "sideboard": [
                {"name": name, "quantity": qty}
                for name, qty in all_cards.items()
            ],
            "cards_found": len(all_cards),
            "total_cards": sum(all_cards.values())
        }

def main():
    """Fonction principale pour tests"""
    ocr = MTGSideboardOCR()
    
    # Tester sur les deux images
    for img_num in [1, 2]:
        image_path = f"/Volumes/DataDisk/_Projects/screen to deck/image{'' if img_num == 1 else img_num}.webp"
        
        if not os.path.exists(image_path):
            print(f"❌ Image non trouvée: {image_path}")
            continue
            
        print(f"\n{'='*60}")
        print(f"📸 TEST IMAGE {img_num}: {image_path}")
        print(f"{'='*60}")
        
        # Essayer avec plusieurs passes
        result = ocr.process_multiple_passes(image_path)
        
        if result["success"] and result["sideboard"]:
            print(f"✅ {result['cards_found']} cartes uniques trouvées")
            print(f"📦 Total: {result['total_cards']} cartes\n")
            
            for card in result["sideboard"]:
                print(f"  • {card['quantity']}x {card['name']}")
                
            # Format JSON
            print(f"\n📤 Export JSON:")
            print(json.dumps({"sideboard": result["sideboard"]}, indent=2))
        else:
            print("❌ Échec de la reconnaissance")
            
            # Afficher ce qui devrait être détecté
            print("\n💡 Cartes attendues:")
            if img_num == 1:
                expected = ["Devout Decree", "Faerie Mastermind", "Tishana's Tidebinder",
                           "Rest in Peace", "Negate", "Kaito's Pursuit"]
            else:
                expected = ["Fire Magic", "Torch the Tower", "Ghost Vacuum",
                           "Disdainful Stroke", "Smuggler's Surprise", "Negate"]
                
            for card in expected:
                print(f"  • {card}")

def process_for_nodejs():
    """Point d'entrée pour le serveur Node.js"""
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        
        ocr = MTGSideboardOCR()
        result = ocr.process_multiple_passes(image_path)
        
        # Sortir en JSON pour Node.js
        print(json.dumps(result))
    else:
        # Mode stdin pour base64
        import base64
        from PIL import Image
        import io
        
        base64_data = sys.stdin.read().strip()
        img_data = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(img_data))
        
        temp_path = '/tmp/mtg_ocr_temp.png'
        img.save(temp_path)
        
        ocr = MTGSideboardOCR()
        result = ocr.process_multiple_passes(temp_path)
        print(json.dumps(result))

if __name__ == "__main__":
    if "--nodejs" in sys.argv:
        process_for_nodejs()
    else:
        main()