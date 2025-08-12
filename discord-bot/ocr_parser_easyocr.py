#!/usr/bin/env python3
"""
🚀 CORRECTIF FINAL (v3) pour ocr_parser.py
Cette version remplace le moteur Tesseract par EasyOCR, un moteur
basé sur des modèles d'IA modernes, pour une reconnaissance de
caractères nettement supérieure.
"""

import cv2
import easyocr  # Import du nouveau moteur
import numpy as np
import re
import logging
import os
import asyncio
import time # Ajout pour l'horodatage
import uuid # Ajout pour l'unicité
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field
from pathlib import Path
from skimage.filters import threshold_local
from utils.logger import setup_logger, trace_ocr_performance

from deck_processor import DeckProcessor, ProcessedCard, ValidationResult
from scryfall_service import ScryfallService

# Import du correcteur MTGO
import sys
sys.path.append('..')
try:
    from mtgo_land_correction_rule import MTGOLandCorrector
except ImportError:
    # Fallback si le module n'est pas trouvé
    MTGOLandCorrector = None

# Configuration du logger
logger = setup_logger()

# Définir le répertoire de débogage
debug_dir = Path('ocr_debug')
debug_dir.mkdir(exist_ok=True)

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

# --- Module OCR avec EasyOCR ---
class UltraAdvancedOCR:
    """
    Module OCR utilisant EasyOCR pour une reconnaissance de haute performance.
    """
    def __init__(self, languages=['en']):
        # Initialise le lecteur EasyOCR. Cela peut télécharger les modèles la première fois.
        logger.info(f"🤖 Initialisation du moteur EasyOCR pour la langue : {languages}")
        logger.info("   (Le premier chargement peut être long - téléchargement des modèles IA)")
        try:
            self.reader = easyocr.Reader(languages, gpu=False)  # Mettre gpu=True si vous avez un GPU configuré
            logger.info("✅ Moteur EasyOCR prêt.")
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'initialisation d'EasyOCR: {e}")
            raise

    @trace_ocr_performance
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Traite une image complète et en extrait le texte brut en utilisant EasyOCR.
        Ajout d'un prétraitement d'image pour améliorer la qualité.
        """
        logger.info(f"🔍 Début de l'extraction avec EasyOCR depuis : {image_path}")
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise FileNotFoundError(f"Image introuvable ou illisible à : {image_path}")

            # --- DÉBUT DU PRÉTRAITEMENT D'IMAGE ---
            logger.info("  🖼️  Application du prétraitement d'image...")
            
            # 1. Conversion en niveaux de gris
            gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 2. Augmentation du contraste (CLAHE)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            contrast_image = clahe.apply(gray_image)

            # 3. Binarisation adaptative pour mieux gérer les variations de luminosité
            processed_image = cv2.adaptiveThreshold(
                contrast_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Sauvegarder l'image prétraitée pour le debug
            debug_image_path = os.path.join(os.path.dirname(image_path), "debug_preprocessed_image.png")
            cv2.imwrite(debug_image_path, processed_image)
            logger.info(f"  💾 Image prétraitée sauvegardée pour debug : {debug_image_path}")
            # --- FIN DU PRÉTRAITEMENT D'IMAGE ---
            
            logger.info("  🤖 Traitement par l'IA EasyOCR en cours...")
            results = self.reader.readtext(processed_image, detail=1, paragraph=True)
            
            # Log des résultats avec confiance
            logger.info(f"  📊 EasyOCR a détecté {len(results)} blocs de texte")
            
            # Vérifier le format des résultats
            if results and len(results[0]) == 3:
                # Format: (bbox, text, confidence)
                for i, (bbox, text, confidence) in enumerate(results):
                    logger.debug(f"    Bloc {i+1}: '{text}' (confiance: {confidence:.2f})")
                text_blocks = [res[1] for res in results if res[2] > 0.3]  # Filtrer par confiance
            elif results and len(results[0]) == 2:
                # Format: (bbox, text) - pas de confiance
                for i, (bbox, text) in enumerate(results):
                    logger.debug(f"    Bloc {i+1}: '{text}' (pas de confiance)")
                text_blocks = [res[1] for res in results]  # Prendre tout le texte
            else:
                logger.warning("  ⚠️ Format de résultats EasyOCR inattendu")
                text_blocks = []
            full_text = "\n".join(text_blocks)
            
            logger.info("  ✅ Extraction de texte par EasyOCR terminée")
            logger.info(f"  📝 Texte extrait ({len(full_text)} caractères)")
            
            # Sauvegarder pour debug avec un nom de fichier unique
            timestamp = int(time.time())
            unique_id = uuid.uuid4().hex[:6]
            debug_text_path = f"debug/easyocr_output_{timestamp}_{unique_id}.txt"
            
            # S'assurer que le répertoire de debug existe
            os.makedirs(os.path.dirname(debug_text_path), exist_ok=True)

            with open(debug_text_path, 'w', encoding='utf-8') as f:
                f.write("=== RÉSULTATS EASYOCR DÉTAILLÉS ===\n")
                if results:
                    if len(results[0]) == 3:
                        for bbox, text, confidence in results:
                            f.write(f"Confiance: {confidence:.3f} | Texte: {text}\n")
                    elif len(results[0]) == 2:
                        for bbox, text in results:
                            f.write(f"Pas de confiance | Texte: {text}\n")
                f.write("\n=== TEXTE FINAL ===\n")
                f.write(full_text)
            logger.info(f"  💾 Résultats détaillés sauvegardés : {debug_text_path}")
            
            return full_text

        except Exception as e:
            logger.error(f"❌ Erreur lors du traitement EasyOCR de {image_path}: {e}", exc_info=True)
            return ""

# --- Parser Principal (optimisé pour EasyOCR) ---
class MTGOCRParser:
    """
    Parser principal utilisant EasyOCR pour une reconnaissance supérieure.
    """
    def __init__(self, scryfall_service: ScryfallService):
        self.scryfall_service = scryfall_service
        # ON CHANGE DE MOTEUR ICI
        self.arena_ocr = UltraAdvancedOCR()
        self.deck_processor = DeckProcessor(strict_mode=False)
        self.logger = logger
        # Initialiser le correcteur MTGO si disponible
        self.mtgo_corrector = MTGOLandCorrector() if MTGOLandCorrector else None

    def _filter_and_clean_text(self, text: str) -> str:
        """
        Nettoie et filtre le texte extrait par EasyOCR
        """
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Ignorer les lignes trop courtes
            if len(line) < 3:
                continue
                
            # Ignorer les lignes qui ne ressemblent pas à des noms de cartes
            if re.match(r'^[^a-zA-Z]*$', line):  # Que des non-lettres
                continue
                
            # Nettoyer les caractères parasites
            line = re.sub(r'[^\w\s\'-/]', ' ', line)
            line = re.sub(r'\s+', ' ', line).strip()
            
            if len(line) >= 3:
                cleaned_lines.append(line)
        
        cleaned_text = '\n'.join(cleaned_lines)
        logger.info(f"  🧹 Nettoyage EasyOCR: {len(lines)} → {len(cleaned_lines)} lignes conservées")
        return cleaned_text

    def _parse_raw_text(self, text: str) -> Tuple[List[Tuple[str, int]], List[Tuple[str, int]]]:
        """
        Analyse le texte extrait par EasyOCR pour identifier les cartes.
        """
        logger.info("📋 Parsing du texte EasyOCR")
        
        # Nettoyer le texte d'abord
        cleaned_text = self._filter_and_clean_text(text)
        
        main_cards = []
        side_cards = []
        is_sideboard = False
        
        # Patterns de reconnaissance améliorés pour EasyOCR
        patterns = [
            (r'^\s*(\d+)\s+(.+)$', lambda m: (int(m.group(1)), m.group(2).strip())),
            (r'^\s*(\d+)x\s+(.+)$', lambda m: (int(m.group(1)), m.group(2).strip())),
            (r'^\s*(.+?)\s+x?(\d+)\s*$', lambda m: (int(m.group(2)), m.group(1).strip())),
            (r'^\s*(.+)$', lambda m: (1, m.group(1).strip()))  # Défaut: quantité = 1
        ]

        for line in cleaned_text.split('\n'):
            line = line.strip()
            if not line:
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
            
            # Validation du nom de carte
            name = re.sub(r'[^\w\s\'-/]', '', name).strip()
            name = re.sub(r'\s+', ' ', name)
            
            # Ignorer les noms trop courts ou trop longs
            if len(name) < 3 or len(name) > 50:
                logger.debug(f"  🗑️ Nom ignoré (longueur): '{name}'")
                continue
            
            # Ignorer les noms avec trop de mots (probablement du texte de règles)
            if len(name.split()) > 6:
                logger.debug(f"  🗑️ Nom ignoré (trop de mots): '{name}'")
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
        Valide une liste de cartes avec la recherche floue Scryfall.
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
        Pipeline complet avec EasyOCR : OCR IA > Parsing > Validation Floue > Regroupement > Export.
        """
        logger.info(f"🚀 DÉBUT DU PIPELINE COMPLET AVEC EASYOCR POUR {image_path}")

        try:
            # 1. OCR avec EasyOCR (IA)
            logger.info("🤖 Phase 1: OCR avec Intelligence Artificielle (EasyOCR)")
            raw_text = self.arena_ocr.extract_text_from_image(image_path)
            if not raw_text or len(raw_text.strip()) < 10:
                return ParseResult(
                    errors=["Échec critique de l'OCR EasyOCR. L'image est peut-être vide ou illisible."],
                    processing_notes=["EasyOCR n'a produit aucun texte exploitable"]
                )

            # 2. Analyse du texte pour séparer deck/sideboard
            logger.info("📋 Phase 2: Parsing et nettoyage du texte")
            raw_main, raw_side = self._parse_raw_text(raw_text)

            if not raw_main and not raw_side:
                return ParseResult(
                    errors=["Aucune carte détectée dans le texte EasyOCR"],
                    processing_notes=[f"Texte EasyOCR brut: {raw_text[:200]}..."]
                )

            # 2.5. Appliquer la correction MTGO si nécessaire
            if self.mtgo_corrector and raw_text:
                logger.info("🔧 Phase 2.5: Vérification et correction MTGO")
                if self.mtgo_corrector.detect_mtgo_format(raw_text):
                    logger.info("  📊 Format MTGO détecté - application de la correction des lands")
                    raw_main = self.mtgo_corrector.apply_mtgo_land_correction(
                        raw_main, raw_text, is_sideboard=False
                    )
                    # Le sideboard n'a pas besoin de correction
                    logger.info(f"  ✅ Correction MTGO appliquée: {sum(q for _, q in raw_main)} cartes main")

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

            # 4. Regroupement avec DeckProcessor
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
                f"EasyOCR (IA) appliqué avec succès",
                f"Recherche floue Scryfall utilisée",
                f"Cartes validées: {len(validated_cards)}/{len(all_cards)}",
                f"Regroupement: {len(all_cards)} → {len(processed_cards)} cartes uniques"
            ]

            logger.info("🏁 PIPELINE EASYOCR TERMINÉ AVEC SUCCÈS")

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
            logger.error(f"❌ Erreur critique dans le pipeline EasyOCR: {e}", exc_info=True)
            return ParseResult(
                errors=[f"Erreur critique EasyOCR: {str(e)}"],
                processing_notes=[f"Pipeline interrompu à cause de: {type(e).__name__}"]
            )

    def extract_text_from_image(self, image_path: str) -> List[str]:
        """Méthode de compatibilité pour l'ancien code"""
        raw_text = self.arena_ocr.extract_text_from_image(image_path)
        return raw_text.split('\n') if raw_text else []

