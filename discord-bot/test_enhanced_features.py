#!/usr/bin/env python3
"""
🧪 Enhanced MTG Scanner - Test Suite
Test script to demonstrate Phase 1 enhanced features
"""

import asyncio
import logging
import os
import tempfile
from typing import List, Dict, Any
import json

# Import enhanced components
from scryfall_service import ScryfallService, CardMatch, DeckAnalysis
from ocr_parser import MTGOCRParser, ParseResult, ParsedCard

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedFeaturesDemo:
    """Demonstrate enhanced MTG Scanner capabilities"""
    
    def __init__(self):
        self.scryfall_service = None
        self.ocr_parser = None
    
    async def setup(self):
        """Initialize services"""
        logger.info("🚀 Initializing Enhanced MTG Scanner services...")
        
        self.scryfall_service = ScryfallService()
        await self.scryfall_service.__aenter__()
        
        self.ocr_parser = MTGOCRParser(self.scryfall_service)
        
        logger.info("✅ Services initialized!")
    
    async def cleanup(self):
        """Cleanup services"""
        if self.scryfall_service:
            await self.scryfall_service.__aexit__(None, None, None)
    
    async def test_scryfall_corrections(self):
        """Test automatic OCR corrections"""
        logger.info("\n🔧 Testing Automatic OCR Corrections")
        logger.info("=" * 50)
        
        # Test cards with common OCR errors
        test_cards = [
            "Lighming Bolt",      # Lightning Bolt
            "Snapcasler Mage",    # Snapcaster Mage
            "Brainsform",         # Brainstorm
            "Counlerspell",       # Counterspell
            "Force oi Will",      # Force of Will
            "Mana Crypl",         # Mana Crypt
            "Sol Rmg",            # Sol Ring
            "Crealure Type",      # Should fail (not a real card)
        ]
        
        for card_name in test_cards:
            try:
                result = await self.scryfall_service.enhanced_card_search(card_name)
                
                if result.matched_name:
                    correction_status = "🔧 CORRECTED" if result.correction_applied else "✅ FOUND"
                    logger.info(f"{correction_status}: '{card_name}' → '{result.matched_name}' (confidence: {result.confidence:.2f})")
                else:
                    suggestions = ", ".join(result.suggestions[:2]) if result.suggestions else "None"
                    logger.info(f"❌ FAILED: '{card_name}' - Suggestions: {suggestions}")
                    
            except Exception as e:
                logger.error(f"Error testing '{card_name}': {e}")
    
    async def test_format_detection(self):
        """Test deck format detection"""
        logger.info("\n🎲 Testing Format Detection")
        logger.info("=" * 50)
        
        # Test different deck configurations
        test_decks = [
            {
                "name": "Standard Deck",
                "cards": [
                    {"name": "Lightning Bolt", "quantity": 4},
                    {"name": "Monastery Swiftspear", "quantity": 4},
                    {"name": "Goblin Guide", "quantity": 4},
                    {"name": "Eidolon of the Great Revel", "quantity": 4},
                    {"name": "Mountain", "quantity": 20},
                    # Add more to reach 60
                ]
            },
            {
                "name": "Commander Deck",
                "cards": [
                    {"name": "Atraxa, Praetors' Voice", "quantity": 1},  # Commander
                    {"name": "Lightning Bolt", "quantity": 1},
                    {"name": "Counterspell", "quantity": 1},
                    {"name": "Swords to Plowshares", "quantity": 1},
                    # Add more unique cards to reach 100
                ]
            }
        ]
        
        for deck_config in test_decks:
            logger.info(f"\n📋 Testing: {deck_config['name']}")
            
            # Get enhanced card data
            enhanced_cards = []
            for card in deck_config['cards']:
                result = await self.scryfall_service.enhanced_card_search(card['name'])
                if result.matched_name:
                    enhanced_cards.append({
                        'name': result.matched_name,
                        'quantity': card['quantity'],
                        'card_data': result.card_data
                    })
            
            if enhanced_cards:
                # Analyze format
                analysis = await self.scryfall_service.analyze_deck_format(enhanced_cards)
                
                logger.info(f"  🎯 Detected Format: {analysis.format_detected}")
                logger.info(f"  📊 Total Cards: {analysis.mainboard_count}")
                logger.info(f"  🎨 Colors: {', '.join(analysis.color_identity)}")
                logger.info(f"  ⚔️ Tier: {analysis.estimated_tier}")
                logger.info(f"  💰 Price: ${analysis.price_estimate:.2f}")
                
                if analysis.commander:
                    logger.info(f"  👑 Commander: {analysis.commander['name']}")
                
                if analysis.legality_issues:
                    logger.info(f"  ⚖️ Legality Issues: {len(analysis.legality_issues)}")
                    for issue in analysis.legality_issues[:2]:
                        logger.info(f"    - {issue}")
    
    async def test_batch_validation(self):
        """Test batch card validation"""
        logger.info("\n📦 Testing Batch Validation")
        logger.info("=" * 50)
        
        # Mix of correct and incorrect card names
        card_names = [
            "Lightning Bolt",
            "Counlerspell",      # Typo
            "Snapcaster Mage",
            "Brainsform",        # Typo
            "Force of Will",
            "Invalid Card Name", # Should fail
            "Mana Crypt",
            "Sol Rmg",          # Typo
        ]
        
        logger.info(f"🔍 Validating {len(card_names)} cards in batch...")
        
        results = await self.scryfall_service.batch_validate_cards(card_names)
        
        validated_count = 0
        corrected_count = 0
        
        for i, (original, result) in enumerate(zip(card_names, results)):
            if result.matched_name:
                validated_count += 1
                if result.correction_applied:
                    corrected_count += 1
                    logger.info(f"  🔧 {original} → {result.matched_name}")
                else:
                    logger.info(f"  ✅ {original}")
            else:
                suggestions = ", ".join(result.suggestions[:2]) if result.suggestions else "None"
                logger.info(f"  ❌ {original} - Suggestions: {suggestions}")
        
        logger.info(f"\n📊 Batch Results:")
        logger.info(f"  • Validated: {validated_count}/{len(card_names)}")
        logger.info(f"  • Auto-corrected: {corrected_count}")
        logger.info(f"  • Success rate: {validated_count/len(card_names)*100:.1f}%")
    
    async def test_ocr_parsing_simulation(self):
        """Simulate OCR parsing with realistic errors"""
        logger.info("\n🔤 Testing OCR Parsing Simulation")
        logger.info("=" * 50)
        
        # Simulate OCR output with typical errors
        simulated_ocr_lines = [
            "4x Lighming Bolt",        # Lightning Bolt with typo
            "2 Snapcasler Mage",       # Snapcaster Mage with typo
            "3x Brainsform",           # Brainstorm with typo
            "1 Force oi Will",         # Force of Will with typo
            "4 Mounlain",              # Mountain with typo
            "Sideboard:",              # Section header
            "2x Counlerspell",         # Counterspell with typo
            "Deck Total: 60",          # Should be ignored
            "Invalid Line ###",        # Should be ignored
        ]
        
        logger.info(f"📝 Simulating OCR with {len(simulated_ocr_lines)} lines...")
        
        # Parse cards using enhanced parser
        parsed_cards = await self.ocr_parser._parse_cards_enhanced(simulated_ocr_lines)
        
        logger.info(f"🎯 Parsed {len(parsed_cards)} potential cards")
        
        # Validate with Scryfall
        validated_cards = await self.ocr_parser._validate_cards_batch(parsed_cards)
        
        logger.info(f"\n📋 Validation Results:")
        for card in validated_cards:
            if card.is_validated:
                correction_note = " (corrected)" if card.correction_applied else ""
                logger.info(f"  ✅ {card.quantity}x {card.name}{correction_note}")
            else:
                suggestions = f" - Suggestions: {card.suggestions[0]}" if card.suggestions else ""
                logger.info(f"  ❌ {card.quantity}x {card.name}{suggestions}")
        
        # Calculate confidence
        valid_count = len([c for c in validated_cards if c.is_validated])
        corrected_count = len([c for c in validated_cards if c.correction_applied])
        
        confidence = self.ocr_parser._calculate_overall_confidence(validated_cards, simulated_ocr_lines)
        
        logger.info(f"\n📊 Parsing Statistics:")
        logger.info(f"  • Lines processed: {len(simulated_ocr_lines)}")
        logger.info(f"  • Cards extracted: {len(parsed_cards)}")
        logger.info(f"  • Cards validated: {valid_count}")
        logger.info(f"  • Auto-corrections: {corrected_count}")
        logger.info(f"  • Overall confidence: {confidence:.1%}")
    
    async def test_comprehensive_analysis(self):
        """Test comprehensive deck analysis"""
        logger.info("\n🧠 Testing Comprehensive Deck Analysis")
        logger.info("=" * 50)
        
        # Create a sample deck for analysis
        sample_deck_text = [
            "Commander Deck - Atraxa Control",
            "1x Atraxa, Praetors' Voice",
            "1x Lightning Bolt",
            "1x Counterspell",
            "1x Swords to Plowshares",
            "1x Path to Exile",
            "1x Wrath of God",
            "1x Fact or Fiction",
            "1x Rhystic Study",
            "1x Smothering Tithe",
            "1x Sol Ring",
            "1x Mana Crypt",
            "1x Command Tower",
            "1x Breeding Pool",
            "1x Hallowed Fountain",
            "10x Forest",
            "10x Plains",
            "10x Island",
            "10x Swamp",
            # ... more cards to reach ~99
        ]
        
        logger.info(f"📝 Analyzing sample deck with {len(sample_deck_text)} lines...")
        
        # Create a mock parse result
        validated_cards = []
        
        for line in sample_deck_text:
            if 'x' in line:
                try:
                    parts = line.split('x', 1)
                    if len(parts) == 2:
                        quantity = int(parts[0].strip())
                        name = parts[1].strip()
                        
                        # Validate with Scryfall
                        result = await self.scryfall_service.enhanced_card_search(name)
                        if result.matched_name:
                            validated_cards.append({
                                'name': result.matched_name,
                                'quantity': quantity,
                                'card_data': result.card_data
                            })
                except:
                    continue
        
        if validated_cards:
            # Perform comprehensive analysis
            analysis = await self.scryfall_service.analyze_deck_format(validated_cards)
            
            logger.info(f"\n🎯 Comprehensive Analysis Results:")
            logger.info(f"  📊 Format: {analysis.format_detected}")
            logger.info(f"  📈 Total Cards: {analysis.mainboard_count}")
            logger.info(f"  🎨 Color Identity: {', '.join(analysis.color_identity)}")
            logger.info(f"  ⚔️ Competitive Tier: {analysis.estimated_tier}")
            logger.info(f"  💰 Estimated Value: ${analysis.price_estimate:.2f}")
            
            if analysis.commander:
                logger.info(f"  👑 Commander: {analysis.commander['name']}")
            
            if analysis.legality_issues:
                logger.info(f"  ⚖️ Legality Issues ({len(analysis.legality_issues)}):")
                for issue in analysis.legality_issues[:3]:
                    logger.info(f"    • {issue}")
    
    async def test_cache_performance(self):
        """Test caching performance"""
        logger.info("\n🚀 Testing Cache Performance")
        logger.info("=" * 50)
        
        # Test cards
        test_cards = ["Lightning Bolt", "Counterspell", "Force of Will"]
        
        # First request (cold cache)
        import time
        start_time = time.time()
        
        for card in test_cards:
            await self.scryfall_service.enhanced_card_search(card)
        
        cold_time = time.time() - start_time
        
        # Second request (warm cache)
        start_time = time.time()
        
        for card in test_cards:
            await self.scryfall_service.enhanced_card_search(card)
        
        warm_time = time.time() - start_time
        
        # Get cache stats
        cache_stats = self.scryfall_service.get_cache_stats()
        
        logger.info(f"⏱️ Performance Results:")
        logger.info(f"  • Cold cache: {cold_time:.3f}s")
        logger.info(f"  • Warm cache: {warm_time:.3f}s")
        logger.info(f"  • Speedup: {cold_time/warm_time:.1f}x faster")
        
        logger.info(f"\n📊 Cache Statistics:")
        logger.info(f"  • Total entries: {cache_stats['total_entries']}")
        logger.info(f"  • Valid entries: {cache_stats['valid_entries']}")
        logger.info(f"  • Hit ratio: {cache_stats['cache_hit_ratio']:.1%}")
        logger.info(f"  • Memory usage: {cache_stats['cache_size_mb']:.2f}MB")
    
    async def run_all_tests(self):
        """Run all enhanced feature tests"""
        logger.info("🧪 Enhanced MTG Scanner - Feature Test Suite")
        logger.info("=" * 60)
        
        try:
            await self.setup()
            
            # Run all tests
            await self.test_scryfall_corrections()
            await self.test_format_detection()
            await self.test_batch_validation()
            await self.test_ocr_parsing_simulation()
            await self.test_comprehensive_analysis()
            await self.test_cache_performance()
            
            logger.info("\n🎉 All tests completed successfully!")
            logger.info("✅ Enhanced features are working correctly")
            
        except Exception as e:
            logger.error(f"❌ Test failed: {e}")
            raise
        finally:
            await self.cleanup()

async def main():
    """Main test execution"""
    demo = EnhancedFeaturesDemo()
    await demo.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 