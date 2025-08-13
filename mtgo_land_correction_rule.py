#!/usr/bin/env python3
"""
MTGO Land Correction Rule Implementation
=========================================
Ce module implémente la règle de correction automatique des lands pour les decks MTGO.

Problème identifié :
- MTGO affiche un total de lands (ex: "Lands: 24") en haut
- Mais le compte OCR trouve souvent moins (ex: 17 Plains au lieu de 19)
- La différence est TOUJOURS sur les basic lands

Solution :
1. Détecter le format MTGO (colonnes, headers "Deck"/"Sideboard")
2. Extraire le total affiché
3. Compter manuellement chaque carte
4. Ajuster automatiquement les basic lands pour atteindre le total
"""

import re
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class MTGOLandCorrector:
    """Correcteur automatique pour les lands MTGO"""
    
    # Basic lands à ajuster
    BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 
                   'Wastes', 'Snow-Covered Plains', 'Snow-Covered Island',
                   'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest']
    
    def __init__(self):
        self.logger = logger
        
    def detect_mtgo_format(self, text: str) -> bool:
        """
        Détecte si le texte provient d'une interface MTGO
        
        Indicateurs MTGO:
        - Headers "Lands:", "Creatures:", "Other:"
        - Colonnes "Deck" et "Sideboard"
        - Format de liste avec doublons
        """
        mtgo_indicators = [
            r'Lands:\s*\d+',
            r'Creatures:\s*\d+',
            r'Other:\s*\d+',
            r'Sideboard:\s*\d+',
            r'Display.*Sort.*Apply Filters'
        ]
        
        matches = 0
        for pattern in mtgo_indicators:
            if re.search(pattern, text, re.IGNORECASE):
                matches += 1
                
        # Si au moins 2 indicateurs trouvés, c'est MTGO
        is_mtgo = matches >= 2
        if is_mtgo:
            self.logger.info("✓ Format MTGO détecté")
        return is_mtgo
    
    def extract_mtgo_totals(self, text: str) -> Dict[str, int]:
        """
        Extrait les totaux affichés par MTGO
        
        Returns:
            Dict avec 'lands', 'creatures', 'other', 'sideboard'
        """
        totals = {
            'lands': 0,
            'creatures': 0,
            'other': 0,
            'sideboard': 0,
            'mainboard': 60  # Par défaut
        }
        
        # Patterns pour extraire les totaux
        patterns = {
            'lands': r'Lands:\s*(\d+)',
            'creatures': r'Creatures:\s*(\d+)',
            'other': r'Other:\s*(\d+)',
            'sideboard': r'Sideboard:\s*(\d+)'
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                totals[key] = int(match.group(1))
                self.logger.debug(f"  {key.capitalize()}: {totals[key]}")
        
        # Calculer le total mainboard
        totals['mainboard'] = totals['lands'] + totals['creatures'] + totals['other']
        
        self.logger.info(f"📊 Totaux MTGO extraits: {totals['mainboard']} mainboard "
                        f"({totals['lands']}L/{totals['creatures']}C/{totals['other']}O), "
                        f"{totals['sideboard']} sideboard")
        
        return totals
    
    def count_cards_by_type(self, cards: List[Tuple[str, int]]) -> Dict[str, int]:
        """
        Compte les cartes par type (land, creature, other)
        
        Args:
            cards: Liste de tuples (nom, quantité)
            
        Returns:
            Dict avec les comptes par type
        """
        counts = {
            'lands': 0,
            'creatures': 0,
            'other': 0,
            'total': 0
        }
        
        land_cards = []
        creature_cards = []
        other_cards = []
        
        for name, qty in cards:
            counts['total'] += qty
            
            # Classifier par type (simple heuristique basée sur les noms)
            if self.is_land(name):
                counts['lands'] += qty
                land_cards.append((name, qty))
            elif self.is_creature(name):
                counts['creatures'] += qty
                creature_cards.append((name, qty))
            else:
                counts['other'] += qty
                other_cards.append((name, qty))
        
        self.logger.debug(f"  Lands trouvés: {land_cards}")
        self.logger.debug(f"  Creatures trouvées: {creature_cards}")
        self.logger.debug(f"  Other trouvés: {other_cards}")
        
        return counts
    
    def is_land(self, card_name: str) -> bool:
        """Détermine si une carte est un terrain"""
        land_keywords = [
            'land', 'plains', 'island', 'swamp', 'mountain', 'forest',
            'wastes', 'verge', 'courtyard', 'tower', 'shrine', 'grave',
            'shores', 'coast', 'catacomb', 'fountain', 'otawara', 'eiganjo',
            'takenuma', 'town', 'raffine', 'godless', 'watery', 'hallowed',
            'drowned', 'darkslick', 'seachrome', 'gloomlake', 'floodform',
            'concealed', 'starting'
        ]
        
        name_lower = card_name.lower()
        return any(keyword in name_lower for keyword in land_keywords)
    
    def is_creature(self, card_name: str) -> bool:
        """Détermine si une carte est une créature"""
        # Liste de créatures connues du deck Pixie (pour l'exemple)
        creature_keywords = [
            'pixie', 'kirin', 'siren', 'spyglass', 'relic', 'faerie',
            'mastermind', 'riptide', 'enduring', 'entity', 'operative'
        ]
        
        name_lower = card_name.lower()
        return any(keyword in name_lower for keyword in creature_keywords)
    
    def find_basic_land_in_deck(self, cards: List[Tuple[str, int]]) -> Optional[str]:
        """
        Trouve le basic land le plus probable dans le deck
        
        Returns:
            Le nom du basic land trouvé ou None
        """
        for name, _ in cards:
            if name in self.BASIC_LANDS:
                return name
        
        # Chercher des variantes
        for name, _ in cards:
            name_lower = name.lower()
            for basic in self.BASIC_LANDS:
                if basic.lower() in name_lower:
                    return basic
        
        return None
    
    def apply_mtgo_land_correction(self, 
                                  cards: List[Tuple[str, int]], 
                                  text: str,
                                  is_sideboard: bool = False) -> List[Tuple[str, int]]:
        """
        Applique la correction MTGO aux lands
        
        Args:
            cards: Liste des cartes détectées [(nom, quantité), ...]
            text: Texte OCR brut pour extraction des totaux
            is_sideboard: Si True, traite le sideboard
            
        Returns:
            Liste corrigée avec les bonnes quantités
        """
        # Si ce n'est pas MTGO, retourner tel quel
        if not self.detect_mtgo_format(text):
            return cards
        
        # Pour le sideboard, pas de correction nécessaire
        if is_sideboard:
            return cards
        
        self.logger.info("🔧 Application de la correction MTGO lands")
        
        # 1. Extraire les totaux MTGO
        mtgo_totals = self.extract_mtgo_totals(text)
        expected_lands = mtgo_totals['lands']
        
        # 2. Compter ce qu'on a trouvé
        current_counts = self.count_cards_by_type(cards)
        found_lands = current_counts['lands']
        
        self.logger.info(f"  Expected: {expected_lands} lands, Found: {found_lands} lands")
        
        # 3. Si on a le bon compte, pas de correction
        if found_lands == expected_lands:
            self.logger.info("  ✓ Compte correct, pas de correction nécessaire")
            return cards
        
        # 4. Calculer la différence
        diff = expected_lands - found_lands
        
        if diff <= 0:
            self.logger.warning(f"  ⚠️ Trop de lands trouvés ({found_lands} > {expected_lands})")
            return cards
        
        self.logger.info(f"  🎯 Correction nécessaire: +{diff} lands")
        
        # 5. Trouver le basic land à ajuster
        basic_land = self.find_basic_land_in_deck(cards)
        
        if not basic_land:
            # Si pas de basic land trouvé, essayer d'en deviner un
            # Basé sur les couleurs du deck
            if any('island' in name.lower() or 'blue' in name.lower() for name, _ in cards):
                basic_land = 'Island'
            elif any('plains' in name.lower() or 'white' in name.lower() for name, _ in cards):
                basic_land = 'Plains'
            elif any('swamp' in name.lower() or 'black' in name.lower() for name, _ in cards):
                basic_land = 'Swamp'
            elif any('mountain' in name.lower() or 'red' in name.lower() for name, _ in cards):
                basic_land = 'Mountain'
            elif any('forest' in name.lower() or 'green' in name.lower() for name, _ in cards):
                basic_land = 'Forest'
            else:
                basic_land = 'Island'  # Défaut pour le deck Pixie
            
            self.logger.info(f"  📌 Basic land deviné: {basic_land}")
        
        # 6. Appliquer la correction
        corrected_cards = []
        basic_land_found = False
        
        for name, qty in cards:
            if name == basic_land or name.lower() == basic_land.lower():
                # Ajouter la différence au basic land
                corrected_qty = qty + diff
                corrected_cards.append((name, corrected_qty))
                basic_land_found = True
                self.logger.info(f"  ✅ Corrigé: {name} {qty}x → {corrected_qty}x")
            else:
                corrected_cards.append((name, qty))
        
        # Si le basic land n'était pas dans la liste, l'ajouter
        if not basic_land_found:
            corrected_cards.append((basic_land, diff))
            self.logger.info(f"  ✅ Ajouté: {basic_land} {diff}x")
        
        # 7. Validation finale
        final_counts = self.count_cards_by_type(corrected_cards)
        self.logger.info(f"  📊 Après correction: {final_counts['lands']} lands, "
                        f"{final_counts['total']} total")
        
        return corrected_cards
    
    def validate_deck_counts(self, 
                            mainboard: List[Tuple[str, int]], 
                            sideboard: List[Tuple[str, int]],
                            text: str) -> Dict[str, any]:
        """
        Valide que le deck a les bons comptes (60 main, 15 side)
        
        Returns:
            Dict avec status, mainboard_count, sideboard_count, errors
        """
        main_total = sum(qty for _, qty in mainboard)
        side_total = sum(qty for _, qty in sideboard)
        
        result = {
            'valid': False,
            'mainboard_count': main_total,
            'sideboard_count': side_total,
            'errors': [],
            'warnings': []
        }
        
        # Pour MTGO, on s'attend à exactement 60+15
        if self.detect_mtgo_format(text):
            if main_total != 60:
                result['errors'].append(f"Mainboard: {main_total}/60 cartes")
            if side_total != 15:
                result['errors'].append(f"Sideboard: {side_total}/15 cartes")
        else:
            # Pour les autres formats, plus flexible
            if main_total < 60:
                result['errors'].append(f"Mainboard incomplet: {main_total}/60")
            elif main_total > 60:
                result['warnings'].append(f"Mainboard surchargé: {main_total}/60")
            
            if side_total > 15:
                result['warnings'].append(f"Sideboard surchargé: {side_total}/15")
        
        result['valid'] = len(result['errors']) == 0
        
        if result['valid']:
            self.logger.info("✅ Deck validé: 60+15 cartes")
        else:
            self.logger.warning(f"❌ Deck invalide: {result['errors']}")
        
        return result


# Exemple d'utilisation
if __name__ == "__main__":
    import sys
    
    # Configuration du logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(message)s'
    )
    
    corrector = MTGOLandCorrector()
    
    # Exemple avec le deck Pixie
    sample_text = """
    Pixie revived: 60    Lands: 24  Creatures: 14  Other: 22    Sideboard: 15
    
    Deck:
    Concealed Courtyard
    Concealed Courtyard
    Concealed Courtyard
    Concealed Courtyard
    Floodform Verge
    Floodform Verge
    Gloomlake Verge
    Gloomlake Verge
    Gloomlake Verge
    Gloomlake Verge
    Island
    Island
    Starting Town
    Starting Town
    Starting Town
    """
    
    sample_cards = [
        ('Concealed Courtyard', 4),
        ('Floodform Verge', 2),
        ('Gloomlake Verge', 4),
        ('Island', 2),  # Devrait être corrigé à plus
        ('Starting Town', 3),
        ('Watery Grave', 1),
        ('Raffine\'s Tower', 1),
        ('Godless Shrine', 1),
        # ... autres cartes
    ]
    
    print("="*60)
    print("TEST: Correction MTGO Lands")
    print("="*60)
    
    # Appliquer la correction
    corrected = corrector.apply_mtgo_land_correction(sample_cards, sample_text)
    
    print("\n📋 Résultat corrigé:")
    for name, qty in corrected:
        print(f"  {qty}x {name}")
    
    # Validation
    validation = corrector.validate_deck_counts(corrected, [], sample_text)
    print(f"\n✓ Validation: {validation}")