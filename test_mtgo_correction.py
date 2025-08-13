#!/usr/bin/env python3
"""
Test script pour valider la correction MTGO lands
"""

import asyncio
import os
import sys
import json
from pathlib import Path

# Ajouter le chemin pour importer les modules
sys.path.append('discord-bot')
sys.path.append('.')

from mtgo_land_correction_rule import MTGOLandCorrector

# Import optionnel pour le test avec image réelle
try:
    from discord_bot.ocr_parser_easyocr import MTGOCRParser
    from discord_bot.scryfall_service import ScryfallService
    HAS_DISCORD_BOT = True
except ImportError:
    try:
        # Essayer avec un chemin différent
        sys.path.insert(0, 'discord-bot')
        from ocr_parser_easyocr import MTGOCRParser
        from scryfall_service import ScryfallService
        HAS_DISCORD_BOT = True
    except ImportError:
        HAS_DISCORD_BOT = False
        print("⚠️ Module discord-bot non disponible, test partiel seulement")

async def test_mtgo_correction():
    """Test la correction MTGO sur l'image de test"""
    
    print("="*60)
    print("🧪 TEST: Correction MTGO Lands")
    print("="*60)
    
    # 1. Test unitaire du correcteur
    print("\n📋 Test 1: Correction unitaire")
    print("-"*40)
    
    corrector = MTGOLandCorrector()
    
    # Texte MTGO simulé
    mtgo_text = """
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
    Watery Grave
    Raffine's Tower
    Godless Shrine
    """
    
    # Cartes détectées (avec count incorrect)
    detected_cards = [
        ('Concealed Courtyard', 4),
        ('Floodform Verge', 2),
        ('Gloomlake Verge', 4),
        ('Island', 2),  # Devrait être 4
        ('Starting Town', 3),  # Devrait être 4
        ('Watery Grave', 1),
        ('Raffine\'s Tower', 1),
        ('Godless Shrine', 1),
        # Total: 18 lands au lieu de 24
    ]
    
    print("Avant correction:")
    total_before = sum(qty for _, qty in detected_cards)
    print(f"  Total lands: {total_before}")
    for name, qty in detected_cards:
        print(f"    {qty}x {name}")
    
    # Appliquer la correction
    corrected = corrector.apply_mtgo_land_correction(detected_cards, mtgo_text)
    
    print("\nAprès correction:")
    total_after = sum(qty for _, qty in corrected)
    print(f"  Total lands: {total_after}")
    for name, qty in corrected:
        print(f"    {qty}x {name}")
    
    # Validation
    if total_after == 24:
        print("  ✅ Correction réussie: 24 lands!")
    else:
        print(f"  ❌ Échec: {total_after} lands au lieu de 24")
    
    # 2. Test avec image réelle si disponible
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/MTGO deck list.webp"
    
    if os.path.exists(image_path) and HAS_DISCORD_BOT:
        print("\n📋 Test 2: Image MTGO réelle")
        print("-"*40)
        
        try:
            # Initialiser le parser avec le correcteur
            async with ScryfallService() as scryfall:
                parser = MTGOCRParser(scryfall)
                
                # Parser l'image
                result = await parser.parse_deck_image(image_path)
                
                print(f"Résultat du parsing:")
                print(f"  Main: {result.main_count} cartes")
                print(f"  Side: {result.side_count} cartes")
                print(f"  Total: {result.total_cards} cartes")
                
                if result.export_text:
                    print("\nDeck exporté:")
                    print("-"*40)
                    lines = result.export_text.split('\n')[:10]  # Premières 10 lignes
                    for line in lines:
                        print(f"  {line}")
                    if len(result.export_text.split('\n')) > 10:
                        print("  ...")
                
                if result.validation:
                    if result.validation.is_valid:
                        print("\n✅ Deck valide: 60+15 cartes")
                    else:
                        print(f"\n❌ Deck invalide:")
                        for error in result.validation.errors:
                            print(f"    - {error}")
                
        except Exception as e:
            print(f"❌ Erreur lors du test avec image: {e}")
    else:
        print(f"\n⚠️ Image de test non trouvée: {image_path}")
    
    # 3. Test de détection de format
    print("\n📋 Test 3: Détection de format")
    print("-"*40)
    
    test_texts = [
        ("MTGO", "Lands: 24  Creatures: 14  Other: 22  Sideboard: 15"),
        ("Arena", "60 Cards\nMainboard\n4x Lightning Bolt"),
        ("MTGO partiel", "Sideboard: 15\nDisplay  Sort"),
        ("Paper", "Deck List:\n4 Lightning Bolt\n4 Counterspell"),
    ]
    
    for name, text in test_texts:
        is_mtgo = corrector.detect_mtgo_format(text)
        status = "✓ MTGO" if is_mtgo else "✗ Non-MTGO"
        print(f"  {name}: {status}")
    
    print("\n" + "="*60)
    print("🏁 Tests terminés")
    print("="*60)

def main():
    """Point d'entrée principal"""
    import logging
    
    # Configuration du logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
    
    # Lancer les tests async
    asyncio.run(test_mtgo_correction())

if __name__ == "__main__":
    main()