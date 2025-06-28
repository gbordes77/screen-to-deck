import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from scryfall_service import ScryfallService

class DummyScryfallService(ScryfallService):
    async def search_card_exact(self, name):
        if name.lower() == 'lightning bolt':
            return {'name': 'Lightning Bolt'}
        return None
    async def search_card_fuzzy(self, name):
        if 'bolt' in name.lower():
            return {'name': 'Lightning Bolt'}
        return None
    async def autocomplete_card_names(self, partial):
        return ['Lightning Bolt']

@pytest.mark.asyncio
async def test_enhanced_card_search():
    service = DummyScryfallService()
    result = await service.enhanced_card_search('Lighming Bolt')
    assert result.matched_name == 'Lightning Bolt'
    assert result.correction_applied 