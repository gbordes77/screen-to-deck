#!/usr/bin/env python3
"""
Tests pour le service de copie dans le presse-papier
"""

import unittest
import asyncio
from datetime import datetime, timedelta
import sys
import os

# Ajouter le répertoire parent au path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from clipboard_service import ClipboardService, DeckCache

class TestClipboardService(unittest.TestCase):
    """Tests pour le ClipboardService"""
    
    def setUp(self):
        """Initialisation avant chaque test"""
        self.service = ClipboardService()
        
    def test_cache_deck(self):
        """Test de mise en cache d'un deck"""
        user_id = 123456
        deck_content = "4 Lightning Bolt\n4 Counterspell"
        format_type = "mtga"
        
        # Mettre en cache
        self.service.cache_deck(user_id, deck_content, format_type)
        
        # Vérifier que le cache existe
        cached = self.service.get_cached_deck(user_id)
        self.assertIsNotNone(cached)
        self.assertEqual(cached.deck_content, deck_content)
        self.assertEqual(cached.format_type, format_type)
        self.assertEqual(cached.user_id, user_id)
        
    def test_cache_expiration(self):
        """Test de l'expiration du cache"""
        user_id = 123456
        deck_content = "4 Lightning Bolt"
        
        # Créer un cache expiré
        self.service.user_deck_cache[user_id] = DeckCache(
            deck_content=deck_content,
            format_type="mtga",
            user_id=user_id,
            timestamp=datetime.now() - timedelta(minutes=31)  # Expiré
        )
        
        # Tenter de récupérer le cache
        cached = self.service.get_cached_deck(user_id)
        self.assertIsNone(cached)
        
        # Vérifier que le cache a été supprimé
        self.assertNotIn(user_id, self.service.user_deck_cache)
        
    def test_clean_old_cache(self):
        """Test du nettoyage automatique du cache"""
        # Créer plusieurs caches avec différents âges
        self.service.user_deck_cache[1] = DeckCache(
            deck_content="Deck 1",
            format_type="mtga",
            user_id=1,
            timestamp=datetime.now() - timedelta(minutes=40)  # Expiré
        )
        
        self.service.user_deck_cache[2] = DeckCache(
            deck_content="Deck 2",
            format_type="mtga",
            user_id=2,
            timestamp=datetime.now() - timedelta(minutes=10)  # Valide
        )
        
        self.service.user_deck_cache[3] = DeckCache(
            deck_content="Deck 3",
            format_type="mtga",
            user_id=3,
            timestamp=datetime.now() - timedelta(minutes=35)  # Expiré
        )
        
        # Nettoyer le cache
        self.service._clean_old_cache()
        
        # Vérifier que seul le cache valide reste
        self.assertEqual(len(self.service.user_deck_cache), 1)
        self.assertIn(2, self.service.user_deck_cache)
        self.assertNotIn(1, self.service.user_deck_cache)
        self.assertNotIn(3, self.service.user_deck_cache)
        
    def test_generate_deck_id(self):
        """Test de génération d'ID unique pour un deck"""
        deck1 = "4 Lightning Bolt\n4 Counterspell"
        deck2 = "4 Lightning Bolt\n4 Counterspell"
        deck3 = "4 Shock\n4 Cancel"
        
        # Les mêmes decks devraient avoir le même ID
        id1 = self.service.generate_deck_id(deck1)
        id2 = self.service.generate_deck_id(deck2)
        self.assertEqual(id1, id2)
        
        # Des decks différents devraient avoir des IDs différents
        id3 = self.service.generate_deck_id(deck3)
        self.assertNotEqual(id1, id3)
        
        # L'ID devrait avoir 8 caractères
        self.assertEqual(len(id1), 8)
        
    def test_create_copy_instructions_text(self):
        """Test de génération des instructions de copie"""
        # Test pour MTGA
        instructions = self.service.create_copy_instructions_text('mtga')
        self.assertIn("MTG Arena", instructions)
        self.assertIn("Importer", instructions)
        
        # Test pour Moxfield
        instructions = self.service.create_copy_instructions_text('moxfield')
        self.assertIn("Moxfield", instructions)
        self.assertIn("Bulk Import", instructions)
        
        # Test pour format inconnu (devrait retourner MTGA par défaut)
        instructions = self.service.create_copy_instructions_text('unknown')
        self.assertIn("MTG Arena", instructions)

class TestDeckExportIntegration(unittest.TestCase):
    """Tests d'intégration avec les exports de deck"""
    
    def setUp(self):
        """Initialisation avant chaque test"""
        self.service = ClipboardService()
        self.sample_deck_mtga = """Deck
4 Lightning Bolt
4 Counterspell
4 Shock
4 Cancel

Sideboard
2 Surgical Extraction
3 Negate"""
        
        self.sample_deck_moxfield = """4x Lightning Bolt
4x Counterspell
4x Shock
4x Cancel

Sideboard:
2x Surgical Extraction
3x Negate"""
        
    def test_cache_and_retrieve_mtga(self):
        """Test du cache et récupération pour MTGA"""
        user_id = 999
        
        # Mettre en cache un deck MTGA
        self.service.cache_deck(user_id, self.sample_deck_mtga, 'mtga')
        
        # Récupérer et vérifier
        cached = self.service.get_cached_deck(user_id)
        self.assertIsNotNone(cached)
        self.assertEqual(cached.format_type, 'mtga')
        self.assertIn("Lightning Bolt", cached.deck_content)
        self.assertIn("Sideboard", cached.deck_content)
        
    def test_multiple_users_cache(self):
        """Test du cache pour plusieurs utilisateurs"""
        # Mettre en cache pour plusieurs utilisateurs
        self.service.cache_deck(1, self.sample_deck_mtga, 'mtga')
        self.service.cache_deck(2, self.sample_deck_moxfield, 'moxfield')
        
        # Vérifier que chaque utilisateur a son propre cache
        cache1 = self.service.get_cached_deck(1)
        cache2 = self.service.get_cached_deck(2)
        
        self.assertIsNotNone(cache1)
        self.assertIsNotNone(cache2)
        self.assertEqual(cache1.format_type, 'mtga')
        self.assertEqual(cache2.format_type, 'moxfield')
        self.assertNotEqual(cache1.deck_content, cache2.deck_content)

if __name__ == '__main__':
    unittest.main()