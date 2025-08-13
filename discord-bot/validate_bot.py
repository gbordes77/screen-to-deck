#!/usr/bin/env python3
"""
Script de validation pour vérifier que le bot peut démarrer avec les nouvelles fonctionnalités
"""

import sys
import importlib.util

def test_imports():
    """Test que tous les imports nécessaires sont disponibles"""
    print("🔍 Vérification des imports du bot Discord...")
    print("=" * 50)
    
    modules_to_test = [
        ('discord', 'Discord.py library'),
        ('discord.ext.commands', 'Discord commands extension'),
        ('aiohttp', 'Async HTTP client'),
        ('PIL', 'Python Imaging Library'),
        ('clipboard_service', 'Clipboard service (NEW)'),
        ('deck_processor', 'Deck processor'),
        ('scryfall_service', 'Scryfall service'),
        ('utils.logger', 'Logger utilities'),
    ]
    
    all_good = True
    for module_name, description in modules_to_test:
        try:
            if module_name == 'discord.ext.commands':
                from discord.ext import commands
            else:
                __import__(module_name)
            print(f"✅ {module_name}: OK - {description}")
        except ImportError as e:
            print(f"❌ {module_name}: ERREUR - {e}")
            all_good = False
    
    print("=" * 50)
    return all_good

def test_clipboard_integration():
    """Test l'intégration du service de clipboard"""
    print("\n📋 Test d'intégration du ClipboardService...")
    print("=" * 50)
    
    try:
        from clipboard_service import ClipboardService, CopyDeckButton, QuickCopyView
        
        # Créer une instance
        service = ClipboardService()
        
        # Test basique
        test_deck = "4 Lightning Bolt\n4 Counterspell"
        service.cache_deck(12345, test_deck, 'mtga')
        
        cached = service.get_cached_deck(12345)
        if cached and cached.deck_content == test_deck:
            print("✅ Cache du deck: OK")
        else:
            print("❌ Cache du deck: ERREUR")
            return False
            
        # Test génération d'ID
        deck_id = service.generate_deck_id(test_deck)
        if len(deck_id) == 8:
            print("✅ Génération d'ID: OK")
        else:
            print("❌ Génération d'ID: ERREUR")
            return False
            
        # Test instructions
        instructions = service.create_copy_instructions_text('mtga')
        if "MTG Arena" in instructions:
            print("✅ Instructions de copie: OK")
        else:
            print("❌ Instructions de copie: ERREUR")
            return False
            
        print("✅ ClipboardService fonctionne correctement")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False

def test_bot_structure():
    """Vérifie que le bot peut être importé sans erreur"""
    print("\n🤖 Test de la structure du bot...")
    print("=" * 50)
    
    try:
        # Vérifier que les imports du bot fonctionnent
        # Note: On ne peut pas importer bot.py directement car il essaie de se connecter
        # Mais on peut vérifier que les dépendances sont là
        
        from ocr_parser_easyocr import ParseResult, ParsedCard
        print("✅ OCR Parser: OK")
        
        from deck_processor import DeckProcessor, ProcessedCard
        print("✅ Deck Processor: OK")
        
        from scryfall_service import ScryfallService
        print("✅ Scryfall Service: OK")
        
        print("✅ Structure du bot validée")
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    """Point d'entrée principal"""
    print("🚀 Validation du Discord Bot avec Clipboard Feature")
    print("=" * 70)
    
    # Test 1: Imports
    imports_ok = test_imports()
    
    # Test 2: Clipboard
    clipboard_ok = test_clipboard_integration()
    
    # Test 3: Structure
    structure_ok = test_bot_structure()
    
    # Résumé
    print("\n" + "=" * 70)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 70)
    
    tests = [
        ("Imports des modules", imports_ok),
        ("Service Clipboard", clipboard_ok),
        ("Structure du bot", structure_ok)
    ]
    
    for test_name, passed in tests:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(passed for _, passed in tests)
    
    print("=" * 70)
    if all_passed:
        print("✅ TOUS LES TESTS SONT PASSÉS!")
        print("Le bot est prêt à être déployé avec la fonctionnalité de copie.")
    else:
        print("⚠️ CERTAINS TESTS ONT ÉCHOUÉ")
        print("Veuillez corriger les erreurs avant le déploiement.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())