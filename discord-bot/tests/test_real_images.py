"""
Real Image Test Suite for Discord Bot
Tests the OCR parser with actual MTG images to validate 60+15 guarantee
"""

import sys
import os
import time
import json
import asyncio
import tracemalloc
from pathlib import Path
from typing import Dict, List, Tuple
from unittest.mock import Mock, patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from ocr_parser_easyocr import MTGOCRParser

class TestRealImages:
    """Test suite for real MTG images"""
    
    @pytest.fixture
    def parser(self):
        """Create parser with mock Scryfall service"""
        mock_scryfall = Mock()
        # Mock validation to return cards as-is
        mock_scryfall.validate_cards = Mock(return_value=[])
        return MTGOCRParser(scryfall_service=mock_scryfall)
    
    @pytest.fixture
    def test_images_dir(self):
        """Get test images directory"""
        # Navigate from discord-bot/tests to server/tests/test-images
        current_file = Path(__file__).absolute()  # /path/to/discord-bot/tests/test_real_images.py
        discord_bot_dir = current_file.parent.parent  # /path/to/discord-bot
        project_root = discord_bot_dir.parent  # /path/to/project
        test_images_path = project_root / 'server' / 'tests' / 'test-images'
        
        # Fallback if structure is different
        if not test_images_path.exists():
            # Try relative path from working directory
            test_images_path = Path('server/tests/test-images')
        
        return test_images_path
    
    @pytest.fixture
    def test_metadata(self, test_images_dir):
        """Load test image metadata"""
        metadata_path = test_images_dir / 'test-images-metadata.json'
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                return json.load(f)
        return {'images': []}
    
    def count_cards(self, cards: List[Dict]) -> Tuple[int, int]:
        """Count mainboard and sideboard cards"""
        mainboard = sum(c['quantity'] for c in cards if c.get('section') != 'sideboard')
        sideboard = sum(c['quantity'] for c in cards if c.get('section') == 'sideboard')
        return mainboard, sideboard
    
    @pytest.mark.asyncio
    async def test_arena_standard_image(self, parser, test_images_dir):
        """Test Arena standard deck screenshot"""
        image_path = test_images_dir / 'arena-standard.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        start_time = time.time()
        result = await parser.parse_image(str(image_path))
        duration = (time.time() - start_time) * 1000
        
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard, got {sideboard}"
        assert duration < 5000, f"Processing took {duration}ms, expected < 5000ms"
        
        print(f"\n✅ Arena Standard: {mainboard}+{sideboard} in {duration:.0f}ms")
    
    @pytest.mark.asyncio
    async def test_mtgo_modern_image(self, parser, test_images_dir):
        """Test MTGO modern deck export"""
        image_path = test_images_dir / 'mtgo-modern.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        start_time = time.time()
        result = await parser.parse_image(str(image_path))
        duration = (time.time() - start_time) * 1000
        
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard, got {sideboard}"
        assert duration < 5000, f"Processing took {duration}ms, expected < 5000ms"
        
        print(f"\n✅ MTGO Modern: {mainboard}+{sideboard} in {duration:.0f}ms")
    
    @pytest.mark.asyncio
    async def test_low_quality_image(self, parser, test_images_dir):
        """Test low quality/blurry image"""
        image_path = test_images_dir / 'low-quality.jpg'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        start_time = time.time()
        result = await parser.parse_image(str(image_path))
        duration = (time.time() - start_time) * 1000
        
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard, got {sideboard}"
        
        print(f"\n✅ Low Quality: {mainboard}+{sideboard} in {duration:.0f}ms")
    
    @pytest.mark.asyncio
    async def test_partial_deck_padding(self, parser, test_images_dir):
        """Test partial deck gets padded to 60+15"""
        image_path = test_images_dir / 'partial-deck.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        result = await parser.parse_image(str(image_path))
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard after padding, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard after padding, got {sideboard}"
        
        # Check that lands were added
        lands = [c for c in result['cards'] if any(
            land in c['name'] for land in ['Mountain', 'Island', 'Swamp', 'Plains', 'Forest']
        )]
        assert len(lands) > 0, "Expected lands to be added for padding"
        
        print(f"\n✅ Partial Deck: Padded to {mainboard}+{sideboard}")
    
    @pytest.mark.asyncio
    async def test_oversized_deck_trimming(self, parser, test_images_dir):
        """Test oversized deck gets trimmed to 60+15"""
        image_path = test_images_dir / 'oversized-deck.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        result = await parser.parse_image(str(image_path))
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard after trimming, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard after trimming, got {sideboard}"
        
        print(f"\n✅ Oversized Deck: Trimmed to {mainboard}+{sideboard}")
    
    @pytest.mark.asyncio
    async def test_empty_image_emergency_deck(self, parser, test_images_dir):
        """Test empty image returns emergency deck"""
        image_path = test_images_dir / 'empty-image.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        result = await parser.parse_image(str(image_path))
        mainboard, sideboard = self.count_cards(result['cards'])
        
        assert mainboard == 60, f"Expected 60 mainboard from emergency deck, got {mainboard}"
        assert sideboard == 15, f"Expected 15 sideboard from emergency deck, got {sideboard}"
        
        # Check that it's using the fallback deck
        assert any('Mountain' in c['name'] for c in result['cards']), "Expected basic lands in emergency deck"
        
        print(f"\n✅ Empty Image: Emergency deck {mainboard}+{sideboard}")
    
    @pytest.mark.asyncio
    async def test_all_images_guarantee(self, parser, test_metadata, test_images_dir):
        """Test that ALL images return exactly 60+15"""
        results = []
        
        for image_info in test_metadata['images']:
            image_path = test_images_dir / image_info['file']
            if not image_path.exists():
                continue
            
            start_time = time.time()
            result = await parser.parse_image(str(image_path))
            duration = (time.time() - start_time) * 1000
            
            mainboard, sideboard = self.count_cards(result['cards'])
            success = mainboard == 60 and sideboard == 15
            
            results.append({
                'file': image_info['file'],
                'mainboard': mainboard,
                'sideboard': sideboard,
                'duration': duration,
                'success': success
            })
        
        # Generate report
        print("\n" + "="*50)
        print("📊 DISCORD BOT TEST RESULTS")
        print("="*50)
        
        for r in results:
            status = "✅" if r['success'] else "❌"
            print(f"{status} {r['file']}: {r['mainboard']}+{r['sideboard']} ({r['duration']:.0f}ms)")
        
        success_rate = sum(1 for r in results if r['success']) / len(results) * 100
        avg_duration = sum(r['duration'] for r in results) / len(results)
        
        print("\n📈 Summary:")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Avg Duration: {avg_duration:.0f}ms")
        print(f"   All 60+15: {'✅ YES' if success_rate == 100 else '❌ NO'}")
        
        # All must succeed
        assert all(r['success'] for r in results), "Not all images returned 60+15"
    
    @pytest.mark.asyncio
    async def test_consistency(self, parser, test_images_dir):
        """Test that same image returns consistent results"""
        image_path = test_images_dir / 'arena-standard.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        results = []
        for _ in range(3):
            result = await parser.parse_image(str(image_path))
            mainboard, sideboard = self.count_cards(result['cards'])
            results.append((mainboard, sideboard))
        
        # All runs should return exactly 60+15
        for main, side in results:
            assert main == 60, f"Inconsistent mainboard count: {main}"
            assert side == 15, f"Inconsistent sideboard count: {side}"
        
        print(f"\n✅ Consistency: All 3 runs returned 60+15")
    
    @pytest.mark.asyncio
    async def test_memory_usage(self, parser, test_images_dir):
        """Test memory usage stays reasonable"""
        image_path = test_images_dir / 'arena-standard.png'
        if not image_path.exists():
            pytest.skip(f"Test image not found: {image_path}")
        
        tracemalloc.start()
        
        # Process image multiple times
        for _ in range(5):
            await parser.parse_image(str(image_path))
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Convert to MB
        peak_mb = peak / 1024 / 1024
        
        assert peak_mb < 200, f"Memory usage too high: {peak_mb:.1f}MB"
        print(f"\n✅ Memory Usage: Peak {peak_mb:.1f}MB (< 200MB)")


