#!/usr/bin/env python3
"""
🔍 Enhanced MTG OCR Parser - FIXED VERSION
Scanne intelligemment les NOMS de cartes uniquement (pas les règles)
Optimisé pour Magic Arena avec détection carte par carte
"""

import cv2
import numpy as np
import pytesseract
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
import asyncio
import os

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ocr_parser")

# Import du DeckProcessor pour le regroupement intelligent
try:
    from deck_processor import DeckProcessor
    DECK_PROCESSOR_AVAILABLE = True
except ImportError:
    DECK_PROCESSOR_AVAILABLE = False
    logger.warning("⚠️ DeckProcessor non disponible - regroupement intelligent désactivé")

@dataclass
class ParsedCard:
    """Représente une carte parsée depuis l'OCR"""
    name: str
    quantity: int
    original_text: str
    confidence: float
    is_validated: bool
    correction_applied: bool
    scryfall_data: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None

@dataclass
class ParseResult:
    """Résultat complet du parsing"""
    cards: List[ParsedCard]
    format_analysis: Optional[Any] = None
    total_cards: int = 0
    main_count: int = 0
    side_count: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    processing_notes: List[str] = field(default_factory=list)
    # Nouveaux attributs pour le regroupement intelligent
    processed_cards: Optional[List[Any]] = None
    export_text: Optional[str] = None

