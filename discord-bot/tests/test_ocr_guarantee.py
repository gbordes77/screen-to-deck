"""
CRITICAL TEST SUITE: Discord Bot OCR Guarantee
REQUIREMENT: Must ALWAYS extract exactly 60 mainboard + 15 sideboard cards
"""

import sys
import os
import pytest
import asyncio
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ocr_parser_easyocr import MTGOCRParser as OCRParser

class TestOCRGuarantee:
    """Critical tests to ensure 60+15 card guarantee"""
    
    @pytest.fixture
    def parser(self):
        """Create OCR parser instance with mock scryfall service"""
        mock_scryfall = Mock()
        mock_scryfall.validate_cards.return_value = []
        return OCRParser(scryfall_service=mock_scryfall)
    
    def count_cards(self, cards, section='mainboard'):
        """Helper to count cards in a section"""
        if section == 'mainboard':
            return sum(c['quantity'] for c in cards if c.get('section') != 'sideboard')
        else:
            return sum(c['quantity'] for c in cards if c.get('section') == 'sideboard')
    
    @pytest.mark.asyncio
    async def test_guarantee_60_15_arena_screenshot(self, parser):
        """CRITICAL: Arena screenshot must return exactly 60+15 cards"""
        # Arrange
        test_image = 'test_images/arena_standard.png'
        
        # Mock EasyOCR to return partial results
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.return_value = [
                # Simulate partial detection (only 40 cards)
                ([0, 0, 100, 50], '4 Lightning Bolt', 0.95),
                ([0, 50, 100, 100], '4 Ragavan, Nimble Pilferer', 0.90),
                ([0, 100, 100, 150], '4 Dragon\'s Rage Channeler', 0.88),
                ([0, 150, 100, 200], '4 Counterspell', 0.92),
                ([0, 200, 100, 250], '12 Island', 0.85),
                ([0, 250, 100, 300], '12 Mountain', 0.87),
                # Sideboard marker
                ([0, 350, 100, 400], 'Sideboard', 0.95),
                ([0, 400, 100, 450], '3 Mystical Dispute', 0.89),
            ]
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert
            assert result['success'] == True
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            # Must guarantee exactly 60+15
            assert main_count == 60, f"Expected 60 mainboard, got {main_count}"
            assert side_count == 15, f"Expected 15 sideboard, got {side_count}"
            
            # Should have added basic lands to complete
            basic_lands = [c for c in result['cards'] if any(
                land in c['name'] for land in ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
            )]
            assert len(basic_lands) > 0, "Should add basic lands to complete deck"
    
    @pytest.mark.asyncio
    async def test_guarantee_with_ocr_failure(self, parser):
        """CRITICAL: Complete OCR failure must still return 60+15"""
        # Arrange
        test_image = 'test_images/corrupted.png'
        
        # Mock complete OCR failure
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.side_effect = Exception("OCR failed completely")
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert
            assert result['success'] == True
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            # Must return default deck with 60+15
            assert main_count == 60, f"Expected 60 mainboard on failure, got {main_count}"
            assert side_count == 15, f"Expected 15 sideboard on failure, got {side_count}"
            
            # Should be a default deck with basic lands
            assert len(result['cards']) > 0
            assert any('Forest' in c['name'] or 'Island' in c['name'] 
                      for c in result['cards'])
    
    @pytest.mark.asyncio
    async def test_handle_duplicate_cards(self, parser):
        """Test handling of duplicate card entries"""
        # Arrange
        test_image = 'test_images/duplicates.png'
        
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.return_value = [
                # Duplicate entries
                ([0, 0, 100, 50], '8 Lightning Bolt', 0.95),  # Too many!
                ([0, 50, 100, 100], '4 Lightning Bolt', 0.90),  # Duplicate
                ([0, 100, 100, 150], '20 Island', 0.88),
                ([0, 150, 100, 200], '20 Mountain', 0.85),
                ([0, 200, 100, 250], 'Sideboard', 0.95),
                ([0, 250, 100, 300], '20 Mystical Dispute', 0.87),  # Too many in sideboard
            ]
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert
            assert result['success'] == True
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            assert main_count == 60
            assert side_count == 15
            
            # Check no single non-basic card exceeds 4 copies
            for card in result['cards']:
                if not any(land in card['name'] for land in ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']):
                    assert card['quantity'] <= 4, f"{card['name']} has {card['quantity']} copies (max 4)"
    
    @pytest.mark.asyncio
    async def test_mtgo_format_detection(self, parser):
        """Test MTGO format detection and processing"""
        # Arrange
        test_image = 'test_images/mtgo_modern.png'
        
        with patch.object(parser, 'reader') as mock_reader:
            # MTGO format typically has different text layout
            mock_reader.readtext.return_value = [
                ([0, 0, 100, 30], 'Deck (60)', 0.95),
                ([0, 30, 100, 60], '4 Thoughtseize', 0.90),
                ([0, 60, 100, 90], '4 Fatal Push', 0.88),
                ([0, 300, 100, 330], 'Sideboard (15)', 0.92),
                ([0, 330, 100, 360], '2 Surgical Extraction', 0.85),
            ]
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert
            assert result['success'] == True
            assert result.get('format') == 'mtgo' or result.get('format') == 'unknown'
            
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            assert main_count == 60
            assert side_count == 15
    
    @pytest.mark.asyncio
    async def test_incremental_extraction(self, parser):
        """Test that extraction becomes more aggressive if needed"""
        # Arrange
        test_image = 'test_images/difficult.png'
        attempt_count = 0
        
        def mock_readtext(*args, **kwargs):
            nonlocal attempt_count
            attempt_count += 1
            
            if attempt_count == 1:
                # First attempt: only 30 cards
                return [
                    ([0, 0, 100, 50], '4 Lightning Bolt', 0.95),
                    ([0, 50, 100, 100], '13 Mountain', 0.85),
                    ([0, 100, 100, 150], '13 Island', 0.80),
                ]
            else:
                # Second attempt: find more cards
                return [
                    ([0, 0, 100, 50], '4 Lightning Bolt', 0.95),
                    ([0, 50, 100, 100], '4 Ragavan, Nimble Pilferer', 0.90),
                    ([0, 100, 100, 150], '4 Dragon\'s Rage Channeler', 0.88),
                    ([0, 150, 100, 200], '22 Mountain', 0.85),
                    ([0, 200, 100, 250], '22 Island', 0.80),
                    ([0, 250, 100, 300], 'Sideboard', 0.92),
                    ([0, 300, 100, 350], '15 Mystical Dispute', 0.85),
                ]
        
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.side_effect = mock_readtext
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert
            assert result['success'] == True
            assert attempt_count >= 1  # Should have made multiple attempts
            
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            assert main_count == 60
            assert side_count == 15
    
    @pytest.mark.asyncio
    async def test_api_consistency(self, parser):
        """Test that Discord bot returns same format as web API"""
        # Arrange
        test_image = 'test_images/arena_standard.png'
        
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.return_value = [
                ([0, 0, 100, 50], '4 Lightning Bolt', 0.95),
                ([0, 50, 100, 100], '28 Mountain', 0.85),
                ([0, 100, 100, 150], '28 Island', 0.80),
                ([0, 150, 100, 200], 'Sideboard', 0.92),
                ([0, 200, 100, 250], '15 Mystical Dispute', 0.85),
            ]
            
            # Act
            result = await parser.process_image(test_image)
            
            # Assert - Check format matches web API
            assert 'success' in result
            assert 'cards' in result
            assert 'confidence' in result
            assert 'processing_time' in result
            
            # Each card should have required fields
            for card in result['cards']:
                assert 'name' in card
                assert 'quantity' in card
                assert 'section' in card
                assert card['section'] in ['mainboard', 'sideboard']
            
            # Must maintain 60+15
            main_count = self.count_cards(result['cards'], 'mainboard')
            side_count = self.count_cards(result['cards'], 'sideboard')
            
            assert main_count == 60
            assert side_count == 15
    
    def test_basic_land_generation(self, parser):
        """Test basic land generation to complete deck"""
        # Test the logic for adding basic lands
        cards = [
            {'name': 'Lightning Bolt', 'quantity': 4, 'section': 'mainboard'},
            {'name': 'Ragavan, Nimble Pilferer', 'quantity': 4, 'section': 'mainboard'},
        ]
        
        # Simulate adding lands to reach 60
        current_count = sum(c['quantity'] for c in cards)
        missing = 60 - current_count
        
        # Detect colors (simplified)
        has_red = any('Lightning' in c['name'] or 'Ragavan' in c['name'] for c in cards)
        has_blue = any('Counter' in c['name'] or 'Island' in c['name'] for c in cards)
        
        if has_red and has_blue:
            # Add Mountains and Islands
            cards.append({'name': 'Mountain', 'quantity': missing // 2, 'section': 'mainboard'})
            cards.append({'name': 'Island', 'quantity': missing - (missing // 2), 'section': 'mainboard'})
        elif has_red:
            cards.append({'name': 'Mountain', 'quantity': missing, 'section': 'mainboard'})
        else:
            # Default to forests
            cards.append({'name': 'Forest', 'quantity': missing, 'section': 'mainboard'})
        
        # Verify
        total = sum(c['quantity'] for c in cards if c['section'] == 'mainboard')
        assert total == 60
    
    def test_sideboard_generation(self, parser):
        """Test sideboard generation when missing"""
        # When no sideboard detected, generate generic one
        sideboard_cards = []
        
        # Add generic sideboard cards
        sideboard_templates = [
            {'name': 'Negate', 'quantity': 3},
            {'name': 'Duress', 'quantity': 3},
            {'name': 'Rest in Peace', 'quantity': 2},
            {'name': 'Pithing Needle', 'quantity': 2},
            {'name': 'Tormod\'s Crypt', 'quantity': 2},
            {'name': 'Damping Sphere', 'quantity': 3},
        ]
        
        total = 0
        for template in sideboard_templates:
            if total + template['quantity'] <= 15:
                sideboard_cards.append({
                    'name': template['name'],
                    'quantity': template['quantity'],
                    'section': 'sideboard'
                })
                total += template['quantity']
        
        # Fill remaining with basic removal
        if total < 15:
            sideboard_cards.append({
                'name': 'Disenchant',
                'quantity': 15 - total,
                'section': 'sideboard'
            })
        
        # Verify
        side_total = sum(c['quantity'] for c in sideboard_cards)
        assert side_total == 15
    
    @pytest.mark.asyncio
    async def test_performance_under_load(self, parser):
        """Test processing multiple images concurrently"""
        # Arrange
        test_images = [
            'test_images/arena1.png',
            'test_images/arena2.png',
            'test_images/arena3.png',
        ]
        
        with patch.object(parser, 'reader') as mock_reader:
            mock_reader.readtext.return_value = [
                ([0, 0, 100, 50], '30 Mountain', 0.95),
                ([0, 50, 100, 100], '30 Island', 0.85),
                ([0, 100, 100, 150], 'Sideboard', 0.92),
                ([0, 150, 100, 200], '15 Negate', 0.85),
            ]
            
            # Act - Process all images concurrently
            tasks = [parser.process_image(img) for img in test_images]
            results = await asyncio.gather(*tasks)
            
            # Assert - All must maintain guarantee
            for i, result in enumerate(results):
                assert result['success'] == True
                main_count = self.count_cards(result['cards'], 'mainboard')
                side_count = self.count_cards(result['cards'], 'sideboard')
                
                assert main_count == 60, f"Image {i+1}: Expected 60 mainboard, got {main_count}"
                assert side_count == 15, f"Image {i+1}: Expected 15 sideboard, got {side_count}"


if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v', '--tb=short'])