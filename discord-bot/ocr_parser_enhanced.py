#!/usr/bin/env python3
"""
🔧 CORRECTIF GLOBAL pour ocr_parser.py
Cette version intègre :
1. Un pipeline de prétraitement d'image robuste pour améliorer radicalement l'OCR.
2. L'utilisation de la recherche floue (fuzzy) sur Scryfall pour plus de tolérance.
3. La correction du bug de transmission des données au DeckProcessor.
"""

import cv2
import pytesseract
import numpy as np
import re
import logging
import os
import asyncio
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field

from deck_processor import DeckProcessor, ProcessedCard, ValidationResult
from scryfall_service import ScryfallService

# Configuration du logger
logger = logging.getLogger("ocr_parser_enhanced")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# --- Dataclasses (mis à jour) ---
@dataclass
class ParsedCard:
    name: str
    quantity: int
    original_text: str
    is_sideboard: bool
    confidence: float = 0.0
    is_validated: bool = False
    correction_applied: bool = False
    scryfall_data: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None

@dataclass
class ParseResult:
    cards: List[ParsedCard] = field(default_factory=list)
    processed_cards: List[ProcessedCard] = field(default_factory=list)
    validation: Optional[ValidationResult] = None
    export_text: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    processing_notes: List[str] = field(default_factory=list)
    total_cards: int = 0
    main_count: int = 0
    side_count: int = 0
    format_analysis: Optional[Any] = None

