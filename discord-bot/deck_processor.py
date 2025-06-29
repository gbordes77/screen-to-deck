#!/usr/bin/env python3
"""
🎯 Deck Processor - Module de regroupement et validation des cartes
Résout le problème de doublons dans les exports en regroupant intelligemment les cartes
"""

import logging
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict

logger = logging.getLogger(__name__)

@dataclass
class ProcessedCard:
    """Représente une carte après regroupement"""
    name: str
    quantity: int
    is_sideboard: bool = False
    scryfall_data: Optional[Dict[str, Any]] = None
    
@dataclass
class ValidationResult:
    """Résultat de validation d'un deck"""
    is_valid: bool
    main_count: int
    side_count: int
    total_count: int
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

class DeckProcessor:
    """Processeur intelligent pour regrouper et valider les decks"""
    
    def __init__(self, strict_mode: bool = True):
        self.strict_mode = strict_mode
        self.logger = logging.getLogger(f"{__name__}.DeckProcessor")
        
    def process_deck(self, main_cards: List[Tuple[str, int]], 
                    side_cards: List[Tuple[str, int]]) -> Tuple[List[ProcessedCard], ValidationResult]:
        """
        Traite un deck complet : regroupement + validation
        
        Args:
            main_cards: Liste de tuples (nom, quantité) pour le main deck
            side_cards: Liste de tuples (nom, quantité) pour le sideboard
            
        Returns:
            Tuple (cartes_regroupées, résultat_validation)
        """
        self.logger.info("🎯 Début du traitement du deck")
        self.logger.debug(f"  Main: {len(main_cards)} entrées")
        self.logger.debug(f"  Side: {len(side_cards)} entrées")
        
        # 1. Regrouper les cartes
        grouped_main = self._group_cards(main_cards, is_sideboard=False)
        grouped_side = self._group_cards(side_cards, is_sideboard=True)
        
        # 2. Combiner les cartes
        all_cards = grouped_main + grouped_side
        
        # 3. Valider
        validation = self._validate_deck(grouped_main, grouped_side)
        
        self.logger.info(f"✅ Traitement terminé: {len(all_cards)} cartes uniques")
        self.logger.info(f"📊 Main: {validation.main_count}, Side: {validation.side_count}")
        
        return all_cards, validation
    
    def _group_cards(self, card_tuples: List[Tuple[str, int]], is_sideboard: bool = False) -> List[ProcessedCard]:
        """Regroupe les cartes du même nom"""
        zone_name = "sideboard" if is_sideboard else "main"
        self.logger.debug(f"🔄 Regroupement des cartes {zone_name}")
        
        # Dictionnaire pour regrouper par nom
        grouped: Dict[str, int] = defaultdict(int)
        
        for name, quantity in card_tuples:
            # Normaliser le nom (supprimer espaces en trop, etc.)
            clean_name = self._normalize_card_name(name)
            if clean_name:
                grouped[clean_name] += quantity
                self.logger.debug(f"  + {quantity}x {clean_name}")
        
        # Convertir en ProcessedCard
        result = []
        for name, total_qty in grouped.items():
            card = ProcessedCard(
                name=name,
                quantity=total_qty,
                is_sideboard=is_sideboard
            )
            result.append(card)
            
        self.logger.info(f"  {zone_name.capitalize()}: {len(card_tuples)} → {len(result)} cartes après regroupement")
        
        return result
    
    def _normalize_card_name(self, name: str) -> str:
        """Normalise un nom de carte"""
        if not name:
            return ""
            
        # Supprimer espaces en trop
        normalized = " ".join(name.split())
        
        # Supprimer caractères indésirables
        normalized = normalized.strip('.,;:!?')
        
        return normalized
    
    def _validate_deck(self, main_cards: List[ProcessedCard], 
                      side_cards: List[ProcessedCard]) -> ValidationResult:
        """Valide un deck selon les règles MTG"""
        main_count = sum(card.quantity for card in main_cards)
        side_count = sum(card.quantity for card in side_cards)
        total_count = main_count + side_count
        
        errors = []
        warnings = []
        
        # Validation stricte
        if self.strict_mode:
            if main_count != 60:
                errors.append(f"Main deck doit contenir 60 cartes (trouvé: {main_count})")
            if side_count != 15:
                errors.append(f"Sideboard doit contenir 15 cartes (trouvé: {side_count})")
        else:
            # Mode non-strict : avertissements seulement
            if main_count < 40 or main_count > 80:
                warnings.append(f"Main deck inhabituel: {main_count} cartes")
            if side_count > 15:
                warnings.append(f"Sideboard trop grand: {side_count} cartes")
        
        # Vérifier les doublons
        for card in main_cards + side_cards:
            if card.quantity > 4:
                # Exception pour les terrains de base
                if not self._is_basic_land(card.name):
                    errors.append(f"Trop d'exemplaires de '{card.name}': {card.quantity}")
        
        is_valid = len(errors) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            main_count=main_count,
            side_count=side_count,
            total_count=total_count,
            errors=errors,
            warnings=warnings
        )
    
    def _is_basic_land(self, card_name: str) -> bool:
        """Vérifie si c'est un terrain de base"""
        basics = {
            'plains', 'island', 'swamp', 'mountain', 'forest',
            'plaine', 'île', 'marais', 'montagne', 'forêt',
            'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
            'snow-covered mountain', 'snow-covered forest'
        }
        return card_name.lower() in basics
    
    def export_to_format(self, cards: List[ProcessedCard], format_type: str = 'mtga') -> str:
        """Exporte les cartes dans le format demandé"""
        self.logger.info(f"📤 Export au format {format_type}")
        
        if format_type == 'mtga':
            return self._export_mtga(cards)
        elif format_type == 'moxfield':
            return self._export_moxfield(cards)
        elif format_type == 'arena':
            return self._export_mtga(cards)  # Même format
        else:
            return self._export_plain(cards)
    
    def _export_mtga(self, cards: List[ProcessedCard]) -> str:
        """Export au format MTG Arena"""
        lines = []
        
        # Séparer main et side
        main_cards = [c for c in cards if not c.is_sideboard]
        side_cards = [c for c in cards if c.is_sideboard]
        
        # Main deck
        if main_cards:
            lines.append("Deck")
            for card in sorted(main_cards, key=lambda c: c.name):
                lines.append(f"{card.quantity} {card.name}")
        
        # Sideboard
        if side_cards:
            if main_cards:  # Ajouter ligne vide si il y a du main
                lines.append("")
            lines.append("Sideboard")
            for card in sorted(side_cards, key=lambda c: c.name):
                lines.append(f"{card.quantity} {card.name}")
        
        return "\n".join(lines)
    
    def _export_moxfield(self, cards: List[ProcessedCard]) -> str:
        """Export au format Moxfield"""
        lines = []
        
        # Séparer main et side
        main_cards = [c for c in cards if not c.is_sideboard]
        side_cards = [c for c in cards if c.is_sideboard]
        
        # Main deck
        for card in sorted(main_cards, key=lambda c: c.name):
            lines.append(f"{card.quantity}x {card.name}")
        
        # Sideboard
        if side_cards:
            lines.append("")
            lines.append("Sideboard:")
            for card in sorted(side_cards, key=lambda c: c.name):
                lines.append(f"{card.quantity}x {card.name}")
        
        return "\n".join(lines)
    
    def _export_plain(self, cards: List[ProcessedCard]) -> str:
        """Export format texte simple"""
        lines = []
        for card in sorted(cards, key=lambda c: (c.is_sideboard, c.name)):
            prefix = "[SB] " if card.is_sideboard else ""
            lines.append(f"{prefix}{card.quantity}x {card.name}")
        return "\n".join(lines) 