class TestPerformance:
    """Performance-focused tests"""
    
    @pytest.fixture
    def parser(self):
        """Create parser for performance testing"""
        mock_scryfall = Mock()
        mock_scryfall.validate_cards = Mock(return_value=[])
        return MTGOCRParser(scryfall_service=mock_scryfall)
    
    @pytest.mark.asyncio
    async def test_parallel_processing(self, parser, test_images_dir):
        """Test parallel processing of multiple images"""
        image_files = ['arena-standard.png', 'mtgo-modern.png', 'low-quality.jpg']
        image_paths = [test_images_dir / f for f in image_files]
        
        # Skip if any image is missing
        if not all(p.exists() for p in image_paths):
            pytest.skip("Not all test images found")
        
        start_time = time.time()
        
        # Process all images in parallel
        tasks = [parser.parse_image(str(p)) for p in image_paths]
        results = await asyncio.gather(*tasks)
        
        duration = time.time() - start_time
        
        # All should return 60+15
        for result in results:
            cards = result['cards']
            mainboard = sum(c['quantity'] for c in cards if c.get('section') != 'sideboard')
            sideboard = sum(c['quantity'] for c in cards if c.get('section') == 'sideboard')
            assert mainboard == 60
            assert sideboard == 15
        
        print(f"\n✅ Parallel Processing: {len(results)} images in {duration:.1f}s")
        assert duration < 10, f"Parallel processing too slow: {duration:.1f}s"


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])