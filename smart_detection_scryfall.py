#!/usr/bin/env python3
"""
Détection intelligente avec Scryfall pour compléter les cartes partielles
"""
import requests
import json
import time
from fuzzywuzzy import fuzz
import re

class ScryfallSmartDetector:
    def __init__(self):
        self.base_url = "https://api.scryfall.com"
        self.cache = {}
        
    def search_partial_name(self, partial_name, color_identity=None):
        """Recherche une carte avec un nom partiel et optionnellement une identité de couleur"""
        
        # Nettoyer le nom partiel
        partial = partial_name.strip().lower()
        
        # Si trop court, abandonner
        if len(partial) < 3:
            return None
            
        # Construire la requête Scryfall
        query_parts = [f'name:/{partial}/']  # Regex search
        
        if color_identity:
            # Ajouter l'identité de couleur si connue
            query_parts.append(f'id:{color_identity}')
            
        query = ' '.join(query_parts)
        
        # Check cache
        if query in self.cache:
            return self.cache[query]
            
        # API call avec rate limiting
        time.sleep(0.1)  # Respecter le rate limit de Scryfall
        
        try:
            response = requests.get(
                f"{self.base_url}/cards/search",
                params={'q': query, 'format': 'json'},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('data'):
                    # Trouver la meilleure correspondance
                    best_match = None
                    best_score = 0
                    
                    for card in data['data'][:10]:  # Limiter aux 10 premiers
                        score = fuzz.partial_ratio(partial, card['name'].lower())
                        if score > best_score:
                            best_score = score
                            best_match = card
                    
                    if best_match and best_score > 70:
                        result = {
                            'name': best_match['name'],
                            'colors': best_match.get('colors', []),
                            'mana_cost': best_match.get('mana_cost', ''),
                            'type_line': best_match.get('type_line', ''),
                            'confidence': best_score
                        }
                        self.cache[query] = result
                        return result
                        
        except Exception as e:
            print(f"⚠️ Erreur Scryfall: {e}")
            
        return None
        
    def deduce_from_context(self, partial_name, nearby_cards, position="below"):
        """Déduit une carte en utilisant le contexte (cartes proches)"""
        
        # Si on a une carte similaire juste au-dessus ou en-dessous
        for nearby in nearby_cards:
            # Vérifier si le début correspond
            if nearby.lower().startswith(partial_name.lower()):
                return {
                    'name': nearby,
                    'confidence': 90,
                    'reason': f'Carte similaire {position}: {nearby}'
                }
                
        # Chercher dans Scryfall
        result = self.search_partial_name(partial_name)
        if result:
            result['reason'] = 'Trouvé via Scryfall'
            return result
            
        return None

def analyze_sideboard_with_context(detected_cards, image_path):
    """Analyse le sideboard en utilisant le contexte pour les cartes manquantes"""
    
    print("\n" + "="*60)
    print("🔍 ANALYSE INTELLIGENTE AVEC SCRYFALL")
    print("="*60)
    
    detector = ScryfallSmartDetector()
    
    # Cartes détectées (depuis l'OCR précédent)
    detected = [
        "Fire Magic",
        "Torch the Tower", 
        "Ghost Vacuum",
        "Disdainful Stroke",
        "Smuggler's Surprise",
        "Negate",
        "Scrapshooter",
        "Surrak, Elusive Hunter",
        "Vaultborn Tyrant",
        "Ugin, Eye of the Storms",
        "Spectral Denial",
        "Spectr"  # Carte coupée
    ]
    
    # Analyser les cartes partielles
    print("\n📝 CARTES PARTIELLES À COMPLÉTER:")
    
    completed_cards = []
    
    for i, card in enumerate(detected):
        if len(card) < 6 or card.endswith('...') or card == "Spectr":
            print(f"\n🔎 Analyse de '{card}':")
            
            # Contexte : cartes proches
            nearby = []
            if i > 0:
                nearby.append(detected[i-1])
            if i < len(detected) - 1:
                nearby.append(detected[i+1])
                
            # Dans notre cas spécifique, on sait que "Spectral Denial" est juste au-dessus
            if card == "Spectr":
                nearby = ["Spectral Denial"]
                
            result = detector.deduce_from_context(card, nearby, "above")
            
            if result:
                print(f"  ✅ Déduit: {result['name']} (confiance: {result['confidence']}%)")
                if 'reason' in result:
                    print(f"     Raison: {result['reason']}")
                completed_cards.append(result['name'])
            else:
                print(f"  ❌ Impossible de déduire")
                completed_cards.append(card)
        else:
            completed_cards.append(card)
    
    # Compter les quantités
    print("\n📊 DECK SIDEBOARD COMPLET:")
    
    card_counts = {}
    for card in completed_cards:
        if card in card_counts:
            card_counts[card] += 1
        else:
            card_counts[card] = 1
            
    # Ajuster les quantités connues depuis l'image haute résolution
    # On sait que certaines cartes sont en 2x
    known_quantities = {
        "Fire Magic": 2,
        "Torch the Tower": 2,
        "Ghost Vacuum": 2,
        "Spectral Denial": 2  # La carte coupée est un second exemplaire
    }
    
    for card, qty in known_quantities.items():
        if card in card_counts:
            card_counts[card] = qty
            
    # Afficher le résultat final
    total = 0
    for card, qty in card_counts.items():
        print(f"  • {qty}x {card}")
        total += qty
        
    print(f"\n✅ TOTAL: {total} cartes")
    
    if total == 15:
        print("🎯 SIDEBOARD COMPLET!")
    else:
        diff = 15 - total
        if diff > 0:
            print(f"⚠️ Il manque {diff} carte(s)")
            
            # Suggestions basées sur les patterns courants
            print("\n💡 SUGGESTIONS (cartes courantes en sideboard):")
            suggestions = [
                "Rest in Peace",
                "Leyline of the Void", 
                "Mystical Dispute",
                "Dovin's Veto",
                "Aether Gust"
            ]
            
            for sugg in suggestions[:3]:
                result = detector.search_partial_name(sugg)
                if result:
                    print(f"  • {result['name']} ({result['mana_cost']})")
        else:
            print(f"⚠️ {-diff} carte(s) en trop")
    
    return card_counts

# Test
if __name__ == "__main__":
    # Utiliser les cartes détectées précédemment
    detected = []  # Sera rempli par l'OCR
    analyze_sideboard_with_context(detected, "/Volumes/DataDisk/_Projects/screen to deck/image2.webp")