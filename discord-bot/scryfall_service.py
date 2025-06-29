#!/usr/bin/env python3
"""
🃏 Scryfall API Service - Phase 1 Enhanced
Interface with Scryfall API for MTG card validation and data enrichment
Now with intelligent card correction, format detection, and advanced validation
"""

import asyncio
import aiohttp
import logging
import time
import re
import json
from typing import Dict, List, Optional, Any, Tuple, Set
from urllib.parse import quote
from fuzzywuzzy import fuzz
from datetime import datetime, timedelta
from dataclasses import dataclass
import csv

logger = logging.getLogger(__name__)

@dataclass
class CardMatch:
    """Represents a matched card with confidence and metadata"""
    original_name: str
    matched_name: str
    confidence: float
    card_data: Dict[str, Any]
    suggestions: List[str] = None
    correction_applied: bool = False

@dataclass
class DeckAnalysis:
    """Analysis of a complete deck"""
    format_detected: str
    commander: Optional[Dict[str, Any]]
    mainboard_count: int
    sideboard_count: int
    color_identity: List[str]
    estimated_tier: str
    legality_issues: List[str]
    price_estimate: float

class ScryfallService:
    """Enhanced Async service for interacting with Scryfall API"""
    
    def __init__(self):
        self.base_url = "https://api.scryfall.com"
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Rate limiting (Scryfall allows 50-100 requests per second)
        self.request_delay = 0.05  # 50ms between requests (more aggressive)
        self.burst_limit = 10  # Allow burst of 10 requests
        self.burst_window = 1.0  # Reset burst every second
        self.last_request_time = 0
        self.recent_requests = []
        
        # Enhanced caching with TTL
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = 7200  # 2 hours cache (longer for better performance)
        self.cache_timestamps: Dict[str, float] = {}
        
        # Card name correction cache
        self.correction_cache: Dict[str, str] = {}
        
        # Format detection patterns
        self.format_patterns = {
            'commander': {
                'keywords': ['commander', 'edh', 'general'],
                'deck_size': 100,
                'max_copies': 1,
                'requires_commander': True
            },
            'standard': {
                'keywords': ['standard', 'std'],
                'deck_size': 60,
                'max_copies': 4,
                'sideboard': 15
            },
            'modern': {
                'keywords': ['modern', 'mod'],
                'deck_size': 60,
                'max_copies': 4,
                'sideboard': 15
            },
            'legacy': {
                'keywords': ['legacy', 'leg'],
                'deck_size': 60,
                'max_copies': 4,
                'sideboard': 15
            },
            'vintage': {
                'keywords': ['vintage', 'vin'],
                'deck_size': 60,
                'max_copies': 4,
                'sideboard': 15
            },
            'pauper': {
                'keywords': ['pauper', 'pau'],
                'deck_size': 60,
                'max_copies': 4,
                'rarity_restriction': 'common'
            }
        }
        
        # Common OCR corrections
        self.ocr_corrections = {
            # Common OCR mistakes for MTG cards
            'lighming': 'lightning',
            'lighlning': 'lightning',
            'lightnmg': 'lightning',
            'snapcasler': 'snapcaster',
            'brainsform': 'brainstorm',
            'swords fo': 'swords to',
            'plowshares': 'plowshares',
            'counlerspell': 'counterspell',
            'force oi': 'force of',
            'oi will': 'of will',
            'mana crypl': 'mana crypt',
            'sol rmg': 'sol ring',
            'conmander': 'commander',
            'lerra': 'serra',
            'jace lhe': 'jace the',
            'leleri': 'teferi',
            'gideon oi': 'gideon of',
            'planeswalher': 'planeswalker',
            'crealure': 'creature',
            'mslant': 'instant',
            'sorcery': 'sorcery',
            'enchanlment': 'enchantment',
            'arlifact': 'artifact',
            'planar': 'planar',
        }
        
        # Language support
        self.supported_languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'ru', 'zhs']
        
        # Request headers
        self.headers = {
            'User-Agent': 'MTG-Discord-Scanner-Enhanced/2.0 (https://github.com/user/mtg-scanner)',
            'Accept': 'application/json'
        }
        
        self.cache_hits = 0
        self.cache_misses = 0
        self.timings = []
    
    async def __aenter__(self):
        """Async context manager entry"""
        if not self.session:
            connector = aiohttp.TCPConnector(limit=20, limit_per_host=10)  # Increased limits
            timeout = aiohttp.ClientTimeout(total=45, connect=15)  # Longer timeouts
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers=self.headers
            )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def _smart_rate_limit(self) -> None:
        """Enhanced rate limiting with burst support"""
        current_time = time.time()
        
        # Clean old requests from burst window
        self.recent_requests = [
            req_time for req_time in self.recent_requests 
            if current_time - req_time < self.burst_window
        ]
        
        # Check if we need to wait
        if len(self.recent_requests) >= self.burst_limit:
            # Too many recent requests, wait
            oldest_request = min(self.recent_requests)
            wait_time = self.burst_window - (current_time - oldest_request)
            if wait_time > 0:
                await asyncio.sleep(wait_time)
        else:
            # Normal rate limiting
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.request_delay:
                await asyncio.sleep(self.request_delay - time_since_last)
        
        # Record this request
        self.recent_requests.append(current_time)
        self.last_request_time = current_time
    
    def _apply_ocr_corrections(self, card_name: str) -> str:
        """Apply common OCR corrections to card names"""
        corrected = card_name.lower()
        
        # Apply known corrections
        for wrong, correct in self.ocr_corrections.items():
            if wrong in corrected:
                corrected = corrected.replace(wrong, correct)
        
        # Fix common character replacements
        char_fixes = {
            '0': 'o',  # Zero to o
            '1': 'l',  # One to l (only in middle of words)
            '5': 's',  # Five to s
            '8': 'b',  # Eight to b
            '6': 'g',  # Six to g
            '9': 'g',  # Nine to g
        }
        
        # Apply character fixes carefully
        words = corrected.split()
        fixed_words = []
        
        for word in words:
            fixed_word = word
            for wrong, correct in char_fixes.items():
                # Only replace if it makes sense
                if wrong in word and len(word) > 2:
                    # Don't replace at start of word unless it's clearly wrong
                    if word.index(wrong) > 0 or word.startswith(wrong) and len(word) > 3:
                        fixed_word = fixed_word.replace(wrong, correct)
            fixed_words.append(fixed_word)
        
        result = ' '.join(fixed_words)
        
        # Restore proper capitalization
        return ' '.join(word.capitalize() for word in result.split())
    
    async def _make_request(self, endpoint: str, params: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """Make rate-limited request to Scryfall API"""
        if not self.session:
            raise RuntimeError("ScryfallService not initialized. Use async context manager.")
        
        # Rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.request_delay:
            await asyncio.sleep(self.request_delay - time_since_last)
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            self.last_request_time = time.time()
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    logger.debug(f"Card not found: {endpoint}")
                    return None
                elif response.status == 429:
                    # Rate limited
                    retry_after = int(response.headers.get('Retry-After', 1))
                    logger.warning(f"Rate limited, waiting {retry_after} seconds")
                    await asyncio.sleep(retry_after)
                    return await self._make_request(endpoint, params)
                else:
                    logger.error(f"Scryfall API error {response.status}: {await response.text()}")
                    return None
        
        except asyncio.TimeoutError:
            logger.error(f"Timeout requesting {url}")
            return None
        except Exception as e:
            logger.error(f"Error requesting {url}: {e}")
            return None
    
    def _get_cache_key(self, endpoint: str, params: Dict[str, str] = None) -> str:
        """Generate cache key for request"""
        if params:
            param_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
            return f"{endpoint}?{param_str}"
        return endpoint
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.cache:
            return False
        
        timestamp = self.cache_timestamps.get(cache_key, 0)
        return time.time() - timestamp < self.cache_ttl
    
    def _cache_response(self, cache_key: str, data: Any):
        """Cache API response"""
        self.cache[cache_key] = data
        self.cache_timestamps[cache_key] = time.time()
    
    async def search_card_exact(self, name: str) -> Optional[Dict[str, Any]]:
        """Search for exact card name match"""
        cache_key = f"exact:{name.lower()}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/named"
        params = {'exact': name}
        
        logger.info(f"[Scryfall] search_card_exact: name='{name}' (param exact)")
        result = await self._make_request(endpoint, params)
        logger.info(f"[Scryfall] search_card_exact: response for '{name}': {result if result else 'None'}")
        self._cache_response(cache_key, result)
        
        return result
    
    async def search_card_fuzzy(self, name: str) -> Optional[Dict[str, Any]]:
        """Search for card using fuzzy matching"""
        cache_key = f"fuzzy:{name.lower()}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/named"
        params = {'fuzzy': name}
        
        logger.info(f"[Scryfall] search_card_fuzzy: name='{name}' (param fuzzy)")
        result = await self._make_request(endpoint, params)
        logger.info(f"[Scryfall] search_card_fuzzy: response for '{name}': {result['name'] if result else 'None'}")
        self._cache_response(cache_key, result)
        
        return result
    
    async def search_cards(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search for cards with query"""
        cache_key = f"search:{query.lower()}:{limit}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/search"
        params = {
            'q': query,
            'order': 'name',
            'dir': 'asc',
            'page': '1'
        }
        
        result = await self._make_request(endpoint, params)
        
        if result and 'data' in result:
            cards = result['data'][:limit]
            self._cache_response(cache_key, cards)
            return cards
        
        self._cache_response(cache_key, [])
        return []
    
    async def get_card_by_id(self, card_id: str) -> Optional[Dict[str, Any]]:
        """Get card by Scryfall ID"""
        cache_key = f"id:{card_id}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/{card_id}"
        
        result = await self._make_request(endpoint)
        self._cache_response(cache_key, result)
        
        return result
    
    async def autocomplete_card_names(self, partial: str) -> List[str]:
        """Get autocomplete suggestions for card names"""
        cache_key = f"autocomplete:{partial.lower()}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/autocomplete"
        params = {'q': partial}
        
        result = await self._make_request(endpoint, params)
        
        if result and 'data' in result:
            suggestions = result['data']
            self._cache_response(cache_key, suggestions)
            return suggestions
        
        self._cache_response(cache_key, [])
        return []
    
    async def validate_card_names(self, names: List[str]) -> List[Dict[str, Any]]:
        """Validate multiple card names and return found cards"""
        validated_cards = []
        
        for name in names:
            card = await self.search_card_fuzzy(name.strip())
            if card:
                validated_cards.append({
                    'original_name': name,
                    'validated_name': card['name'],
                    'card_data': card,
                    'confidence': self._calculate_name_confidence(name, card['name'])
                })
            else:
                # Try exact search as fallback
                card = await self.search_card_exact(name.strip())
                if card:
                    validated_cards.append({
                        'original_name': name,
                        'validated_name': card['name'],
                        'card_data': card,
                        'confidence': 1.0
                    })
        
        return validated_cards
    
    def _calculate_name_confidence(self, original: str, validated: str) -> float:
        """Calculate confidence score for name matching"""
        # Use fuzzy string matching
        ratio = fuzz.ratio(original.lower(), validated.lower())
        return ratio / 100.0
    
    async def get_random_card(self) -> Optional[Dict[str, Any]]:
        """Get a random card"""
        endpoint = f"/cards/random"
        return await self._make_request(endpoint)
    
    async def check_format_legality(self, cards: List[str], format_name: str) -> Dict[str, Any]:
        """Check if cards are legal in a specific format"""
        legality_info = {
            'format': format_name,
            'legal': True,
            'issues': [],
            'cards_checked': len(cards)
        }
        
        for card_name in cards:
            card = await self.search_card_fuzzy(card_name)
            if card and 'legalities' in card:
                legality = card['legalities'].get(format_name.lower(), 'not_legal')
                if legality not in ['legal', 'restricted']:
                    legality_info['legal'] = False
                    legality_info['issues'].append(f"{card['name']} is {legality} in {format_name}")
        
        return legality_info
    
    async def get_set_information(self, set_code: str) -> Optional[Dict[str, Any]]:
        """Get information about a Magic set"""
        cache_key = f"set:{set_code.lower()}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/sets/{set_code.lower()}"
        
        result = await self._make_request(endpoint)
        self._cache_response(cache_key, result)
        
        return result
    
    async def search_cards_advanced(self, 
                                  colors: List[str] = None,
                                  cmc: int = None,
                                  type_line: str = None,
                                  rarity: str = None,
                                  set_code: str = None,
                                  limit: int = 20) -> List[Dict[str, Any]]:
        """Advanced card search with multiple filters"""
        query_parts = []
        
        if colors:
            color_query = "c:" + "".join(colors)
            query_parts.append(color_query)
        
        if cmc is not None:
            query_parts.append(f"cmc:{cmc}")
        
        if type_line:
            query_parts.append(f"type:{type_line}")
        
        if rarity:
            query_parts.append(f"rarity:{rarity}")
        
        if set_code:
            query_parts.append(f"set:{set_code}")
        
        if not query_parts:
            return []
        
        query = " ".join(query_parts)
        return await self.search_cards(query, limit)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = time.time()
        valid_entries = sum(
            1 for key in self.cache.keys()
            if self._is_cache_valid(key)
        )
        
        return {
            'total_entries': len(self.cache),
            'valid_entries': valid_entries,
            'cache_hit_ratio': valid_entries / max(len(self.cache), 1),
            'cache_size_mb': len(str(self.cache)) / (1024 * 1024),
            'oldest_entry_age': current_time - min(self.cache_timestamps.values()) if self.cache_timestamps else 0
        }
    
    def clear_cache(self):
        """Clear all cached data"""
        self.cache.clear()
        self.cache_timestamps.clear()
        logger.info("Scryfall cache cleared")
    
    def clear_expired_cache(self):
        """Clear only expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.cache_timestamps.items()
            if current_time - timestamp >= self.cache_ttl
        ]
        
        for key in expired_keys:
            self.cache.pop(key, None)
            self.cache_timestamps.pop(key, None)
        
        logger.info(f"Cleared {len(expired_keys)} expired cache entries")
    
    async def bulk_card_lookup(self, identifiers: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """Look up multiple cards in a single request"""
        endpoint = "/cards/collection"
        
        # Scryfall bulk lookup endpoint expects POST data
        if not self.session:
            raise RuntimeError("ScryfallService not initialized")
        
        # Rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.request_delay:
            await asyncio.sleep(self.request_delay - time_since_last)
        
        try:
            self.last_request_time = time.time()
            url = f"{self.base_url}{endpoint}"
            
            async with self.session.post(url, json={'identifiers': identifiers}) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('data', [])
                else:
                    logger.error(f"Bulk lookup error {response.status}: {await response.text()}")
                    return []
        
        except Exception as e:
            logger.error(f"Error in bulk lookup: {e}")
            return []
    
    async def get_card_rulings(self, card_id: str) -> List[Dict[str, Any]]:
        """Get rulings for a specific card"""
        cache_key = f"rulings:{card_id}"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        endpoint = f"/cards/{card_id}/rulings"
        
        result = await self._make_request(endpoint)
        
        if result and 'data' in result:
            rulings = result['data']
            self._cache_response(cache_key, rulings)
            return rulings
        
        self._cache_response(cache_key, [])
        return []
    
    async def enhanced_card_search(self, card_name: str, lang: str = 'en') -> CardMatch:
        """
        Enhanced card search with intelligent correction and confidence scoring
        """
        original_name = card_name.strip()
        
        # Try exact match first
        card = await self.search_card_exact(original_name)
        if card:
            return CardMatch(
                original_name=original_name,
                matched_name=card['name'],
                confidence=1.0,
                card_data=card,
                correction_applied=False
            )
        
        # Apply OCR corrections and try again
        corrected_name = self._apply_ocr_corrections(original_name)
        if corrected_name != original_name:
            card = await self.search_card_fuzzy(corrected_name)
            if card:
                confidence = self._calculate_match_confidence(original_name, card['name'])
                return CardMatch(
                    original_name=original_name,
                    matched_name=card['name'],
                    confidence=confidence,
                    card_data=card,
                    correction_applied=True
                )
        
        # Try fuzzy search with original name
        card = await self.search_card_fuzzy(original_name)
        if card:
            confidence = self._calculate_match_confidence(original_name, card['name'])
            return CardMatch(
                original_name=original_name,
                matched_name=card['name'],
                confidence=confidence,
                card_data=card,
                correction_applied=False
            )
        
        # Get suggestions for failed matches
        suggestions = await self.autocomplete_card_names(original_name[:30])
        # Nouvelle logique : si la suggestion principale est très proche, on valide
        if suggestions:
            best_suggestion = suggestions[0]
            score = fuzz.ratio(original_name.lower(), best_suggestion.lower())
            if score > 90:
                # On tente de récupérer la carte exacte depuis Scryfall
                card = await self.search_card_exact(best_suggestion)
                if card:
                    return CardMatch(
                        original_name=original_name,
                        matched_name=card['name'],
                        confidence=score/100.0,
                        card_data=card,
                        correction_applied=True
                    )
        
        return CardMatch(
            original_name=original_name,
            matched_name=None,
            confidence=0.0,
            card_data=None,
            suggestions=suggestions[:5] if suggestions else [],
        )
    
    def _calculate_match_confidence(self, original: str, matched: str) -> float:
        """Calculate confidence score for card matching"""
        # Use multiple string similarity metrics
        ratio = fuzz.ratio(original.lower(), matched.lower())
        partial_ratio = fuzz.partial_ratio(original.lower(), matched.lower())
        token_sort_ratio = fuzz.token_sort_ratio(original.lower(), matched.lower())
        token_set_ratio = fuzz.token_set_ratio(original.lower(), matched.lower())
        
        # Weighted average
        confidence = (
            ratio * 0.3 +
            partial_ratio * 0.2 +
            token_sort_ratio * 0.25 +
            token_set_ratio * 0.25
        ) / 100.0
        
        # Boost confidence if lengths are similar
        len_diff = abs(len(original) - len(matched))
        if len_diff <= 2:
            confidence += 0.1
        elif len_diff <= 5:
            confidence += 0.05
        
        return min(confidence, 1.0)
    
    async def analyze_deck_format(self, cards: List[Dict[str, Any]], 
                                  total_cards: int = None) -> DeckAnalysis:
        """
        Analyze deck to detect format and provide insights
        """
        if total_cards is None:
            total_cards = sum(card.get('quantity', 1) for card in cards)
        
        # Detect commander
        commander = await self._detect_commander(cards)
        
        # Analyze format based on deck size and composition
        format_detected = await self._detect_format(cards, total_cards, commander)
        
        # Calculate color identity
        color_identity = self._calculate_color_identity(cards)
        
        # Check legality
        legality_issues = await self._check_format_legality(cards, format_detected)
        
        # Estimate tier/power level
        estimated_tier = await self._estimate_deck_tier(cards, format_detected)
        
        # Estimate price
        price_estimate = self._estimate_deck_price(cards)
        
        return DeckAnalysis(
            format_detected=format_detected,
            commander=commander,
            mainboard_count=total_cards - (commander and commander.get('quantity', 0) or 0),
            sideboard_count=0,  # TODO: Detect sideboard
            color_identity=color_identity,
            estimated_tier=estimated_tier,
            legality_issues=legality_issues,
            price_estimate=price_estimate
        )
    
    async def _detect_commander(self, cards: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect potential commander in the deck"""
        for card in cards:
            if not card.get('card_data'):
                continue
                
            card_data = card['card_data']
            type_line = card_data.get('type_line', '').lower()
            
            # Check if it's a legendary creature or planeswalker
            if 'legendary' in type_line and ('creature' in type_line or 'planeswalker' in type_line):
                # Check if it can be a commander
                legalities = card_data.get('legalities', {})
                if legalities.get('commander') == 'legal':
                    return {
                        'name': card_data.get('name'),
                        'quantity': card.get('quantity', 1),
                        'card_data': card_data
                    }
        
        return None
    
    async def _detect_format(self, cards: List[Dict[str, Any]], 
                            total_cards: int, commander: Optional[Dict[str, Any]]) -> str:
        """Detect the most likely format for this deck"""
        
        # Commander detection
        if commander and total_cards == 100:
            return 'commander'
        elif commander and total_cards == 99:  # Commander + 99 other cards
            return 'commander'
        
        # Standard constructed formats
        if 58 <= total_cards <= 62:  # Allow for slight OCR errors
            # Check for format-specific cards or keywords
            for card in cards:
                card_data = card.get('card_data')
                if not card_data:
                    continue
                    
                legalities = card_data.get('legalities', {})
                
                # If any card is not standard legal, it's not standard
                if legalities.get('standard') == 'not_legal':
                    if legalities.get('modern') == 'legal':
                        return 'modern'
                    elif legalities.get('legacy') == 'legal':
                        return 'legacy'
                    elif legalities.get('vintage') in ['legal', 'restricted']:
                        return 'vintage'
                    else:
                        return 'legacy'  # Default for older cards
            
            return 'standard'  # All cards are standard legal
        
        # Other deck sizes
        if total_cards < 40:
            return 'limited'  # Draft/Sealed
        elif total_cards > 100:
            return 'casual'
        
        return 'unknown'
    
    def _calculate_color_identity(self, cards: List[Dict[str, Any]]) -> List[str]:
        """Calculate the color identity of the deck"""
        colors = set()
        
        for card in cards:
            card_data = card.get('card_data')
            if card_data:
                # Add mana cost colors
                card_colors = card_data.get('colors', [])
                colors.update(card_colors)
                
                # Add color identity (for hybrid/commander purposes)
                color_identity = card_data.get('color_identity', [])
                colors.update(color_identity)
        
        return sorted(list(colors))
    
    async def _check_format_legality(self, cards: List[Dict[str, Any]], 
                                    format_name: str) -> List[str]:
        """Check format legality and return issues"""
        issues = []
        
        for card in cards:
            card_data = card.get('card_data')
            if not card_data:
                continue
                
            legalities = card_data.get('legalities', {})
            legality = legalities.get(format_name.lower(), 'not_legal')
            quantity = card.get('quantity', 1)
            
            if legality == 'banned':
                issues.append(f"❌ {card_data['name']} is banned in {format_name}")
            elif legality == 'restricted' and quantity > 1:
                issues.append(f"⚠️ {card_data['name']} is restricted to 1 copy in {format_name}")
            elif legality == 'not_legal':
                issues.append(f"❌ {card_data['name']} is not legal in {format_name}")
            
            # Check quantity limits for non-basic lands
            if format_name != 'commander' and quantity > 4:
                type_line = card_data.get('type_line', '').lower()
                if 'basic' not in type_line:
                    issues.append(f"❌ Too many copies of {card_data['name']} ({quantity}/4)")
        
        return issues
    
    async def _estimate_deck_tier(self, cards: List[Dict[str, Any]], 
                                 format_name: str) -> str:
        """Estimate competitive tier of the deck"""
        # This is a simplified tier estimation
        # In practice, you'd want a more sophisticated algorithm
        
        high_power_keywords = ['force of will', 'mana crypt', 'mox', 'black lotus', 'ancestral recall']
        medium_power_keywords = ['lightning bolt', 'counterspell', 'swords to plowshares']
        
        high_power_count = 0
        medium_power_count = 0
        total_price = 0
        
        for card in cards:
            card_data = card.get('card_data')
            if not card_data:
                continue
                
            card_name = card_data.get('name', '').lower()
            
            # Count power level indicators
            if any(keyword in card_name for keyword in high_power_keywords):
                high_power_count += 1
            elif any(keyword in card_name for keyword in medium_power_keywords):
                medium_power_count += 1
            
            # Add to price estimate
            prices = card_data.get('prices', {})
            if prices.get('usd'):
                try:
                    total_price += float(prices['usd']) * card.get('quantity', 1)
                except (ValueError, TypeError):
                    pass
        
        # Determine tier based on power cards and price
        if high_power_count >= 3 or total_price > 1000:
            return 'Tier 1 (Competitive)'
        elif high_power_count >= 1 or medium_power_count >= 5 or total_price > 300:
            return 'Tier 2 (Focused)'
        elif medium_power_count >= 2 or total_price > 100:
            return 'Tier 3 (Optimized)'
        else:
            return 'Tier 4 (Casual)'
    
    def _estimate_deck_price(self, cards: List[Dict[str, Any]]) -> float:
        """Estimate total deck price in USD"""
        total_price = 0.0
        
        for card in cards:
            card_data = card.get('card_data')
            if not card_data:
                continue
                
            prices = card_data.get('prices', {})
            quantity = card.get('quantity', 1)
            
            if prices.get('usd'):
                try:
                    card_price = float(prices['usd'])
                    total_price += card_price * quantity
                except (ValueError, TypeError):
                    pass
        
        return round(total_price, 2)
    
    async def batch_validate_cards(self, card_names: List[str], 
                                  lang: str = 'en') -> List[CardMatch]:
        """
        Validate multiple cards efficiently with batch processing
        """
        results = []
        
        # Process in smaller batches to respect rate limits
        batch_size = 10
        for i in range(0, len(card_names), batch_size):
            batch = card_names[i:i + batch_size]
            
            # Process batch concurrently
            batch_tasks = [
                self.enhanced_card_search(name, lang) 
                for name in batch
            ]
            
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Error in batch validation: {result}")
                    # Create a failed match
                    results.append(CardMatch(
                        original_name="Unknown",
                        matched_name=None,
                        confidence=0.0,
                        card_data=None,
                        suggestions=[]
                    ))
                else:
                    results.append(result)
            
            # Small delay between batches
            if i + batch_size < len(card_names):
                await asyncio.sleep(0.1)
        
        return results

    async def _real_make_request(self, endpoint, params):
        # ... code existant ...
        return await super()._make_request(endpoint, params)

    def export_monitoring_csv(self, path="scryfall_monitoring.csv"):
        with open(path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["cache_hits", "cache_misses", "avg_time_scryfall"])
            avg_time = sum(self.timings)/len(self.timings) if self.timings else 0
            writer.writerow([self.cache_hits, self.cache_misses, avg_time]) 