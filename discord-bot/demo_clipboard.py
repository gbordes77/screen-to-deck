#!/usr/bin/env python3
"""
Démonstration de la fonctionnalité de copie dans le presse-papier
Ce script montre comment utiliser le ClipboardService
"""

from clipboard_service import ClipboardService
from datetime import datetime

def demo_clipboard_service():
    """Démontre l'utilisation du service de copie"""
    print("🎯 Démonstration du ClipboardService")
    print("=" * 50)
    
    # Créer une instance du service
    service = ClipboardService()
    
    # Exemple de deck MTGA
    mtga_deck = """Deck
4 Lightning Bolt
4 Counterspell
4 Shock
4 Cancel
4 Opt
4 Consider
4 Expressive Iteration
4 Unholy Heat
4 Dragon's Rage Channeler
4 Monastery Swiftspear
4 Soul-Guide Lantern
4 Steam Vents
4 Spirebluff Canal
4 Island
4 Mountain

Sideboard
3 Mystical Dispute
2 Spell Pierce
2 Abrade
2 Roiling Vortex
2 Unlicensed Hearse
2 Brotherhood's End
2 Jace, the Mind Sculptor"""
    
    # Exemple de deck Moxfield
    moxfield_deck = """4x Lightning Bolt
4x Counterspell
4x Shock
4x Cancel
4x Opt
4x Consider
4x Expressive Iteration
4x Unholy Heat
4x Dragon's Rage Channeler
4x Monastery Swiftspear
4x Soul-Guide Lantern
4x Steam Vents
4x Spirebluff Canal
4x Island
4x Mountain

Sideboard:
3x Mystical Dispute
2x Spell Pierce
2x Abrade
2x Roiling Vortex
2x Unlicensed Hearse
2x Brotherhood's End
2x Jace, the Mind Sculptor"""
    
    # Test 1: Mise en cache d'un deck MTGA
    print("\n📦 Test 1: Cache d'un deck MTGA")
    user_id_1 = 123456789
    service.cache_deck(user_id_1, mtga_deck, 'mtga')
    print(f"  ✅ Deck MTGA mis en cache pour l'utilisateur {user_id_1}")
    
    # Test 2: Mise en cache d'un deck Moxfield
    print("\n📦 Test 2: Cache d'un deck Moxfield")
    user_id_2 = 987654321
    service.cache_deck(user_id_2, moxfield_deck, 'moxfield')
    print(f"  ✅ Deck Moxfield mis en cache pour l'utilisateur {user_id_2}")
    
    # Test 3: Récupération du cache
    print("\n🔍 Test 3: Récupération du cache")
    cached_1 = service.get_cached_deck(user_id_1)
    if cached_1:
        print(f"  ✅ Deck trouvé pour utilisateur {user_id_1}")
        print(f"     Format: {cached_1.format_type}")
        print(f"     Taille: {len(cached_1.deck_content)} caractères")
        print(f"     Timestamp: {cached_1.timestamp}")
    
    cached_2 = service.get_cached_deck(user_id_2)
    if cached_2:
        print(f"  ✅ Deck trouvé pour utilisateur {user_id_2}")
        print(f"     Format: {cached_2.format_type}")
        print(f"     Taille: {len(cached_2.deck_content)} caractères")
    
    # Test 4: Génération d'ID unique
    print("\n🔑 Test 4: Génération d'ID unique")
    deck_id_1 = service.generate_deck_id(mtga_deck)
    deck_id_2 = service.generate_deck_id(moxfield_deck)
    print(f"  ID deck MTGA: {deck_id_1}")
    print(f"  ID deck Moxfield: {deck_id_2}")
    
    # Test 5: Instructions de copie
    print("\n📋 Test 5: Instructions de copie")
    for format_type in ['mtga', 'moxfield', 'archidekt', 'tappedout']:
        instructions = service.create_copy_instructions_text(format_type)
        print(f"\n  Format {format_type.upper()}:")
        print("  " + instructions.split('\n')[0])  # Première ligne seulement
    
    # Test 6: Nettoyage du cache
    print("\n🧹 Test 6: État du cache")
    print(f"  Nombre d'entrées en cache: {len(service.user_deck_cache)}")
    print(f"  TTL du cache: {service.cache_ttl} minutes")
    
    # Afficher un exemple de deck formaté
    print("\n📄 Exemple de deck MTGA formaté:")
    print("-" * 50)
    print(mtga_deck[:300] + "...")  # Afficher les 300 premiers caractères
    
    print("\n✅ Démonstration terminée avec succès!")

if __name__ == "__main__":
    demo_clipboard_service()