#!/usr/bin/env python3
"""
Scryfall Card Validator
=======================
Règle #6 : Validation obligatoire de chaque carte avec Scryfall

Ce module vérifie que CHAQUE carte extraite par l'OCR existe vraiment
dans la base de données Scryfall avant de valider la liste finale.
"""

import requests
import time
from typing import List, Dict, Optional, Tuple
from fuzzywuzzy import fuzz
import logging

logger = logging.getLogger(__name__)

class ScryfallValidator:
    """Validateur de cartes avec l'API Scryfall"""
    
    def __init__(self):
        self.base_url = "https://api.scryfall.com"
        self.rate_limit_delay = 0.1  # Respect du rate limit Scryfall
        
    def validate_card_exact(self, card_name: str) -> Optional[Dict]:
        """
        Vérifie si une carte existe exactement dans Scryfall
        
        Args:
            card_name: Nom exact de la carte
            
        Returns:
            Dict avec les infos de la carte ou None si non trouvée
        """
        try:
            response = requests.get(
                f"{self.base_url}/cards/named",
                params={"exact": card_name}
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                logger.warning(f"Erreur Scryfall {response.status_code} pour {card_name}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur validation {card_name}: {e}")
            return None
        finally:
            time.sleep(self.rate_limit_delay)
    
    def fuzzy_search_card(self, card_name: str, threshold: float = 0.85) -> Optional[Dict]:
        """
        Recherche fuzzy d'une carte dans Scryfall
        
        Args:
            card_name: Nom approximatif de la carte
            threshold: Seuil de similarité (0-1)
            
        Returns:
            Dict avec la meilleure correspondance ou None
        """
        try:
            # Recherche avec le nom approximatif
            response = requests.get(
                f"{self.base_url}/cards/search",
                params={"q": card_name}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('data'):
                    # Trouver la meilleure correspondance
                    best_match = None
                    best_score = 0
                    
                    for card in data['data'][:10]:  # Limiter aux 10 premiers résultats
                        score = fuzz.ratio(card_name.lower(), card['name'].lower()) / 100.0
                        if score > best_score and score >= threshold:
                            best_score = score
                            best_match = card
                    
                    if best_match:
                        logger.info(f"Fuzzy match: '{card_name}' → '{best_match['name']}' (score: {best_score:.2f})")
                        return best_match
            
            return None
            
        except Exception as e:
            logger.error(f"Erreur fuzzy search {card_name}: {e}")
            return None
        finally:
            time.sleep(self.rate_limit_delay)
    
    def validate_deck_list(self, cards: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """
        Valide une liste complète de cartes
        
        Args:
            cards: Liste de dicts avec 'name' et 'quantity'
            
        Returns:
            Tuple (cartes_validées, cartes_non_trouvées)
        """
        validated_cards = []
        not_found_cards = []
        
        logger.info(f"Validation de {len(cards)} cartes...")
        
        for card in cards:
            card_name = card.get('name', '')
            quantity = card.get('quantity', 1)
            
            # 1. Essayer la correspondance exacte
            exact_match = self.validate_card_exact(card_name)
            
            if exact_match:
                validated_cards.append({
                    'name': exact_match['name'],
                    'quantity': quantity,
                    'validated': True,
                    'scryfall_id': exact_match.get('id'),
                    'mana_cost': exact_match.get('mana_cost', ''),
                    'type_line': exact_match.get('type_line', '')
                })
                logger.debug(f"✅ {card_name} - Validation exacte")
                
            else:
                # 2. Essayer la recherche fuzzy
                fuzzy_match = self.fuzzy_search_card(card_name)
                
                if fuzzy_match:
                    validated_cards.append({
                        'name': fuzzy_match['name'],
                        'quantity': quantity,
                        'validated': True,
                        'original_ocr': card_name,  # Garder le nom OCR original
                        'scryfall_id': fuzzy_match.get('id'),
                        'mana_cost': fuzzy_match.get('mana_cost', ''),
                        'type_line': fuzzy_match.get('type_line', ''),
                        'fuzzy_corrected': True
                    })
                    logger.info(f"🔄 {card_name} → {fuzzy_match['name']} (fuzzy match)")
                    
                else:
                    # 3. Carte non trouvée
                    not_found_cards.append({
                        'name': card_name,
                        'quantity': quantity,
                        'validated': False,
                        'warning': 'Carte non trouvée dans Scryfall'
                    })
                    logger.warning(f"❌ {card_name} - Non trouvée dans Scryfall")
        
        # Résumé
        logger.info(f"Validation terminée: {len(validated_cards)} validées, {len(not_found_cards)} non trouvées")
        
        return validated_cards, not_found_cards
    
    def suggest_corrections(self, invalid_card_name: str, color_identity: str = None) -> List[str]:
        """
        Suggère des corrections possibles pour une carte non trouvée
        
        Args:
            invalid_card_name: Nom de carte non trouvé
            color_identity: Identité de couleur optionnelle (W,U,B,R,G)
            
        Returns:
            Liste de suggestions de noms de cartes
        """
        suggestions = []
        
        try:
            # Construire la requête de recherche
            query_parts = []
            
            # Extraire les mots clés du nom
            words = invalid_card_name.split()
            if words:
                query_parts.append(' '.join(words[:2]))  # Premiers mots
            
            # Ajouter la couleur si fournie
            if color_identity:
                query_parts.append(f"color:{color_identity}")
            
            query = ' '.join(query_parts)
            
            response = requests.get(
                f"{self.base_url}/cards/search",
                params={"q": query, "limit": 5}
            )
            
            if response.status_code == 200:
                data = response.json()
                for card in data.get('data', [])[:5]:
                    suggestions.append(card['name'])
            
        except Exception as e:
            logger.error(f"Erreur suggestions pour {invalid_card_name}: {e}")
        finally:
            time.sleep(self.rate_limit_delay)
        
        return suggestions


# Exemples de corrections courantes
COMMON_OCR_CORRECTIONS = {
    "Otter Token": "Plumecreed Escort",  # Les tokens ne sont pas des cartes
    "Armed Raptor": "Amped Raptor",
    "Solemzan": "Sokenzan",
    "Goldness Shrine": "Godless Shrine",
    "Kaito, Bane of Ninjutsu": "Kaito, Bane of Nightmares",
    "Stomacher's Talent": "Stormchaser's Talent",
    "Cosmogrand Zen": "Cosmotronic Wave",  # À vérifier selon le contexte
    "Momentum Break": "Moment of Craving",  # À vérifier selon le contexte
}


def apply_common_corrections(card_name: str) -> str:
    """
    Applique les corrections OCR courantes connues
    
    Args:
        card_name: Nom de carte potentiellement mal lu
        
    Returns:
        Nom corrigé si trouvé dans la table, sinon le nom original
    """
    return COMMON_OCR_CORRECTIONS.get(card_name, card_name)


if __name__ == "__main__":
    # Configuration du logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(message)s'
    )
    
    # Test du validateur
    validator = ScryfallValidator()
    
    # Exemple de deck à valider
    test_cards = [
        {"name": "Guide of Souls", "quantity": 4},
        {"name": "Armed Raptor", "quantity": 4},  # Erreur OCR
        {"name": "Otter Token", "quantity": 4},   # N'existe pas
        {"name": "Lightning Bolt", "quantity": 4},
        {"name": "Solemzan, Crucible of Defiance", "quantity": 1},  # Erreur OCR
    ]
    
    print("=" * 60)
    print("TEST: Validation Scryfall")
    print("=" * 60)
    
    validated, not_found = validator.validate_deck_list(test_cards)
    
    print("\n✅ Cartes validées:")
    for card in validated:
        if card.get('fuzzy_corrected'):
            print(f"  {card['quantity']}x {card['name']} (corrigé depuis: {card.get('original_ocr')})")
        else:
            print(f"  {card['quantity']}x {card['name']}")
    
    if not_found:
        print("\n❌ Cartes non trouvées:")
        for card in not_found:
            corrected = apply_common_corrections(card['name'])
            if corrected != card['name']:
                print(f"  {card['quantity']}x {card['name']} → Suggestion: {corrected}")
            else:
                suggestions = validator.suggest_corrections(card['name'])
                if suggestions:
                    print(f"  {card['quantity']}x {card['name']} → Suggestions: {', '.join(suggestions[:3])}")
                else:
                    print(f"  {card['quantity']}x {card['name']} - Aucune suggestion")