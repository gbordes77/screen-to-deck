#!/usr/bin/env python3
"""
🔍 Enhanced MTG OCR Parser - Phase 1
Advanced OCR processing with intelligent Scryfall integration
Now with automatic correction, format detection, and confidence scoring
"""

import cv2
import numpy as np
import pytesseract
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import asyncio

logger = logging.getLogger(__name__)

@dataclass
class ParsedCard:
    """Represents a parsed card with validation info"""
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
    """Complete parsing result with deck analysis"""
    cards: List[ParsedCard]
    format_analysis: Optional[Dict[str, Any]]
    confidence_score: float
    processing_notes: List[str]
    errors: List[str]

class MTGOCRParser:
    """Enhanced OCR parser with intelligent Scryfall validation"""
    
    def __init__(self, scryfall_service):
        self.scryfall_service = scryfall_service
        
        # Enhanced patterns for card detection
        self.card_patterns = [
            # Standard patterns
            r'^(\d+)x?\s+(.+)$',           # "4x Lightning Bolt"
            r'^(.+?)\s*x(\d+)$',           # "Lightning Bolt x4"  
            r'^(\d+)\s+(.+)$',             # "4 Lightning Bolt"
            r'^\((\d+)\)\s*(.+)$',         # "(4) Lightning Bolt"
            r'^(.+?)\s*\((\d+)\)$',        # "Lightning Bolt (4)"
            r'^(\d+)\*\s*(.+)$',           # "4* Lightning Bolt"
            r'^(.+?)\s*\*(\d+)$',          # "Lightning Bolt *4"
            r'^(\d+):\s*(.+)$',            # "4: Lightning Bolt"
            r'^(.+?)\s*:(\d+)$',           # "Lightning Bolt: 4"
            r'^(\d+)-\s*(.+)$',            # "4- Lightning Bolt"  
            r'^(.+?)\s*-(\d+)$',           # "Lightning Bolt -4"
            r'^([A-Za-z].+)$',             # Just card name (assume quantity 1)
        ]
        
        # Section keywords
        self.section_keywords = {
            'mainboard': ['main', 'mainboard', 'deck', 'maindeck'],
            'sideboard': ['side', 'sideboard', 'sb'],
            'commander': ['commander', 'general', 'cmd'],
            'ignore': ['total', 'sum', 'count', 'price', 'cost', 'value']
        }
        
        # MTG-specific keywords for validation
        self.mtg_keywords = [
            'creature', 'spell', 'instant', 'sorcery', 'enchantment', 'artifact', 
            'planeswalker', 'land', 'legendary', 'basic', 'nonbasic',
            'mana', 'cost', 'tap', 'untap', 'draw', 'discard', 'exile',
            'counter', 'target', 'destroy', 'sacrifice', 'search', 'shuffle'
        ]
        
        # Preprocessing configurations optimized for different image types
        self.ocr_configs = {
            'default': {
                'config': r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \'\",.()-/\n',
                'description': 'Standard OCR for normal images'
            },
            'dense_text': {
                'config': r'--oem 3 --psm 4 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \'\",.()-/\n',
                'description': 'Dense text blocks'
            },
            'single_column': {
                'config': r'--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \'\",.()-/\n',
                'description': 'Single text line'
            },
            'sparse_text': {
                'config': r'--oem 3 --psm 11 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \'\",.()-/\n',
                'description': 'Sparse text for low quality images'
            }
        }
        
        # Cache for card validation
        self.validation_cache: Dict[str, bool] = {}
        
        # Processing statistics
        self.stats = {
            'images_processed': 0,
            'cards_extracted': 0,
            'cards_validated': 0,
            'corrections_applied': 0
        }

    async def parse_deck_image(self, image_path: str, 
                             language: str = 'en', 
                             format_hint: str = None) -> ParseResult:
        """
        Enhanced deck parsing with format detection and intelligent validation
        """
        processing_notes = []
        errors = []
        
        try:
            # Extract text with multiple methods
            extracted_lines = self.extract_text_from_image(image_path)
            processing_notes.append(f"Extracted {len(extracted_lines)} text lines")
            
            if not extracted_lines:
                errors.append("No text detected in image")
                return ParseResult(
                    cards=[],
                    format_analysis=None,
                    confidence_score=0.0,
                    processing_notes=processing_notes,
                    errors=errors
                )
            
            # Parse cards from lines
            parsed_cards = await self._parse_cards_enhanced(extracted_lines, language)
            processing_notes.append(f"Parsed {len(parsed_cards)} potential cards")
            
            # Validate cards with Scryfall
            validated_cards = await self._validate_cards_batch(parsed_cards, language)
            processing_notes.append(f"Validated {len([c for c in validated_cards if c.is_validated])} cards")
            
            # Analyze deck format and structure
            format_analysis = None
            if validated_cards:
                format_analysis = await self._analyze_deck_comprehensive(validated_cards, format_hint)
                processing_notes.append(f"Detected format: {format_analysis.get('format', 'unknown')}")
            
            # Calculate overall confidence
            confidence_score = self._calculate_overall_confidence(validated_cards, extracted_lines)
            
            # Update statistics
            self.stats['images_processed'] += 1
            self.stats['cards_extracted'] += len(parsed_cards)
            self.stats['cards_validated'] += len([c for c in validated_cards if c.is_validated])
            self.stats['corrections_applied'] += len([c for c in validated_cards if c.correction_applied])
            
            return ParseResult(
                cards=validated_cards,
                format_analysis=format_analysis,
                confidence_score=confidence_score,
                processing_notes=processing_notes,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Error parsing deck image: {e}")
            errors.append(f"Parsing error: {str(e)}")
            return ParseResult(
                cards=[],
                format_analysis=None,
                confidence_score=0.0,
                processing_notes=processing_notes,
                errors=errors
            )

    def extract_text_from_image(self, image_path: str) -> List[str]:
        """Enhanced text extraction with multiple preprocessing methods"""
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Could not load image: {image_path}")
            return []
        
        # Try different preprocessing approaches
        preprocessing_methods = [
            ('default', self._preprocess_default),
            ('high_contrast', self._preprocess_high_contrast),
            ('denoised', self._preprocess_denoised),
            ('morphology', self._preprocess_morphology),
            ('adaptive', self._preprocess_adaptive_threshold)
        ]
        
        all_lines = []
        
        for method_name, preprocess_func in preprocessing_methods:
            try:
                processed_image = preprocess_func(image)
                lines = self._extract_text_with_tesseract(processed_image, method_name)
                if lines:
                    all_lines.extend(lines)
                    logger.debug(f"Method {method_name} extracted {len(lines)} lines")
            except Exception as e:
                logger.warning(f"Preprocessing method {method_name} failed: {e}")
                continue
        
        # Deduplicate and clean lines
        unique_lines = []
        seen = set()
        
        for line in all_lines:
            cleaned = self._clean_line(line)
            if cleaned and cleaned.lower() not in seen and len(cleaned) > 2:
                unique_lines.append(cleaned)
                seen.add(cleaned.lower())
        
        logger.info(f"Extracted {len(unique_lines)} unique lines from {len(all_lines)} total")
        return unique_lines

    def _preprocess_default(self, image: np.ndarray) -> np.ndarray:
        """Standard preprocessing for typical deck images"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Enhance contrast
        enhanced = cv2.convertScaleAbs(blurred, alpha=1.2, beta=20)
        
        # Apply threshold
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return thresh

    def _preprocess_high_contrast(self, image: np.ndarray) -> np.ndarray:
        """High contrast preprocessing for low quality images"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Strong bilateral filter for noise reduction while preserving edges
        filtered = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh

    def _preprocess_denoised(self, image: np.ndarray) -> np.ndarray:
        """Denoising preprocessing for noisy images"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Non-local Means Denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Sharpen the image
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        # Apply threshold
        _, thresh = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return thresh

    def _preprocess_morphology(self, image: np.ndarray) -> np.ndarray:
        """Morphological preprocessing for structured text"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Remove horizontal lines that might interfere
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        detected_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
        cnts = cv2.findContours(detected_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = cnts[0] if len(cnts) == 2 else cnts[1]
        for c in cnts:
            cv2.drawContours(binary, [c], -1, (0,0,0), 2)
        
        # Invert back
        result = 255 - binary
        
        return result

    def _preprocess_adaptive_threshold(self, image: np.ndarray) -> np.ndarray:
        """Adaptive threshold preprocessing for varying lighting"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply multiple adaptive thresholds and combine
        thresh1 = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, 8
        )
        thresh2 = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8
        )
        
        # Combine results
        combined = cv2.bitwise_and(thresh1, thresh2)
        
        return combined

    def _extract_text_with_tesseract(self, processed_image: np.ndarray, method_name: str = 'default') -> List[str]:
        """Extract text using Tesseract with multiple configurations"""
        lines = []
        
        # Try different OCR configurations
        configs_to_try = ['default', 'dense_text', 'single_column'] if method_name == 'default' else ['default']
        
        for config_name in configs_to_try:
            config = self.ocr_configs[config_name]['config']
            
            try:
                text = pytesseract.image_to_string(processed_image, config=config)
                extracted_lines = [line.strip() for line in text.split('\n') if line.strip()]
                lines.extend(extracted_lines)
                logger.debug(f"Config {config_name} extracted {len(extracted_lines)} lines")
            except Exception as e:
                logger.warning(f"Tesseract config {config_name} failed: {e}")
                continue
        
        return lines

    def _clean_line(self, line: str) -> str:
        """Enhanced line cleaning with MTG-specific fixes"""
        if not line:
            return ""
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', line.strip())
        
        # Remove common OCR artifacts
        cleaned = re.sub(r'[|\\]', '', cleaned)  # Remove vertical bars and backslashes
        cleaned = re.sub(r'[^\w\s\'-\(\),\./]', '', cleaned)  # Keep only valid characters
        
        # Fix common OCR mistakes for MTG cards
        mtg_fixes = {
            'lighming': 'lightning',
            'lighlning': 'lightning',
            'snapcasler': 'snapcaster',
            'brainsform': 'brainstorm',
            'swords fo': 'swords to',
            'counlerspell': 'counterspell',
            'force oi': 'force of',
            'mana crypl': 'mana crypt',
            'sol rmg': 'sol ring',
            'teferi': 'teferi',  # Common misspelling
            'planeswalher': 'planeswalker',
            'crealure': 'creature',
            'mslant': 'instant',
            'enchanlment': 'enchantment',
            'arlifact': 'artifact'
        }
        
        # Apply fixes
        cleaned_lower = cleaned.lower()
        for wrong, correct in mtg_fixes.items():
            if wrong in cleaned_lower:
                # Replace while preserving case structure
                pattern = re.compile(re.escape(wrong), re.IGNORECASE)
                cleaned = pattern.sub(correct, cleaned)
        
        return cleaned

    async def _parse_cards_enhanced(self, lines: List[str], language: str = 'en') -> List[ParsedCard]:
        """Enhanced card parsing with better pattern matching"""
        cards = []
        
        for line_num, line in enumerate(lines):
            # Skip section headers and irrelevant lines
            if self._is_section_header(line) or self._should_ignore_line(line):
                continue
            
            # Try to parse card from line
            parsed_card = await self._parse_single_line_enhanced(line, line_num)
            if parsed_card:
                cards.append(parsed_card)
        
        # Deduplicate cards (combine quantities)
        deduplicated = {}
        for card in cards:
            key = card.name.lower().strip()
            if key in deduplicated:
                deduplicated[key].quantity += card.quantity
            else:
                deduplicated[key] = card
        
        result = list(deduplicated.values())
        logger.info(f"Parsed {len(result)} unique cards from {len(lines)} lines")
        
        return result

    async def _parse_single_line_enhanced(self, line: str, line_num: int) -> Optional[ParsedCard]:
        """Enhanced single line parsing with confidence scoring"""
        line = line.strip()
        
        if not line or len(line) < 2:
            return None
        
        confidence = 0.5  # Base confidence
        
        # Try each pattern
        for pattern in self.card_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                groups = match.groups()
                
                # Parse quantity and name
                if len(groups) == 2:
                    # Check which group is quantity
                    if groups[0].isdigit():
                        quantity = int(groups[0])
                        name = groups[1].strip()
                    elif groups[1].isdigit():
                        quantity = int(groups[1])
                        name = groups[0].strip()
                    else:
                        # No clear quantity, assume 1
                        quantity = 1
                        name = groups[0].strip()
                else:
                    # Single group, assume it's just the card name
                    quantity = 1
                    name = groups[0].strip()
                
                # Validate quantity
                if quantity <= 0 or quantity > 20:
                    continue
                
                # Clean and validate card name
                name = self._clean_card_name(name)
                
                if self._looks_like_card_name(name):
                    # Adjust confidence based on pattern and content
                    if quantity > 1:
                        confidence += 0.2
                    if any(keyword in name.lower() for keyword in self.mtg_keywords):
                        confidence += 0.1
                    if len(name.split()) >= 2:  # Multi-word names are more likely to be cards
                        confidence += 0.1
                    
                    return ParsedCard(
                        name=name,
                        quantity=quantity,
                        original_text=line,
                        confidence=min(confidence, 1.0),
                        is_validated=False,
                        correction_applied=False
                    )
        
        return None

    def _clean_card_name(self, name: str) -> str:
        """Enhanced card name cleaning"""
        # Remove extra characters and normalize
        name = re.sub(r'[^\w\s\'-,\./]', '', name)
        name = re.sub(r'\s+', ' ', name.strip())
        
        # Remove trailing numbers that might be OCR artifacts
        name = re.sub(r'\s+\d+$', '', name)
        
        # Capitalize properly for MTG cards
        words = name.split()
        capitalized_words = []
        
        for word in words:
            # Handle common exceptions
            if word.lower() in ['of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for']:
                capitalized_words.append(word.lower())
            else:
                capitalized_words.append(word.capitalize())
        
        # Capitalize first word regardless
        if capitalized_words:
            capitalized_words[0] = capitalized_words[0].capitalize()
        
        return ' '.join(capitalized_words)

    def _looks_like_card_name(self, name: str) -> bool:
        """Enhanced validation for card-like names"""
        if not name or len(name) < 3:
            return False
        
        # Must contain at least one letter
        if not any(c.isalpha() for c in name):
            return False
        
        # Check against common non-card patterns
        non_card_patterns = [
            r'^\d+$',  # Just numbers
            r'^total',  # Total something
            r'^count',  # Count something
            r'^page \d+',  # Page numbers
            r'^\$\d+',  # Price
            r'^qty',  # Quantity headers
        ]
        
        for pattern in non_card_patterns:
            if re.match(pattern, name.lower()):
                return False
        
        return True

    def _is_section_header(self, line: str) -> bool:
        """Check if line is a section header"""
        line_lower = line.lower().strip()
        
        for section_type, keywords in self.section_keywords.items():
            if any(keyword in line_lower for keyword in keywords):
                return True
        
        return False

    def _should_ignore_line(self, line: str) -> bool:
        """Check if line should be ignored"""
        line_lower = line.lower().strip()
        
        # Ignore very short lines
        if len(line_lower) < 3:
            return True
        
        # Ignore lines with only special characters
        if not any(c.isalnum() for c in line_lower):
            return True
        
        # Ignore obvious non-card content
        ignore_patterns = [
            r'^deck\s*size',
            r'^total\s*cards',
            r'^\$\d+',  # Prices
            r'^qty',
            r'^quantity',
            r'^page\s*\d+',
            r'^export',
            r'^import',
            r'^format',
            r'^designed\s*by',
            r'^created\s*by',
        ]
        
        for pattern in ignore_patterns:
            if re.match(pattern, line_lower):
                return True
        
        return False

    async def _validate_cards_batch(self, parsed_cards: List[ParsedCard], 
                                  language: str = 'en') -> List[ParsedCard]:
        """Batch validate cards using enhanced Scryfall service"""
        if not parsed_cards or not self.scryfall_service:
            return parsed_cards
        
        # Extract card names for batch validation
        card_names = [card.name for card in parsed_cards]
        
        try:
            # Use the enhanced batch validation
            card_matches = await self.scryfall_service.batch_validate_cards(card_names, language)
            
            # Update parsed cards with validation results
            validated_cards = []
            
            for i, (parsed_card, match) in enumerate(zip(parsed_cards, card_matches)):
                if match.matched_name:
                    # Card was found
                    validated_card = ParsedCard(
                        name=match.matched_name,  # Use validated name
                        quantity=parsed_card.quantity,
                        original_text=parsed_card.original_text,
                        confidence=match.confidence,
                        is_validated=True,
                        correction_applied=match.correction_applied,
                        scryfall_data=match.card_data
                    )
                else:
                    # Card not found, keep original but mark as unvalidated
                    validated_card = ParsedCard(
                        name=parsed_card.name,
                        quantity=parsed_card.quantity,
                        original_text=parsed_card.original_text,
                        confidence=0.0,
                        is_validated=False,
                        correction_applied=False,
                        suggestions=match.suggestions
                    )
                
                validated_cards.append(validated_card)
            
            return validated_cards
            
        except Exception as e:
            logger.error(f"Error in batch validation: {e}")
            # Return original cards if validation fails
            return parsed_cards

    async def _analyze_deck_comprehensive(self, cards: List[ParsedCard], 
                                        format_hint: str = None) -> Dict[str, Any]:
        """Comprehensive deck analysis using enhanced Scryfall service"""
        try:
            # Prepare cards for analysis (only validated ones)
            validated_cards = [
                {
                    'name': card.name,
                    'quantity': card.quantity,
                    'card_data': card.scryfall_data
                }
                for card in cards if card.is_validated and card.scryfall_data
            ]
            
            if not validated_cards:
                return {'format': 'unknown', 'confidence': 0.0}
            
            # Use Scryfall service for deck analysis
            deck_analysis = await self.scryfall_service.analyze_deck_format(validated_cards)
            
            return {
                'format': deck_analysis.format_detected,
                'commander': deck_analysis.commander,
                'total_cards': deck_analysis.mainboard_count + deck_analysis.sideboard_count,
                'mainboard_count': deck_analysis.mainboard_count,
                'sideboard_count': deck_analysis.sideboard_count,
                'color_identity': deck_analysis.color_identity,
                'estimated_tier': deck_analysis.estimated_tier,
                'legality_issues': deck_analysis.legality_issues,
                'price_estimate': deck_analysis.price_estimate,
                'confidence': 0.8 if deck_analysis.format_detected != 'unknown' else 0.3
            }
            
        except Exception as e:
            logger.error(f"Error in deck analysis: {e}")
            return {'format': 'unknown', 'confidence': 0.0, 'error': str(e)}

    def _calculate_overall_confidence(self, cards: List[ParsedCard], 
                                    extracted_lines: List[str]) -> float:
        """Calculate overall confidence score for the parsing result"""
        if not cards:
            return 0.0
        
        # Base confidence from individual cards
        valid_cards = [c for c in cards if c.is_validated]
        if not valid_cards:
            return 0.1
        
        # Average confidence of validated cards
        avg_confidence = sum(c.confidence for c in valid_cards) / len(valid_cards)
        
        # Boost confidence based on:
        # 1. Percentage of validated cards
        validation_ratio = len(valid_cards) / len(cards)
        
        # 2. Reasonable deck size
        total_quantity = sum(c.quantity for c in cards)
        size_bonus = 0.0
        if 40 <= total_quantity <= 100:
            size_bonus = 0.2
        elif 20 <= total_quantity <= 120:
            size_bonus = 0.1
        
        # 3. Presence of MTG keywords in extracted text
        text = ' '.join(extracted_lines).lower()
        keyword_matches = sum(1 for keyword in self.mtg_keywords if keyword in text)
        keyword_bonus = min(keyword_matches * 0.02, 0.1)
        
        # 4. Corrections that were successful
        corrections = len([c for c in cards if c.correction_applied])
        correction_bonus = min(corrections * 0.05, 0.1)
        
        # Combine all factors
        final_confidence = (
            avg_confidence * 0.5 +
            validation_ratio * 0.3 +
            size_bonus +
            keyword_bonus +
            correction_bonus
        )
        
        return min(final_confidence, 1.0)

    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return {
            **self.stats,
            'validation_rate': (
                self.stats['cards_validated'] / max(self.stats['cards_extracted'], 1)
            ) * 100,
            'correction_rate': (
                self.stats['corrections_applied'] / max(self.stats['cards_validated'], 1)
            ) * 100
        }

    def reset_stats(self):
        """Reset processing statistics"""
        self.stats = {
            'images_processed': 0,
            'cards_extracted': 0,
            'cards_validated': 0,
            'corrections_applied': 0
        } 