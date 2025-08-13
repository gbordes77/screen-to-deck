import { OptimizedScryfallService } from '../scryfallOptimized';
import { FuzzyMatchingService } from '../fuzzyMatchingService';
import { CacheService } from '../cacheService';
import { MTGCard } from '../../types';

describe('OptimizedScryfallService', () => {
  let service: OptimizedScryfallService;
  let mockCache: jest.Mocked<CacheService>;
  let mockFuzzyMatcher: jest.Mocked<FuzzyMatchingService>;

  beforeEach(() => {
    // Create mocks
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      batchGet: jest.fn(),
      batchSet: jest.fn(),
      warmUp: jest.fn(),
      getMetrics: jest.fn().mockResolvedValue({
        hits: 100,
        misses: 20,
        hitRate: 0.833,
        totalEntries: 500,
        memoryUsage: 1024000,
        avgAccessTime: 2.5,
        popularKeys: [],
      }),
      clear: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      invalidate: jest.fn(),
      exportMetrics: jest.fn(),
    } as any;

    mockFuzzyMatcher = {
      findBestMatch: jest.fn(),
      cleanAndCorrect: jest.fn((input) => input),
      findPartialMatch: jest.fn(),
      batchFuzzyMatch: jest.fn(),
      clearCaches: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ phonetic: 10, trigram: 20 }),
    } as any;

    service = new OptimizedScryfallService();
    service['cache'] = mockCache;
    service['fuzzyMatcher'] = mockFuzzyMatcher;
  });

  describe('Cache Integration', () => {
    test('should check cache before making API calls', async () => {
      const testCard: MTGCard = {
        name: 'Lightning Bolt',
        quantity: 4,
      };

      const cachedData = {
        name: 'Lightning Bolt',
        mana_cost: '{R}',
        type_line: 'Instant',
        set: 'LEA',
        id: 'test-id',
      };

      mockCache.get.mockResolvedValueOnce(cachedData);

      const result = await service['checkCache']('Lightning Bolt');

      expect(mockCache.get).toHaveBeenCalledWith('card:exact', ['Lightning Bolt']);
      expect(result).toEqual(cachedData);
    });

    test('should cache API responses', async () => {
      const cardData = {
        name: 'Force of Will',
        mana_cost: '{3}{U}{U}',
        type_line: 'Instant',
        id: 'test-id',
      };

      // Mock API response
      service['api'].post = jest.fn().mockResolvedValue({
        data: { data: [cardData] },
      });

      mockCache.get.mockResolvedValue(null); // Cache miss

      const cards: MTGCard[] = [{ name: 'Force of Will', quantity: 2 }];
      const results = await service['batchApiLookup'](cards);

      expect(mockCache.set).toHaveBeenCalledWith(
        'card:exact',
        ['Force of Will'],
        expect.objectContaining({ name: 'Force of Will' })
      );
    });

    test('should report accurate cache metrics', async () => {
      const cards: MTGCard[] = [
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 4 },
      ];

      mockCache.get.mockResolvedValueOnce({
        name: 'Lightning Bolt',
        id: 'cached-1',
      }); // Cache hit
      mockCache.get.mockResolvedValueOnce(null); // Cache miss

      service['api'].post = jest.fn().mockResolvedValue({
        data: { data: [{ name: 'Counterspell', id: 'api-1' }] },
      });

      const result = await service.validateAndEnrichCards(cards);

      expect(result.metrics.cacheHitRate).toBeGreaterThan(0);
      expect(result.metrics.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Fuzzy Matching', () => {
    test('should use fuzzy matching for misspelled cards', async () => {
      const misspelledCard: MTGCard = {
        name: 'Lighming Bolt',
        quantity: 4,
      };

      mockFuzzyMatcher.findBestMatch.mockResolvedValue([
        {
          name: 'Lightning Bolt',
          score: 0.92,
          method: 'levenshtein',
        },
      ]);

      service['popularCards'].set('lightning bolt', {
        name: 'Lightning Bolt',
        mana_cost: '{R}',
        type_line: 'Instant',
        id: 'test-id',
      } as any);
      service['popularCardsList'] = ['Lightning Bolt'];

      const result = await service['fuzzyMatchPopular']('Lighming Bolt');

      expect(mockFuzzyMatcher.findBestMatch).toHaveBeenCalledWith(
        'Lighming Bolt',
        ['Lightning Bolt'],
        expect.objectContaining({
          threshold: 0.7,
          usePhonetic: true,
          useLevenshtein: true,
        })
      );
      expect(result).toMatchObject({
        name: 'Lightning Bolt',
        score: 0.92,
      });
    });

    test('should handle phonetic matching', async () => {
      mockFuzzyMatcher.findBestMatch.mockResolvedValue([
        {
          name: 'Teferi, Hero of Dominaria',
          score: 0.88,
          method: 'phonetic',
        },
      ]);

      const result = await service['fuzzyMatchPopular']('Teffery Hero of Domineria');

      expect(mockFuzzyMatcher.findBestMatch).toHaveBeenCalled();
      expect(result?.method).toContain('phonetic');
    });

    test('should batch fuzzy match multiple cards efficiently', async () => {
      const cards: MTGCard[] = [
        { name: 'Lighming Bolt', quantity: 4 },
        { name: 'Snapcasler Mage', quantity: 2 },
        { name: 'Force oi Will', quantity: 1 },
      ];

      mockCache.get.mockResolvedValue(null); // All cache misses

      mockFuzzyMatcher.findBestMatch
        .mockResolvedValueOnce([{ name: 'Lightning Bolt', score: 0.92, method: 'lev' }])
        .mockResolvedValueOnce([{ name: 'Snapcaster Mage', score: 0.90, method: 'lev' }])
        .mockResolvedValueOnce([{ name: 'Force of Will', score: 0.88, method: 'phon' }]);

      // Set up popular cards
      service['popularCards'].set('lightning bolt', { name: 'Lightning Bolt', id: '1' } as any);
      service['popularCards'].set('snapcaster mage', { name: 'Snapcaster Mage', id: '2' } as any);
      service['popularCards'].set('force of will', { name: 'Force of Will', id: '3' } as any);
      service['popularCardsList'] = ['Lightning Bolt', 'Snapcaster Mage', 'Force of Will'];

      const results = await service['batchValidateCards'](cards);

      expect(results).toHaveLength(3);
      expect(results[0].confidence).toBeGreaterThan(0.85);
      expect(results[0].method).toContain('fuzzy-popular');
    });
  });

  describe('Batch Processing', () => {
    test('should split large batches correctly', () => {
      const cards: MTGCard[] = Array.from({ length: 200 }, (_, i) => ({
        name: `Card ${i}`,
        quantity: 1,
      }));

      const chunks = service['chunk'](cards, 75);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(75);
      expect(chunks[1]).toHaveLength(75);
      expect(chunks[2]).toHaveLength(50);
    });

    test('should handle batch API failures gracefully', async () => {
      const cards: MTGCard[] = [
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 4 },
      ];

      mockCache.get.mockResolvedValue(null);
      service['api'].post = jest.fn().mockRejectedValue(new Error('API Error'));

      const results = await service['batchApiLookup'](cards);

      expect(results).toHaveLength(2);
      expect(results[0].method).toBe('error');
      expect(results[0].confidence).toBe(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should respect rate limiting', async () => {
      const startTime = Date.now();
      
      await service['respectRateLimit']();
      await service['respectRateLimit']();
      
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeGreaterThanOrEqual(50); // Should wait at least 50ms
    });

    test('should calculate accurate metrics', () => {
      service['metrics'] = {
        totalRequests: 100,
        cacheHits: 80,
        apiCalls: 20,
        fuzzyMatches: 10,
        responseTimes: [10, 20, 15, 25, 30],
      };

      const metrics = service.getMetrics();

      expect(metrics.cacheHitRate).toBe(0.8);
      expect(metrics.avgResponseTime).toBe(20);
      expect(metrics.fuzzyMatchSuccess).toBe(0.1);
      expect(metrics.batchEfficiency).toBe(0.8);
    });

    test('should export metrics to file', async () => {
      const mockWriteFile = jest.fn();
      jest.mock('fs/promises', () => ({
        writeFile: mockWriteFile,
      }));

      service['metrics'] = {
        totalRequests: 100,
        cacheHits: 80,
        apiCalls: 20,
        fuzzyMatches: 10,
        responseTimes: [10, 20, 15],
      };

      await service.exportMetrics('/tmp/test-metrics.json');

      expect(mockCache.getMetrics).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle rate limit errors', async () => {
      service['api'].get = jest.fn().mockRejectedValue({
        response: { status: 429 },
        isAxiosError: true,
      });

      await expect(service['fuzzySearchApi']('Test Card')).rejects.toThrow('Rate limit');
    });

    test('should fallback to memory cache on Redis failure', async () => {
      mockCache.get.mockRejectedValueOnce(new Error('Redis connection failed'));
      
      // Should still work with memory cache
      const result = await service['checkCache']('Lightning Bolt');
      
      expect(result).toBeNull();
    });
  });

  describe('Card Enrichment', () => {
    test('should properly enrich cards with Scryfall data', () => {
      const original: MTGCard = {
        name: 'Lightning Bolt',
        quantity: 4,
      };

      const scryfallData = {
        name: 'Lightning Bolt',
        mana_cost: '{R}',
        type_line: 'Instant',
        oracle_text: 'Lightning Bolt deals 3 damage to any target.',
        colors: ['R'],
        color_identity: ['R'],
        set: 'LEA',
        collector_number: '123',
        rarity: 'common',
        cmc: 1,
        legalities: { modern: 'legal', standard: 'not_legal' },
        id: 'scryfall-id',
        image_uris: { normal: 'https://example.com/image.jpg' },
      };

      const enriched = service['enrichCard'](original, scryfallData as any);

      expect(enriched).toMatchObject({
        name: 'Lightning Bolt',
        quantity: 4,
        mana_cost: '{R}',
        type_line: 'Instant',
        validated: true,
        scryfall_id: 'scryfall-id',
      });
    });
  });

  describe('Similarity Calculation', () => {
    test('should calculate accurate trigram similarity', () => {
      const tests = [
        { a: 'Lightning Bolt', b: 'Lightning Bolt', expected: 1.0 },
        { a: 'Lightning Bolt', b: 'Lighming Bolt', minExpected: 0.7 },
        { a: 'Force of Will', b: 'Force oi Will', minExpected: 0.8 },
        { a: 'Lightning Bolt', b: 'Counterspell', maxExpected: 0.3 },
      ];

      for (const test of tests) {
        const similarity = service['calculateSimilarity'](test.a, test.b);
        
        if ('expected' in test) {
          expect(similarity).toBeCloseTo(test.expected, 1);
        } else if ('minExpected' in test) {
          expect(similarity).toBeGreaterThanOrEqual(test.minExpected);
        } else if ('maxExpected' in test) {
          expect(similarity).toBeLessThanOrEqual(test.maxExpected);
        }
      }
    });

    test('should normalize card names consistently', () => {
      const tests = [
        { input: 'Lightning Bolt', expected: 'lightning bolt' },
        { input: "Teferi's Protection", expected: 'teferis protection' },
        { input: 'Jace,  the   Mind Sculptor', expected: 'jace the mind sculptor' },
        { input: 'Niv-Mizzet—Parun', expected: 'niv-mizzet—parun' },
      ];

      for (const test of tests) {
        const normalized = service['normalizeKey'](test.input);
        expect(normalized).toBe(test.expected);
      }
    });
  });
});