# --- Module OCR Amélioré ---
class AdvancedMTGArenaOCR:
    """
    Module OCR avec un pipeline de prétraitement d'image avancé
    pour une reconnaissance de caractères de haute fidélité.
    """
    def __init__(self, lang='eng'):
        self.lang = lang
        # Configuration Tesseract optimisée pour les noms de cartes MTG
        self.tesseract_config = (
            '--oem 3 --psm 6 '
            '-c tessedit_char_whitelist="'
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
            '0123456789 ,.\'-/:&"'
        )
        logger.info(f"AdvancedOCR initialisé avec la config: {self.tesseract_config}")

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Applique une chaîne de prétraitement robuste pour maximiser la qualité de l'OCR.
        """
        logger.info("🔧 Début du prétraitement d'image avancé")
        
        # 1. Mise à l'échelle pour une hauteur de caractères optimale
        h, w = image.shape[:2]
        target_height = 1600  # Augmenté pour plus de précision
        scale_factor = target_height / h
        scaled = cv2.resize(image, (int(w * scale_factor), int(h * scale_factor)), 
                           interpolation=cv2.INTER_LANCZOS4)
        logger.info(f"  📏 Image redimensionnée: {w}x{h} → {scaled.shape[1]}x{scaled.shape[0]} (facteur: {scale_factor:.2f})")
        
        # 2. Conversion en niveaux de gris
        gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
        
        # 3. Débruitage avancé multi-étapes
        # Étape 3a: Filtre médian pour éliminer le bruit impulsionnel
        median_filtered = cv2.medianBlur(gray, 3)
        
        # Étape 3b: Filtre gaussien pour lisser
        denoised = cv2.GaussianBlur(median_filtered, (3, 3), 0)
        
        # Étape 3c: Filtre bilatéral pour préserver les contours
        bilateral = cv2.bilateralFilter(denoised, 9, 75, 75)
        
        # 4. Amélioration du contraste avec CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(bilateral)
        
        # 5. Essayer plusieurs méthodes de binarisation et garder la meilleure
        # Méthode 1: Binarisation adaptative
        binary1 = cv2.adaptiveThreshold(
            enhanced, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            15,  # Taille du bloc augmentée
            4    # Constante C
        )
        
        # Méthode 2: Binarisation d'Otsu
        _, binary2 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Méthode 3: Binarisation adaptative avec moyenne
        binary3 = cv2.adaptiveThreshold(
            enhanced, 255,
            cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY,
            15, 8
        )
        
        # Sauvegarder les différentes versions pour debug
        cv2.imwrite("debug_adaptive.png", binary1)
        cv2.imwrite("debug_otsu.png", binary2)
        cv2.imwrite("debug_mean.png", binary3)
        
        # Utiliser la binarisation adaptative par défaut
        binary = binary1
        
        # 6. Nettoyage morphologique pour éliminer le bruit
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # 7. Dilatation légère pour améliorer la connectivité des caractères
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
        final = cv2.dilate(cleaned, kernel_dilate, iterations=1)
        
        logger.info("  ✅ Prétraitement d'image terminé")
        return final

    def extract_text_from_image(self, image_path: str) -> str:
        """
        Traite une image complète et en extrait le texte brut.
        """
        logger.info(f"🔍 Début de l'extraction de texte depuis : {image_path}")
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise FileNotFoundError(f"Image introuvable ou illisible à : {image_path}")

            preprocessed_image = self._preprocess_image(image)
            
            # Sauvegarder l'image prétraitée pour le débogage
            debug_path = "preprocessed_debug.png"
            cv2.imwrite(debug_path, preprocessed_image)
            logger.info(f"  💾 Image prétraitée sauvegardée : {debug_path}")

            text = pytesseract.image_to_string(preprocessed_image, config=self.tesseract_config)
            logger.info("  ✅ Extraction de texte par Tesseract terminée")
            logger.info(f"  📝 Texte extrait ({len(text)} caractères)")
            
            return text

        except Exception as e:
            logger.error(f"❌ Erreur lors du traitement OCR de {image_path}: {e}", exc_info=True)
            return ""

# --- Parser Principal Corrigé ---
class MTGOCRParser:
    """
    Parser principal qui utilise l'OCR avancé, la recherche floue et
    corrige le flux de données vers le DeckProcessor.
    """
    def __init__(self, scryfall_service: ScryfallService):
        self.scryfall_service = scryfall_service
        self.arena_ocr = AdvancedMTGArenaOCR()
        self.deck_processor = DeckProcessor(strict_mode=False)
        self.logger = logger

    def _filter_ocr_noise(self, text: str) -> str:
        """
        🔧 FILTRAGE INTELLIGENT DU BRUIT OCR
        Nettoie le texte OCR en supprimant les lignes qui ne peuvent pas être des noms de cartes
        """
        lines = text.split('\n')
        filtered_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Ignorer les lignes vides ou trop courtes
            if not line or len(line) < 3:
                continue
            
            # Ignorer les lignes avec trop de caractères spéciaux
            special_chars = sum(1 for c in line if not c.isalnum() and c not in ' \'-')
            if special_chars > len(line) * 0.4:  # Plus de 40% de caractères spéciaux
                logger.debug(f"  🗑️ Ligne rejetée (trop de caractères spéciaux): '{line[:30]}...'")
                continue
            
            # Ignorer les lignes avec des séquences répétitives suspectes
            if re.search(r'(.{3,})\1{2,}', line):  # Répétition de 3+ caractères
                logger.debug(f"  🗑️ Ligne rejetée (répétition suspecte): '{line[:30]}...'")
                continue
            
            # Ignorer les lignes qui ressemblent à du texte de règles
            rules_keywords = ['when', 'if', 'target', 'draw', 'damage', 'graveyard', 'battlefield', 'enters', 'cast']
            if any(keyword in line.lower() for keyword in rules_keywords):
                logger.debug(f"  🗑️ Ligne rejetée (texte de règles): '{line[:30]}...'")
                continue
            
            # Ignorer les lignes avec trop de mots courts (probablement du bruit)
            words = line.split()
            short_words = sum(1 for word in words if len(word) <= 2)
            if len(words) > 3 and short_words > len(words) * 0.6:
                logger.debug(f"  🗑️ Ligne rejetée (trop de mots courts): '{line[:30]}...'")
                continue
            
            filtered_lines.append(line)
        
        filtered_text = '\n'.join(filtered_lines)
        logger.info(f"  🧹 Filtrage OCR: {len(lines)} → {len(filtered_lines)} lignes conservées")
        return filtered_text

    def _parse_raw_text(self, text: str) -> Tuple[List[Tuple[str, int]], List[Tuple[str, int]]]:
        """
        Analyse le texte brut de l'OCR pour séparer le deck principal du sideboard.
        Retourne deux listes de tuples (nom_brut, quantité).
        """
        logger.info("📋 Parsing du texte brut OCR")
        
        # NOUVEAU: Filtrage intelligent du bruit OCR
        filtered_text = self._filter_ocr_noise(text)
        
        main_cards = []
        side_cards = []
        is_sideboard = False
        
        # Patterns de reconnaissance améliorés
        patterns = [
            (r'^\s*(\d+)\s+(.+)$', lambda m: (int(m.group(1)), m.group(2).strip())),
            (r'^\s*(\d+)x\s+(.+)$', lambda m: (int(m.group(1)), m.group(2).strip())),
            (r'^\s*(.+?)\s+x?(\d+)\s*$', lambda m: (int(m.group(2)), m.group(1).strip())),
            (r'^\s*(.+)$', lambda m: (1, m.group(1).strip()))  # Défaut: quantité = 1
        ]

        for line in filtered_text.split('\n'):
            line = line.strip()
            if not line or len(line) < 3:
                continue

            # Détection du passage au sideboard
            if line.lower() in ['sideboard', 'side', 'reserve', 'sb']:
                is_sideboard = True
                logger.info("  🔄 Passage au sideboard détecté")
                continue
            
            # Ignorer l'en-tête "Deck"
            if line.lower() in ['deck', 'main', 'maindeck']:
                continue

            # Essayer les patterns de reconnaissance
            quantity = 1
            name = line
            
            for pattern, extractor in patterns:
                match = re.match(pattern, line)
                if match:
                    try:
                        quantity, name = extractor(match)
                        break
                    except (ValueError, IndexError):
                        continue
            
            # Nettoyage amélioré du nom de carte
            name = re.sub(r'[^\w\s\'-/]', '', name).strip()  # Garder les '/' pour les cartes double-face
            name = re.sub(r'\s+', ' ', name)  # Normaliser les espaces
            
            if not name or len(name) < 3:  # Augmenté à 3 caractères minimum
                continue

            if is_sideboard:
                side_cards.append((name, quantity))
                logger.debug(f"  [SIDE] {quantity}x {name}")
            else:
                main_cards.append((name, quantity))
                logger.debug(f"  [MAIN] {quantity}x {name}")

        logger.info(f"  ✅ Parsing terminé. Main: {len(main_cards)} entrées, Side: {len(side_cards)} entrées")
        return main_cards, side_cards

    async def _validate_and_normalize_cards(self, card_tuples: List[Tuple[str, int]], is_sideboard: bool) -> List[ParsedCard]:
        """
        Valide une liste de cartes brutes avec la recherche floue Scryfall.
        """
        zone_name = "sideboard" if is_sideboard else "main"
        logger.info(f"🔍 Validation {zone_name} avec recherche floue Scryfall")
        
        validated_list = []
        for name, quantity in card_tuples:
            logger.info(f"  🔎 Validation de '{name}'...")
            
            try:
                # Utilisation de la recherche FUZZY existante
                match_data = await self.scryfall_service.search_card_fuzzy(name)

                if match_data:
                    canonical_name = match_data['name']
                    logger.info(f"    ✅ Succès: '{name}' → '{canonical_name}'")
                    validated_list.append(ParsedCard(
                        name=canonical_name,
                        quantity=quantity,
                        original_text=f"{quantity} {name}",
                        is_sideboard=is_sideboard,
                        is_validated=True,
                        correction_applied=(name.lower() != canonical_name.lower()),
                        scryfall_data=match_data,
                        confidence=0.9
                    ))
                else:
                    logger.warning(f"    ⚠️ Échec: Impossible de valider '{name}'")
                    # Garder la carte non validée pour l'afficher à l'utilisateur
                    validated_list.append(ParsedCard(
                        name=name,
                        quantity=quantity,
                        original_text=f"{quantity} {name}",
                        is_sideboard=is_sideboard,
                        is_validated=False,
                        confidence=0.3
                    ))
            except Exception as e:
                logger.error(f"    ❌ Erreur lors de la validation de '{name}': {e}")
                validated_list.append(ParsedCard(
                    name=name,
                    quantity=quantity,
                    original_text=f"{quantity} {name}",
                    is_sideboard=is_sideboard,
                    is_validated=False,
                    confidence=0.1
                ))
                
        logger.info(f"  ✅ Validation {zone_name} terminée: {len(validated_list)} cartes")
        return validated_list

    async def parse_deck_image(self, image_path: str, language: str = 'en', format_hint: str = 'standard') -> ParseResult:
        """
        Pipeline complet : OCR > Parsing > Validation Floue > Regroupement > Export.
        """
        logger.info(f"🚀 DÉBUT DU PIPELINE COMPLET AMÉLIORÉ POUR {image_path}")

        try:
            # 1. OCR avancé pour obtenir le texte brut
            logger.info("📷 Phase 1: OCR avancé")
            raw_text = self.arena_ocr.extract_text_from_image(image_path)
            if not raw_text or len(raw_text.strip()) < 10:
                return ParseResult(
                    errors=["Échec critique de l'OCR. L'image est peut-être vide ou illisible."],
                    processing_notes=["OCR n'a produit aucun texte exploitable"]
                )

            # 2. Analyse du texte brut pour séparer deck/sideboard
            logger.info("📋 Phase 2: Parsing du texte")
            raw_main, raw_side = self._parse_raw_text(raw_text)

            if not raw_main and not raw_side:
                return ParseResult(
                    errors=["Aucune carte détectée dans le texte OCR"],
                    processing_notes=[f"Texte OCR brut: {raw_text[:200]}..."]
                )

            # 3. Validation et normalisation avec Scryfall (recherche floue)
            logger.info("🔍 Phase 3: Validation Scryfall avec recherche floue")
            validated_main = await self._validate_and_normalize_cards(raw_main, is_sideboard=False)
            validated_side = await self._validate_and_normalize_cards(raw_side, is_sideboard=True)

            all_cards = validated_main + validated_side
            validated_cards = [c for c in all_cards if c.is_validated]

            if not validated_cards:
                return ParseResult(
                    cards=all_cards,
                    errors=["Aucune carte n'a pu être validée avec Scryfall"],
                    warnings=["Toutes les cartes détectées ont échoué à la validation"],
                    processing_notes=[f"Cartes détectées mais non validées: {[c.name for c in all_cards]}"]
                )

            # 4. Regroupement avec DeckProcessor (FLUX DE DONNÉES CORRIGÉ)
            logger.info("🎯 Phase 4: Regroupement intelligent")
            main_tuples = [(c.name, c.quantity) for c in validated_cards if not c.is_sideboard]
            side_tuples = [(c.name, c.quantity) for c in validated_cards if c.is_sideboard]

            logger.info(f"  📊 Données pour DeckProcessor: {len(main_tuples)} main, {len(side_tuples)} side")
            
            processed_cards, validation = self.deck_processor.process_deck(main_tuples, side_tuples)
            
            # 5. Génération du texte d'export final
            logger.info("📤 Phase 5: Génération de l'export")
            export_text = self.deck_processor.export_to_format(processed_cards, 'mtga')
            
            # 6. Calcul des statistiques
            confidence_score = sum(c.confidence for c in validated_cards) / len(validated_cards) if validated_cards else 0.0
            
            processing_notes = [
                f"OCR avancé appliqué avec succès",
                f"Recherche floue Scryfall utilisée",
                f"Cartes validées: {len(validated_cards)}/{len(all_cards)}",
                f"Regroupement: {len(all_cards)} → {len(processed_cards)} cartes uniques"
            ]

            logger.info("🎉 PIPELINE TERMINÉ AVEC SUCCÈS")

            return ParseResult(
                cards=all_cards,
                processed_cards=processed_cards,
                validation=validation,
                export_text=export_text,
                warnings=validation.warnings if validation else [],
                errors=validation.errors if validation else [],
                confidence_score=confidence_score,
                processing_notes=processing_notes,
                total_cards=len(validated_cards),
                main_count=len(main_tuples),
                side_count=len(side_tuples)
            )

        except Exception as e:
            logger.error(f"❌ Erreur critique dans le pipeline: {e}", exc_info=True)
            return ParseResult(
                errors=[f"Erreur critique: {str(e)}"],
                processing_notes=[f"Pipeline interrompu à cause de: {type(e).__name__}"]
            )

    def extract_text_from_image(self, image_path: str) -> List[str]:
        """Méthode de compatibilité pour l'ancien code"""
        raw_text = self.arena_ocr.extract_text_from_image(image_path)
        return raw_text.split('\n') if raw_text else []

# --- Exemple d'utilisation (pour test) ---
async def main_test():
    """Test du parser amélioré"""
    if not os.path.exists('test_deck.png'):
        print("Fichier 'test_deck.png' non trouvé pour le test.")
        return

    from scryfall_service import ScryfallService
    
    async with ScryfallService() as scryfall:
        parser = MTGOCRParser(scryfall)
        result = await parser.parse_deck_image('test_deck.png')

        print("\n--- RÉSULTAT FINAL ---")
        if result.export_text:
            print(result.export_text)
        else:
            print("Aucun export généré.")

        if result.errors:
            print("\nERREURS:")
            for e in result.errors:
                print(f"- {e}")
        
        if result.warnings:
            print("\nAVERTISSEMENTS:")
            for w in result.warnings:
                print(f"- {w}")

        print(f"\nSTATISTIQUES:")
        print(f"- Confiance: {result.confidence_score:.1%}")
        print(f"- Cartes totales: {result.total_cards}")
        print(f"- Main: {result.main_count}, Side: {result.side_count}")

if __name__ == '__main__':
    print("Ce fichier est un module et doit être importé.")
    # Pour tester: asyncio.run(main_test()) 