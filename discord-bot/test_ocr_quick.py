#!/usr/bin/env python3
"""
🧪 Test rapide des améliorations OCR
Usage: python test_ocr_quick.py [image_path]
"""

import asyncio
import sys
import os
from pathlib import Path

# Import des modules
from ocr_parser_enhanced import MTGOCRParser
from scryfall_service import ScryfallService

async def test_ocr_on_image(image_path: str):
    """Test rapide de l'OCR amélioré sur une image"""
    
    if not os.path.exists(image_path):
        print(f"❌ Image non trouvée: {image_path}")
        return False
    
    print(f"🧪 Test OCR amélioré sur: {image_path}")
    print("="*60)
    
    try:
        async with ScryfallService() as scryfall:
            parser = MTGOCRParser(scryfall)
            result = await parser.parse_deck_image(image_path)
            
            # Affichage des résultats
            print(f"\n📊 RÉSULTATS:")
            print(f"  - Cartes détectées: {len(result.cards)}")
            print(f"  - Cartes validées: {len([c for c in result.cards if c.is_validated])}")
            print(f"  - Confiance moyenne: {result.confidence_score:.1%}")
            print(f"  - Main: {result.main_count}, Side: {result.side_count}")
            
            if result.export_text:
                print(f"\n📤 EXPORT GÉNÉRÉ:")
                print(result.export_text)
                
                # Sauvegarder l'export
                export_path = f"export_{Path(image_path).stem}.txt"
                with open(export_path, 'w', encoding='utf-8') as f:
                    f.write(result.export_text)
                print(f"\n💾 Export sauvegardé: {export_path}")
            else:
                print("\n❌ Aucun export généré")
            
            if result.errors:
                print(f"\n⚠️ ERREURS:")
                for error in result.errors:
                    print(f"  - {error}")
            
            if result.warnings:
                print(f"\n⚠️ AVERTISSEMENTS:")
                for warning in result.warnings:
                    print(f"  - {warning}")
            
            # Vérifier si l'image prétraitée existe
            if os.path.exists("preprocessed_debug.png"):
                print(f"\n🔍 Image prétraitée sauvegardée: preprocessed_debug.png")
            
            success = len([c for c in result.cards if c.is_validated]) > 0
            print(f"\n🎯 RÉSULTAT: {'✅ SUCCÈS' if success else '❌ ÉCHEC'}")
            
            return success
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

async def main():
    """Fonction principale"""
    
    # Vérifier les arguments
    if len(sys.argv) < 2:
        print("Usage: python test_ocr_quick.py <image_path>")
        print("Exemple: python test_ocr_quick.py deck_image.png")
        return
    
    image_path = sys.argv[1]
    success = await test_ocr_on_image(image_path)
    
    if success:
        print("\n🎉 Le correctif OCR fonctionne correctement !")
    else:
        print("\n⚠️ Le correctif OCR nécessite des ajustements.")

if __name__ == "__main__":
    asyncio.run(main()) 