# --- Exemple d'utilisation (pour test) ---
async def main_test():
    """Test du parser EasyOCR"""
    if not os.path.exists('test_deck.png'):
        print("Fichier 'test_deck.png' non trouvé pour le test.")
        return

    from scryfall_service import ScryfallService
    
    async with ScryfallService() as scryfall:
        parser = MTGOCRParser(scryfall)
        result = await parser.parse_deck_image('test_deck.png')

        print("\n--- RÉSULTAT EASYOCR ---")
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

@trace_ocr_performance
def preprocess_for_easyocr(image_path: str) -> np.ndarray:
    # ... (le reste de la fonction reste inchangé)
    # ...
    return warped

@trace_ocr_performance
def extract_text_from_image_easyocr(image_path: str, lang: str = 'fr'):
    logger.info(f"Début de l'extraction de texte avec EasyOCR pour {image_path}", language=lang)
    
    # Prétraitement de l'image
    preprocessed_image = preprocess_for_easyocr(image_path)
    
    # Initialisation de EasyOCR
    reader = easyocr.Reader([lang, 'en'], gpu=False)
    
    # Extraction du texte
    results = reader.readtext(preprocessed_image, detail=1, paragraph=False)
    
    # Sauvegarde de l'image avec les boîtes englobantes
    debug_image = preprocessed_image.copy()
    for (bbox, text, prob) in results:
        # Extraire les coordonnées de la boîte englobante
        (top_left, top_right, bottom_right, bottom_left) = bbox
        top_left = tuple(map(int, top_left))
        bottom_right = tuple(map(int, bottom_right))
        
        # Dessiner la boîte et le texte
        cv2.rectangle(debug_image, top_left, bottom_right, (0, 255, 0), 2)
        cv2.putText(debug_image, text, (top_left[0], top_left[1] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    debug_output_path = debug_dir / f"easyocr_debug_{Path(image_path).stem}.png"
    cv2.imwrite(str(debug_output_path), debug_image)
    logger.info(f"Image de débogage sauvegardée dans {debug_output_path}")

    return results, preprocessed_image 