#!/usr/bin/env python3
"""
Test EasyOCR avec le vrai code du projet
"""
import sys
import os
sys.path.append('/Volumes/DataDisk/_Projects/screen to deck/discord-bot')

from ocr_parser_easyocr import MTGOCRParser
from scryfall_service import ScryfallService
import asyncio

async def test_ocr():
    print("🔍 Initialisation du parser OCR...")
    scryfall = ScryfallService()
    parser = MTGOCRParser(scryfall_service=scryfall)
    
    image_path = "/Volumes/DataDisk/_Projects/screen to deck/image.webp"
    print(f"📸 Analyse de l'image: {image_path}")
    
    # Appel de la méthode principale
    result = await parser.parse_deck_image(image_path, language='en')
    
    print("\n" + "="*60)
    print("📊 RÉSULTATS DE L'ANALYSE")
    print("="*60)
    
    print(f"✅ Cartes trouvées: {len(result.cards)}")
    print(f"📈 Score de confiance: {result.confidence_score:.2%}")
    print(f"📝 Notes de traitement: {len(result.processing_notes)} notes")
    
    if result.cards:
        print("\n🎴 CARTES DÉTECTÉES:")
        print("-" * 40)
        
        # Mainboard
        main_cards = [c for c in result.cards if not c.is_sideboard]
        if main_cards:
            print("\n📦 MAINBOARD:")
            for card in main_cards:
                status = "✅" if card.is_validated else "⚠️"
                print(f"  {status} {card.quantity}x {card.name} (conf: {card.confidence:.2%})")
        
        # Sideboard
        side_cards = [c for c in result.cards if c.is_sideboard]
        if side_cards:
            print("\n📋 SIDEBOARD:")
            for card in side_cards:
                status = "✅" if card.is_validated else "⚠️"
                print(f"  {status} {card.quantity}x {card.name} (conf: {card.confidence:.2%})")
    
    if result.errors:
        print("\n❌ ERREURS:")
        for error in result.errors:
            print(f"  • {error}")
    
    if result.warnings:
        print("\n⚠️ AVERTISSEMENTS:")
        for warning in result.warnings:
            print(f"  • {warning}")
    
    if result.processing_notes:
        print("\n📝 NOTES DE TRAITEMENT:")
        for note in result.processing_notes:
            print(f"  • {note}")
    
    # Export format
    if result.export_text:
        print("\n📤 FORMAT D'EXPORT (Arena):")
        print("-" * 40)
        print(result.export_text)
    
    return result

# Exécuter le test
if __name__ == "__main__":
    print("🚀 Démarrage du test EasyOCR avec le vrai parser MTG...")
    print("⏳ Cela peut prendre quelques secondes...\n")
    
    try:
        result = asyncio.run(test_ocr())
        print("\n✅ Test terminé avec succès!")
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()