import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from ocr_parser import MTGOCRParser

class DummyScryfallService:
    async def enhanced_card_search(self, name, lang='en'):
        class Result:
            matched_name = name
            correction_applied = False
            card_data = {'name': name}
        return Result()

@pytest.mark.asyncio
async def test_parse_single_line():
    parser = MTGOCRParser(DummyScryfallService())
    line = '4 Lightning Bolt'
    card = await parser._parse_single_line_enhanced(line, 0)
    assert card is not None
    assert card.name == 'Lightning Bolt'
    assert card.quantity == 4 