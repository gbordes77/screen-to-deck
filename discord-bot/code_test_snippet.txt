#!/usr/bin/env python3
"""
🧪 Test avec un Vrai Deck MTG (validation automatique)
"""
import asyncio
import logging
from scryfall_service import ScryfallService

# Liste extraite du screenshot (main + sideboard)
EXTRACTED_DECK = [
    # Main deck
    ("Lurrus of the Dream-Den", 1),
    ("Esper Sentinel", 4),
    ("Ethereal Armor", 4),
    ("Giver of Runes", 4),
    ("Sentinel's Eyes", 4),
    ("Shardmage's Rescue", 4),
    ("Combat Research", 4),
    ("Slip Out the Back", 4),
    ("Wingspan Stride", 4),
    ("Cartouche of Zeal", 4),
    ("Sticky Fingers", 4),
    ("Demonic Ruckus", 4),
    ("Hushbringer", 2),
    ("Kor Spiritdancer", 4),
    ("Light-Paws, Emperor's Voice", 4),
    ("Plains", 4),
    ("Hallowed Fountain", 4),
    ("Seachrome Coast", 4),
    ("Sacred Foundry", 4),
    ("Sunbaked Canyon", 4),
    ("Mana Confluence", 4),
    ("Starting Town", 4),
    # Sideboard
    ("Lurrus of the Dream-Den", 1),
    ("Fragment Reality", 4),
    ("Slip Out the Back", 2),
    ("Spell Pierce", 4),
    ("Containment Priest", 4),
    ("Hushbringer", 1),
    ("Sheltered Aerie", 1),
]

async def test_real_deck():
    print("🃏 Test Screen to Deck - Validation Automatique")
    print("=" * 50)
    scryfall_service = ScryfallService()
    await scryfall_service.__aenter__()
    try:
        print(f"\n🎯 Test de validation pour {len(EXTRACTED_DECK)} cartes...")
        validated_count = 0
        corrected_count = 0
        for i, (card_name, quantity) in enumerate(EXTRACTED_DECK, 1):
            print(f"\n{i}. Testing: '{card_name}' x{quantity}")
            try:
                result = await scryfall_service.enhanced_card_search(card_name)
                if result.matched_name:
                    validated_count += 1
                    status = "🔧 CORRECTED" if result.correction_applied else "✅ FOUND"
                    if result.correction_applied:
                        corrected_count += 1
                        print(f"   {status}: '{card_name}' → '{result.matched_name}'")
                    else:
                        print(f"   {status}: '{result.matched_name}'")
                else:
                    print(f"   ❌ NOT FOUND")
                    if result.suggestions:
                        print(f"   💡 Suggestions: {', '.join(result.suggestions[:3])}")
            except Exception as e:
                print(f"   💥 ERROR: {e}")
        print(f"\n📊 RÉSULTATS:")
        print(f"  • Cartes testées: {len(EXTRACTED_DECK)}")
        print(f"  • Cartes validées: {validated_count}")
        print(f"  • Auto-corrections: {corrected_count}")
        print(f"  • Taux de succès: {validated_count/len(EXTRACTED_DECK)*100:.1f}%")
        if validated_count > 0:
            print(f"\n🎉 SUCCESS! Le service Scryfall fonctionne!")
        else:
            print(f"\n❌ Problème détecté dans le service Scryfall")
    except Exception as e:
        print(f"💥 ERREUR: {e}")
    finally:
        await scryfall_service.__aexit__(None, None, None)

    # Génération des formats d'export
    print("\n====================\n")
    print("# Format universel (quantité nom)")
    for name, quantity in EXTRACTED_DECK:
        print(f"{quantity} {name}")

    print("\n# Format MTGA (Deck + Sideboard)")
    print("Deck")
    for name, quantity in EXTRACTED_DECK:
        print(f"{quantity} {name}")

    print("\nSideboard")
    # On considère les 7 dernières cartes comme sideboard (à ajuster selon extraction réelle)
    for name, quantity in EXTRACTED_DECK[-7:]:
        print(f"{quantity} {name}")

    print("\n# Format MTGO (texte simple)")
    for name, quantity in EXTRACTED_DECK:
        print(f"{quantity}x {name}")

    print("\n# Format Moxfield (quantité x nom)")
    for name, quantity in EXTRACTED_DECK:
        print(f"{quantity}x {name}")

if __name__ == "__main__":
    asyncio.run(test_real_deck()) 