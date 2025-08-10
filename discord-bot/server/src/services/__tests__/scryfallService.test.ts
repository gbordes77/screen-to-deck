import axios from 'axios';
import { scryfallService } from '../scryfallService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScryfallService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache between tests
    scryfallService['cache'].clear();
  });

  describe('searchCard', () => {
    it('should find exact match for card name', async () => {
      const mockResponse = {
        data: {
          object: 'list',
          data: [
            {
              name: 'Lightning Bolt',
              mana_cost: '{R}',
              type_line: 'Instant',
              oracle_text: 'Lightning Bolt deals 3 damage to any target.',
              colors: ['R'],
              set: 'lea',
              collector_number: '161'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await scryfallService.searchCard('Lightning Bolt');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Lightning Bolt');
      expect(result?.mana_cost).toBe('{R}');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('search?q='),
        expect.any(Object)
      );
    });

    it('should handle fuzzy search for misspelled cards', async () => {
      const mockResponse = {
        data: {
          object: 'list',
          data: [
            {
              name: 'Counterspell',
              mana_cost: '{U}{U}',
              type_line: 'Instant'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await scryfallService.searchCard('Counterspl');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Counterspell');
    });

    it('should return null for non-existent cards', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { details: 'No cards found' } }
      });

      const result = await scryfallService.searchCard('Fake Card Name');

      expect(result).toBeNull();
    });

    it('should use cache for repeated searches', async () => {
      const mockResponse = {
        data: {
          object: 'list',
          data: [{ name: 'Island', type_line: 'Basic Land — Island' }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // First call
      const result1 = await scryfallService.searchCard('Island');
      // Second call should use cache
      const result2 = await scryfallService.searchCard('Island');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle rate limiting with retry', async () => {
      // First call: rate limited
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 429, headers: { 'retry-after': '1' } }
      });

      // Second call: success
      const mockResponse = {
        data: {
          object: 'list',
          data: [{ name: 'Sol Ring', mana_cost: '{1}' }]
        }
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await scryfallService.searchCard('Sol Ring');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sol Ring');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await scryfallService.searchCard('Test Card');

      expect(result).toBeNull();
    });
  });

  describe('validateCards', () => {
    it('should validate a list of cards', async () => {
      const cards = [
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 2 },
        { name: 'Invalid Card', quantity: 1 }
      ];

      // Mock responses
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            object: 'list',
            data: [{ name: 'Lightning Bolt', mana_cost: '{R}' }]
          }
        })
        .mockResolvedValueOnce({
          data: {
            object: 'list',
            data: [{ name: 'Counterspell', mana_cost: '{U}{U}' }]
          }
        })
        .mockRejectedValueOnce({
          response: { status: 404 }
        });

      const validated = await scryfallService.validateCards(cards);

      expect(validated).toHaveLength(3);
      expect(validated[0].valid).toBe(true);
      expect(validated[0].correctedName).toBe('Lightning Bolt');
      expect(validated[1].valid).toBe(true);
      expect(validated[2].valid).toBe(false);
    });

    it('should correct common misspellings', async () => {
      const cards = [
        { name: 'Lightnign Bolt', quantity: 4 },
        { name: 'Counterspl', quantity: 2 }
      ];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            object: 'list',
            data: [{ name: 'Lightning Bolt' }]
          }
        })
        .mockResolvedValueOnce({
          data: {
            object: 'list',
            data: [{ name: 'Counterspell' }]
          }
        });

      const validated = await scryfallService.validateCards(cards);

      expect(validated[0].correctedName).toBe('Lightning Bolt');
      expect(validated[1].correctedName).toBe('Counterspell');
    });
  });

  describe('bulkValidate', () => {
    it('should validate cards in bulk efficiently', async () => {
      const cards = Array(100).fill(null).map((_, i) => ({
        name: `Card ${i}`,
        quantity: 1
      }));

      // Mock bulk data endpoint
      const mockBulkResponse = {
        data: cards.map((c, i) => ({
          name: c.name,
          id: `id-${i}`,
          type_line: 'Creature'
        }))
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBulkResponse });

      const validated = await scryfallService.bulkValidate(cards);

      expect(validated).toHaveLength(100);
      // Should make fewer API calls than individual validation
      expect(mockedAxios.get.mock.calls.length).toBeLessThan(100);
    });
  });

  describe('autocomplete', () => {
    it('should provide autocomplete suggestions', async () => {
      const mockResponse = {
        data: {
          object: 'catalog',
          data: [
            'Lightning Bolt',
            'Lightning Strike',
            'Lightning Helix'
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const suggestions = await scryfallService.autocomplete('Light');

      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('Lightning Bolt');
      expect(suggestions).toContain('Lightning Strike');
    });

    it('should handle empty query', async () => {
      const suggestions = await scryfallService.autocomplete('');

      expect(suggestions).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should cache autocomplete results', async () => {
      const mockResponse = {
        data: {
          object: 'catalog',
          data: ['Negate', 'Negate the Force']
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const suggestions1 = await scryfallService.autocomplete('Neg');
      const suggestions2 = await scryfallService.autocomplete('Neg');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(suggestions1).toEqual(suggestions2);
    });
  });

  describe('getCardDetails', () => {
    it('should fetch detailed card information', async () => {
      const mockResponse = {
        data: {
          name: 'Black Lotus',
          mana_cost: '{0}',
          type_line: 'Artifact',
          oracle_text: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
          rarity: 'rare',
          prices: {
            usd: '10000.00',
            eur: '8500.00'
          },
          image_uris: {
            normal: 'https://example.com/black-lotus.jpg',
            small: 'https://example.com/black-lotus-small.jpg'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const details = await scryfallService.getCardDetails('Black Lotus');

      expect(details).toBeDefined();
      expect(details?.name).toBe('Black Lotus');
      expect(details?.prices?.usd).toBe('10000.00');
      expect(details?.image_uris).toBeDefined();
    });

    it('should handle cards with multiple printings', async () => {
      const mockResponse = {
        data: {
          object: 'list',
          data: [
            {
              name: 'Lightning Bolt',
              set: 'lea',
              prices: { usd: '100.00' }
            },
            {
              name: 'Lightning Bolt',
              set: 'm10',
              prices: { usd: '2.00' }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const details = await scryfallService.getCardDetails('Lightning Bolt');

      expect(details).toBeDefined();
      // Should return the first (usually most recent) printing
      expect(details?.set).toBeDefined();
    });
  });

  describe('validateDeckList', () => {
    it('should validate a complete 60+15 deck', async () => {
      const mainboard = Array(60).fill(null).map((_, i) => ({
        name: i < 20 ? 'Island' : i < 40 ? 'Lightning Bolt' : 'Counterspell',
        quantity: 1
      }));

      const sideboard = Array(15).fill(null).map(() => ({
        name: 'Negate',
        quantity: 1
      }));

      // Mock successful validations
      mockedAxios.get.mockResolvedValue({
        data: {
          object: 'list',
          data: [{ name: 'Mock Card' }]
        }
      });

      const result = await scryfallService.validateDeckList(mainboard, sideboard);

      expect(result.valid).toBe(true);
      expect(result.mainboardCount).toBe(60);
      expect(result.sideboardCount).toBe(15);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid deck counts', async () => {
      const mainboard = Array(50).fill(null).map(() => ({
        name: 'Island',
        quantity: 1
      }));

      const sideboard = Array(10).fill(null).map(() => ({
        name: 'Negate',
        quantity: 1
      }));

      const result = await scryfallService.validateDeckList(mainboard, sideboard);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mainboard must have exactly 60 cards');
      expect(result.errors).toContain('Sideboard must have exactly 15 cards');
    });

    it('should detect invalid cards in deck', async () => {
      const mainboard = [
        { name: 'Valid Card', quantity: 56 },
        { name: 'Invalid Card', quantity: 4 }
      ];

      const sideboard = [
        { name: 'Another Invalid', quantity: 15 }
      ];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { object: 'list', data: [{ name: 'Valid Card' }] }
        })
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockRejectedValueOnce({ response: { status: 404 } });

      const result = await scryfallService.validateDeckList(mainboard, sideboard);

      expect(result.valid).toBe(false);
      expect(result.invalidCards).toContain('Invalid Card');
      expect(result.invalidCards).toContain('Another Invalid');
    });

    it('should check format legality', async () => {
      const mainboard = [
        { name: 'Black Lotus', quantity: 1 }, // Banned in most formats
        { name: 'Island', quantity: 59 }
      ];

      const mockResponse = {
        data: {
          object: 'list',
          data: [{
            name: 'Black Lotus',
            legalities: {
              standard: 'not_legal',
              modern: 'not_legal',
              legacy: 'banned',
              vintage: 'restricted'
            }
          }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await scryfallService.validateDeckList(mainboard, [], 'modern');

      expect(result.formatLegal).toBe(false);
      expect(result.bannedCards).toContain('Black Lotus');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits between requests', async () => {
      const startTime = Date.now();

      // Make multiple rapid requests
      const promises = Array(5).fill(null).map(() => 
        scryfallService.searchCard('Test Card')
      );

      mockedAxios.get.mockResolvedValue({
        data: { object: 'list', data: [{ name: 'Test Card' }] }
      });

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should have some delay due to rate limiting
      expect(duration).toBeGreaterThanOrEqual(50); // At least 50ms between requests
    });

    it('should handle burst requests with queuing', async () => {
      const cards = Array(20).fill(null).map((_, i) => `Card ${i}`);

      mockedAxios.get.mockResolvedValue({
        data: { object: 'list', data: [{ name: 'Card' }] }
      });

      const results = await Promise.all(
        cards.map(card => scryfallService.searchCard(card))
      );

      expect(results).toHaveLength(20);
      expect(results.every(r => r !== null)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should expire cache entries after TTL', async () => {
      jest.useFakeTimers();

      const mockResponse = {
        data: { object: 'list', data: [{ name: 'Test Card' }] }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // First call
      await scryfallService.searchCard('Test Card');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Advance time past cache TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Second call should hit API again
      await scryfallService.searchCard('Test Card');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should have configurable cache size limit', async () => {
      // Fill cache with many entries
      const cards = Array(1000).fill(null).map((_, i) => `Card ${i}`);

      for (const card of cards) {
        scryfallService['cache'].set(card, { 
          data: { name: card }, 
          timestamp: Date.now() 
        });
      }

      // Cache should have a reasonable size limit
      expect(scryfallService['cache'].size).toBeLessThanOrEqual(500);
    });
  });
});