class MTGArenaOCR:
    """Module OCR intelligent pour Magic Arena"""
    
    def __init__(self, logger=None):
        self.logger = logger or logging.getLogger(__name__)
        
        # ZONES OPTIMISÉES - Ne scanner que les TITRES des cartes
        self.zone_definitions = {
            # Colonnes ajustées pour Arena standard
            "main_left":  (0.22, 0.47),   # Colonne gauche du main
            "main_right": (0.47, 0.72),   # Colonne droite du main
            "sideboard":  (0.82, 0.98)    # Colonne sideboard
        }
        
        # Configuration Tesseract pour les NOMS de cartes
        self.tesseract_config = (
            '--oem 3 --psm 13 '
            '-c tessedit_char_whitelist="'
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
            '0123456789 ,.\'-/:&"'
        )
        
        # Paramètres de scan
        self.card_height_pct = 0.08    # Hauteur d'une carte (~8% de l'écran)
        self.name_zone_height = 0.018  # Hauteur de la zone du nom (~1.8%)
        self.y_start_pct = 0.13        # Début du scan (après header Arena)
        self.max_cards_per_column = 12 # Maximum de cartes par colonne
        
    def process_screenshot_safe(self, image_path: str) -> Dict[str, Any]:
        """
        Traite un screenshot Arena et retourne les cartes détectées
        """
        self.logger.info(f"🔍 Traitement du screenshot: {image_path}")
        
        if not os.path.exists(image_path):
            self.logger.error(f"❌ Fichier introuvable: {image_path}")
            return {"main": [], "side": [], "stats": {"error": "File not found"}}
        
        image = cv2.imread(image_path)
        if image is None:
            self.logger.error(f"❌ Impossible de lire l'image: {image_path}")
            return {"main": [], "side": [], "stats": {"error": "Cannot read image"}}
        
        # Extraction des cartes
        main_cards = []
        main_cards.extend(self.extract_cards_smart(image, *self.zone_definitions["main_left"], "main_left"))
        main_cards.extend(self.extract_cards_smart(image, *self.zone_definitions["main_right"], "main_right"))
        
        side_cards = self.extract_cards_smart(image, *self.zone_definitions["sideboard"], "sideboard")
        
        # Statistiques
        stats = {
            "total": len(main_cards) + len(side_cards),
            "main_count": len(main_cards),
            "side_count": len(side_cards),
            "success_rate": self.calculate_success_rate(main_cards + side_cards)
        }
        
        self.logger.info(f"✅ Main deck: {len(main_cards)} cartes")
        self.logger.info(f"✅ Sideboard: {len(side_cards)} cartes")
        self.logger.info(f"📊 Total: {stats['total']} cartes détectées")
        
        return {
            "main": main_cards,
            "side": side_cards,
            "stats": stats
        }
    
    def extract_cards_smart(self, image: np.ndarray, x1_pct: float, x2_pct: float, zone_name: str) -> List[str]:
        """
        Méthode intelligente : scanne carte par carte au lieu de toute la colonne
        """
        h, w = image.shape[:2]
        x1, x2 = int(w * x1_pct), int(w * x2_pct)
        
        cards = []
        consecutive_empty = 0
        
        self.logger.debug(f"🔍 Scan de la zone {zone_name} ({x1_pct:.2f}-{x2_pct:.2f})")
        
        # Scanner chaque position de carte possible
        for card_index in range(self.max_cards_per_column):
            # Position Y de cette carte
            y_card_start_pct = self.y_start_pct + (card_index * self.card_height_pct)
            
            # Zone du nom uniquement
            y_name_start = int(h * y_card_start_pct)
            y_name_end = int(h * (y_card_start_pct + self.name_zone_height))
            
            # Vérifier les limites
            if y_name_end > h:
                break
            
            # Extraire la bande du nom
            name_strip = image[y_name_start:y_name_end, x1:x2]
            
            # Vérifier si cette zone contient du texte
            if self._has_text_content(name_strip):
                consecutive_empty = 0
                
                # OCR sur cette ligne
                text = self._ocr_card_name(name_strip)
                
                if text and self._is_valid_card_name(text):
                    # Nettoyer et valider le nom
                    clean_name = self._clean_card_name(text)
                    if clean_name:
                        cards.append(clean_name)
                        self.logger.info(f"[{zone_name}] Carte {card_index}: '{clean_name}'")
            else:
                consecutive_empty += 1
                # Si 3 emplacements vides consécutifs, on arrête
                if consecutive_empty >= 3:
                    break
        
        self.logger.debug(f"✅ {zone_name}: {len(cards)} cartes trouvées")
        return cards
    
    def _has_text_content(self, img_strip: np.ndarray) -> bool:
        """Vérifie si la bande contient du texte"""
        if img_strip.size == 0:
            return False
            
        gray = cv2.cvtColor(img_strip, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        text_pixels = cv2.countNonZero(binary)
        
        # Seuil adaptatif selon la taille
        threshold = img_strip.shape[0] * img_strip.shape[1] * 0.01
        return text_pixels > threshold
    
    def _ocr_card_name(self, name_strip: np.ndarray) -> str:
        """OCR optimisé pour les noms de cartes MTG"""
        if name_strip.size == 0:
            return ""
            
        # Prétraitement
        gray = cv2.cvtColor(name_strip, cv2.COLOR_BGR2GRAY)
        
        # Agrandir pour meilleure reconnaissance
        scale = 4
        enlarged = cv2.resize(gray, 
                            (gray.shape[1] * scale, gray.shape[0] * scale), 
                            interpolation=cv2.INTER_CUBIC)
        
        # Améliorer le contraste avec CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(enlarged)
        
        # Binarisation
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Débruitage
        denoised = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, 
                                   cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)))
        
        # OCR
        try:
            text = pytesseract.image_to_string(denoised, config=self.tesseract_config)
            return text.strip()
        except Exception as e:
            self.logger.error(f"Erreur OCR: {e}")
            return ""
    
    def _is_valid_card_name(self, text: str) -> bool:
        """Vérifie que c'est un nom de carte valide"""
        if not text or len(text) < 3:
            return False
            
        # Rejeter les fragments de règles
        rules_keywords = [
            'creature', 'instant', 'sorcery', 'enchantment', 'artifact',
            'planeswalker', 'battle', 'each', 'when', 'whenever', 'at the',
            'target', 'draw', 'gain', 'loses', 'gets', 'until', 'end of turn',
            'beginning', 'upkeep', 'combat', 'damage', 'mana', 'tapped'
        ]
        
        text_lower = text.lower()
        
        # Si ça contient trop de mots-clés de règles, c'est suspect
        keyword_count = sum(1 for kw in rules_keywords if kw in text_lower)
        if keyword_count >= 2:
            return False
        
        # Rejeter si c'est juste des chiffres ou symboles
        if text.isdigit() or not any(c.isalpha() for c in text):
            return False
        
        # Rejeter les lignes trop longues (probablement du texte de règles)
        if len(text) > 40:
            return False
            
        return True
    
    def _clean_card_name(self, text: str) -> str:
        """Nettoie un nom de carte"""
        # Supprimer les caractères parasites
        cleaned = re.sub(r'[^\w\s,.\'-/&:]', '', text)
        
        # Supprimer les espaces multiples
        cleaned = ' '.join(cleaned.split())
        
        # Capitaliser correctement
        words = cleaned.split()
        capitalized = []
        
        for word in words:
            if word.lower() in ['of', 'the', 'to', 'a', 'an', 'in', 'on', 'at', 'for']:
                capitalized.append(word.lower())
            else:
                capitalized.append(word.capitalize())
        
        if capitalized:
            capitalized[0] = capitalized[0].capitalize()
            
        return ' '.join(capitalized)
    
    def calculate_success_rate(self, cards: List[str]) -> float:
        """Calcule le taux de succès basé sur les patterns de cartes"""
        if not cards:
            return 0.0
            
        valid_patterns = sum(1 for card in cards if len(card) >= 3 and any(c.isalpha() for c in card))
        return (valid_patterns / len(cards)) * 100 if cards else 0.0
    
    def debug_show_scan_zones(self, image_path: str, output_path: str = "debug_zones.jpg") -> None:
        """Mode debug visuel pour voir exactement où on scanne"""
        image = cv2.imread(image_path)
        if image is None:
            self.logger.error("Impossible de lire l'image pour le debug")
            return
            
        debug_img = image.copy()
        h, w = image.shape[:2]
        
        # Couleurs pour chaque zone
        colors = {
            "main_left": (0, 255, 0),    # Vert
            "main_right": (255, 0, 0),   # Rouge
            "sideboard": (0, 0, 255)     # Bleu
        }
        
        # Dessiner les zones
        for zone_name, (x1_pct, x2_pct) in self.zone_definitions.items():
            x1 = int(w * x1_pct)
            x2 = int(w * x2_pct)
            color = colors.get(zone_name, (255, 255, 255))
            
            # Colonne complète (contour)
            cv2.rectangle(debug_img, 
                         (x1, int(h * self.y_start_pct)), 
                         (x2, int(h * 0.93)), 
                         color, 1)
            
            # Label de la zone
            cv2.putText(debug_img, zone_name, 
                       (x1 + 5, int(h * self.y_start_pct) - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            
            # Dessiner chaque position de carte
            for card_index in range(self.max_cards_per_column):
                y_card_start_pct = self.y_start_pct + (card_index * self.card_height_pct)
                y_name_start = int(h * y_card_start_pct)
                y_name_end = int(h * (y_card_start_pct + self.name_zone_height))
                
                if y_name_end > h:
                    break
                
                # Rectangle pour la zone du nom
                cv2.rectangle(debug_img, (x1, y_name_start), (x2, y_name_end), 
                             color, 2)
                
                # Numéro de la carte
                cv2.putText(debug_img, f"{card_index}", 
                           (x1 - 30, y_name_start + 15),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Info générale
        cv2.putText(debug_img, 
                   f"Scan zones - Card height: {self.card_height_pct*100:.1f}% - Name zone: {self.name_zone_height*100:.1f}%", 
                   (10, h - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.imwrite(output_path, debug_img)
        self.logger.info(f"✅ Debug image saved to {output_path}")
        self.logger.info("🔍 Vérifiez que les rectangles sont SUR LES NOMS des cartes !")


class MTGOCRParser:
    """Parser principal qui utilise MTGArenaOCR et gère la validation Scryfall"""
    
    def __init__(self, scryfall_service):
        self.scryfall_service = scryfall_service
        self.arena_ocr = MTGArenaOCR(logger=logger)
        self.logger = logger
        
    async def parse_deck_image(self, image_path: str, language: str = 'en', format_hint: str = None) -> ParseResult:
        """Parse une image de deck et valide avec Scryfall"""
        self.logger.info(f"📋 Parsing deck image: {image_path}")
        
        # Extraction OCR
        ocr_result = self.arena_ocr.process_screenshot_safe(image_path)
        all_lines = ocr_result["main"] + ocr_result["side"]
        
        if not all_lines:
            self.logger.warning("⚠️ Aucune carte détectée dans l'image")
            return ParseResult(
                cards=[],
                total_cards=0,
                errors=["No cards detected in image"]
            )
        
        # Parsing des cartes
        parsed_cards = await self._parse_cards_enhanced(all_lines, language)
        
        # Validation Scryfall
        validated_cards = await self._validate_cards_batch(parsed_cards, language)
        
        # Analyse du format si demandé
        format_analysis = None
        if format_hint or len(validated_cards) > 0:
            format_analysis = await self._analyze_deck_comprehensive(validated_cards, format_hint)
        
        # Calcul des stats
        main_count = ocr_result["stats"]["main_count"]
        side_count = ocr_result["stats"]["side_count"]
        
        # Générer les warnings sur les cartes douteuses
        warnings = getattr(self, 'low_confidence_cards', [])
        # Notes de traitement (exemple : on peut ajouter des logs ou infos ici)
        processing_notes = []
        
        # Calcul du score de confiance global (moyenne des cartes validées)
        if validated_cards:
            confidence_score = sum(c.confidence for c in validated_cards) / len(validated_cards)
        else:
            confidence_score = 0.0
        
        # NOUVEAU : Regroupement intelligent et génération de export_text
        processed_cards = None
        export_text = None
        
        if DECK_PROCESSOR_AVAILABLE and validated_cards:
            try:
                self.logger.info("🎯 Application du regroupement intelligent")
                
                # Séparer main et sideboard
                main_tuples = []
                side_tuples = []
                
                for card in validated_cards:
                    tuple_card = (card.name, card.quantity)
                    # Pour l'instant, toutes les cartes vont dans le main
                    # TODO: Détecter automatiquement le sideboard selon la position OCR
                    if hasattr(card, 'is_sideboard') and card.is_sideboard:
                        side_tuples.append(tuple_card)
                    else:
                        main_tuples.append(tuple_card)
                
                # Traitement avec DeckProcessor
                processor = DeckProcessor(strict_mode=False)
                processed_cards, validation = processor.process_deck(main_tuples, side_tuples)
                
                # Génération de l'export MTGA
                export_text = processor.export_to_format(processed_cards, 'mtga')
                
                self.logger.info(f"✅ Regroupement terminé: {len(processed_cards)} cartes uniques")
                self.logger.info(f"📊 Validation: {validation.main_count} main, {validation.side_count} side")
                
                # Ajouter les infos de validation aux notes
                processing_notes.append(f"Regroupement intelligent appliqué: {len(validated_cards)} → {len(processed_cards)} cartes")
                processing_notes.append(f"Totaux après regroupement: {validation.main_count} main, {validation.side_count} side")
                
                if validation.warnings:
                    processing_notes.extend([f"Avertissement: {w}" for w in validation.warnings])
                    
            except Exception as e:
                self.logger.error(f"❌ Erreur lors du regroupement intelligent: {e}")
                processing_notes.append(f"Erreur regroupement: {e}")
        
        return ParseResult(
            cards=validated_cards,
            format_analysis=format_analysis,
            total_cards=len(validated_cards),
            main_count=main_count,
            side_count=side_count,
            errors=[],
            warnings=warnings,
            confidence_score=confidence_score,
            processing_notes=processing_notes,
            processed_cards=processed_cards,
            export_text=export_text
        )
    
    async def _parse_cards_enhanced(self, lines: List[str], language: str) -> List[ParsedCard]:
        """Parse les lignes extraites en cartes selon les règles OCR du projet"""
        parsed_cards = []
        
        # Patterns de parsing
        patterns = [
            (r'^(\d+)x?\s+(.+)$', lambda m: (int(m.group(1)), m.group(2))),
            (r'^(.+?)\s+x?(\d+)$', lambda m: (int(m.group(2)), m.group(1))),
            (r'^(\d+)\s+(.+)$', lambda m: (int(m.group(1)), m.group(2))),
            (r'^(.+)$', lambda m: (1, m.group(1)))  # Règle fondamentale : si pas de nombre, quantité = 1
        ]
        
        for line in lines:
            if not line or len(line) < 3:
                continue
            
            quantity = 1
            name = line
            
            # Essayer les patterns
            for pattern, extractor in patterns:
                match = re.match(pattern, line.strip())
                if match:
                    try:
                        quantity, name = extractor(match)
                        break
                    except:
                        continue
            # Appliquer la règle : si aucun nombre détecté, quantité = 1
            # (déjà géré par le dernier pattern)
            # Nettoyer le nom
            name = name.strip()
            
            # Créer la carte parsée
            parsed_card = ParsedCard(
                name=name,
                quantity=quantity,
                original_text=line,
                confidence=0.8,
                is_validated=False,
                correction_applied=False
            )
            parsed_cards.append(parsed_card)
        return parsed_cards
    
    async def _validate_cards_batch(self, parsed_cards: List[ParsedCard], language: str) -> List[ParsedCard]:
        """Valide les cartes avec Scryfall, avec gestion avancée du score de confiance et suggestions"""
        validated = []
        self.low_confidence_cards = []  # Pour warnings globaux
        for card in parsed_cards:
            match = await self.scryfall_service.enhanced_card_search(card.name, language)
            if match and match.matched_name:
                # Correction automatique si confiance élevée
                if match.confidence >= 0.90:
                    card.name = match.matched_name
                    card.is_validated = True
                    card.correction_applied = match.correction_applied
                    card.confidence = match.confidence
                    card.scryfall_data = match.card_data
                # Marquage douteux si confiance moyenne
                elif 0.70 <= match.confidence < 0.90:
                    card.suggestions = [match.matched_name] + (match.suggestions or [])
                    card.confidence = match.confidence
                    card.is_validated = False
                    card.correction_applied = match.correction_applied
                    self.low_confidence_cards.append(f"{card.original_text} → Suggestion : {match.matched_name} (confiance {match.confidence:.2f})")
                # Faible confiance ou non reconnu
                else:
                    card.suggestions = match.suggestions or []
                    card.confidence = match.confidence
                    card.is_validated = False
                    card.correction_applied = False
                    self.low_confidence_cards.append(f"{card.original_text} → Non reconnu (confiance {match.confidence:.2f})")
                validated.append(card)
            else:
                # Aucune correspondance, garder le nom OCR et suggestions
                card.suggestions = match.suggestions if match else []
                card.confidence = match.confidence if match else 0.0
                card.is_validated = False
                card.correction_applied = False
                self.low_confidence_cards.append(f"{card.original_text} → Non reconnu (aucune suggestion)")
                validated.append(card)
        return validated
    
    async def _analyze_deck_comprehensive(self, cards: List[ParsedCard], format_hint: str = None):
        """Analyse complète du deck"""
        card_names = [card.name for card in cards if card.is_validated]
        
        if not card_names:
            return None
            
        return await self.scryfall_service.analyze_deck_comprehensive(
            card_names,
            format_hint
        )
    
    def extract_text_from_image(self, image_path: str) -> List[str]:
        """Méthode de compatibilité pour l'ancien code"""
        ocr_result = self.arena_ocr.process_screenshot_safe(image_path)
        return ocr_result["main"] + ocr_result["side"] 