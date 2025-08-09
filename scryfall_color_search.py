#!/usr/bin/env python3
"""
Recherche intelligente Scryfall avec couleur + début du nom
"""
import requests
import json
import time
import re
from typing import List, Dict, Optional

class ScryfallColorSearch:
    def __init__(self):
        self.base_url = "https://api.scryfall.com"
        self.cache = {}
        
    def extract_colors_from_symbols(self, mana_symbols: str) -> List[str]:
        """Extrait les couleurs depuis les symboles de mana visibles"""
        colors = []
        
        # Map des symboles vers couleurs
        symbol_map = {
            'W': 'W',  # White
            'U': 'U',  # Blue
            'B': 'B',  # Black
            'R': 'R',  # Red
            'G': 'G',  # Green
            'X': None,  # Generic, ignore
        }
        
        # Chercher les symboles dans le texte
        for symbol, color in symbol_map.items():
            if symbol in mana_symbols.upper() and color:
                colors.append(color)
                
        return list(set(colors))  # Unique colors
        
    def search_by_partial_and_color(self, partial_name: str, colors: List[str] = None, 
                                   mana_cost_hint: str = None) -> List[Dict]:
        """
        Recherche une carte par nom partiel et couleurs
        
        Args:
            partial_name: Début du nom de la carte (ex: "Spectr")
            colors: Liste des couleurs (ex: ['U'] pour bleu)
            mana_cost_hint: Indice sur le coût de mana (ex: "XU" ou "1U")
        """
        
        # Nettoyer le nom partiel
        partial = partial_name.strip()
        if len(partial) < 3:
            return []
            
        # Construire la requête Scryfall
        query_parts = []
        
        # Recherche par nom commençant par...
        query_parts.append(f'name:/^{partial}/i')  # i pour case insensitive
        
        # Ajouter les couleurs si connues
        if colors:
            color_query = ''.join(colors)
            query_parts.append(f'color={color_query}')
            
        # Si on a un indice sur le coût de mana
        if mana_cost_hint:
            # Extraire les couleurs du coût
            hint_colors = self.extract_colors_from_symbols(mana_cost_hint)
            if hint_colors and not colors:
                color_query = ''.join(hint_colors)
                query_parts.append(f'color>={color_query}')
        
        # Limiter aux cartes légales en Standard/Pioneer (plus récentes)
        query_parts.append('(legal:standard OR legal:pioneer)')
        
        query = ' '.join(query_parts)
        
        # Check cache
        cache_key = f"{partial}_{colors}_{mana_cost_hint}"
        if cache_key in self.cache:
            return self.cache[cache_key]
            
        print(f"  🔍 Recherche Scryfall: {query}")
        
        # API call avec rate limiting
        time.sleep(0.1)
        
        try:
            response = requests.get(
                f"{self.base_url}/cards/search",
                params={'q': query, 'format': 'json'},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                results = []
                
                for card in data.get('data', [])[:5]:  # Max 5 résultats
                    results.append({
                        'name': card['name'],
                        'mana_cost': card.get('mana_cost', ''),
                        'colors': card.get('colors', []),
                        'color_identity': card.get('color_identity', []),
                        'type_line': card.get('type_line', ''),
                        'set': card.get('set', ''),
                        'rarity': card.get('rarity', '')
                    })
                
                self.cache[cache_key] = results
                return results
                
        except Exception as e:
            print(f"  ⚠️ Erreur Scryfall: {e}")
            
        return []

def test_spectral_case():
    """Test sur le cas "Spectr..." avec couleur bleue"""
    
    print("\n" + "="*60)
    print("🧪 TEST: Recherche 'Spectr...' avec contexte couleur")
    print("="*60)
    
    searcher = ScryfallColorSearch()
    
    # Cas 1: "Spectr" avec indice visuel XU (bleu)
    print("\n📝 Carte partielle détectée: 'Spectr...'")
    print("🎨 Symboles de mana visibles: XU (coût avec bleu)")
    
    results = searcher.search_by_partial_and_color(
        partial_name="Spectr",
        mana_cost_hint="XU"
    )
    
    if results:
        print(f"\n✅ {len(results)} carte(s) trouvée(s):")
        for i, card in enumerate(results, 1):
            print(f"  {i}. {card['name']} - {card['mana_cost']} ({card['type_line']})")
            
        # Le premier résultat devrait être Spectral Denial
        if results[0]['name'] == 'Spectral Denial':
            print("\n🎯 SUCCÈS: Spectral Denial identifié correctement!")
    else:
        print("❌ Aucune carte trouvée")
        
    # Cas 2: Test avec d'autres cartes partielles
    print("\n" + "-"*40)
    
    test_cases = [
        ("Vault", "BG", "Vaultborn Tyrant"),  # Noir/Vert
        ("Smug", "G", "Smuggler's Surprise"),  # Vert
        ("Surr", "G", "Surrak"),  # Vert
        ("Neg", "U", "Negate"),  # Bleu
    ]
    
    for partial, colors, expected in test_cases:
        print(f"\n🔎 Test: '{partial}' avec couleur {colors}")
        results = searcher.search_by_partial_and_color(
            partial_name=partial,
            colors=list(colors)
        )
        
        if results:
            found = results[0]['name']
            if expected in found:
                print(f"  ✅ Trouvé: {found}")
            else:
                print(f"  ⚠️ Trouvé: {found} (attendu: {expected})")
        else:
            print(f"  ❌ Rien trouvé")

def integrate_into_process():
    """Montre comment intégrer dans le processus global"""
    
    print("\n" + "="*60)
    print("📊 INTÉGRATION DANS LE PROCESSUS OCR")
    print("="*60)
    
    process_flow = """
    ┌─────────────────┐
    │   Image Input   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   EasyOCR/GPT   │
    │  Extraction     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Cartes Complètes│◄──┐
    │   Détectées     │   │
    └────────┬────────┘   │
             │            │
             ▼            │
    ┌─────────────────┐   │
    │ Cartes Partielles│   │
    │   "Spectr..."   │   │
    └────────┬────────┘   │
             │            │
             ▼            │
    ╔═════════════════╗   │
    ║  NOUVEAU: 🔍    ║   │
    ║ Scryfall Search ║   │
    ║ Couleur + Nom   ║───┘
    ╚═════════════════╝
             │
             ▼
    ┌─────────────────┐
    │ Deck Complet    │
    │   Validé        │
    └─────────────────┘
    """
    
    print(process_flow)
    
    print("\n🔧 IMPLÉMENTATION:")
    print("""
    1. OCR détecte "Spectr..." + symboles XU
    2. Appel Scryfall: color=U name:/^Spectr/
    3. Résultat: Spectral Denial
    4. Validation: La carte existe au-dessus → 2x Spectral Denial
    5. Deck complet: 15/15 cartes
    """)
    
    return True

if __name__ == "__main__":
    # Test du cas Spectral
    test_spectral_case()
    
    # Montrer l'intégration
    integrate_into_process()