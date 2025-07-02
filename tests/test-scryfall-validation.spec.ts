import { EnhancedOCRService } from "../server/src/services/enhanced-ocr.service";

describe("Scryfall Validation Pipeline", () => {
  let ocrService: EnhancedOCRService;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
    ocrService = new EnhancedOCRService();
  });

  afterAll(async () => {
    await ocrService.destroy();
  });

  describe("OCR Corrections", () => {
    test("should correct common OCR errors", () => {
      const testCases = [
        { input: "Lighming Bolt", expected: "Lightning Bolt" },
        { input: "Snapcasler Mage", expected: "Snapcaster Mage" },
        { input: "Force oi Will", expected: "Force of Will" },
        { input: "Mana Crypl", expected: "Mana Crypt" },
        { input: "Sol Rmg", expected: "Sol Ring" },
        { input: "Brainsform", expected: "Brainstorm" },
        { input: "Counlerspell", expected: "Counterspell" },
        { input: "Jace lhe Mind Sculptor", expected: "Jace the Mind Sculptor" },
      ];

      for (const testCase of testCases) {
        const corrected = ocrService["applyOCRCorrections"](testCase.input);
        expect(corrected).toBe(testCase.expected);
      }
    });

    test("should handle character replacements", () => {
      const testCases = [
        { input: "L|ghtning B0lt", expected: "Lightning Bolt" },
        { input: "5napca5ter Mage", expected: "Snapcaster Mage" },
        { input: "Br4ln5t0rm", expected: "Brainstorm" },
      ];

      for (const testCase of testCases) {
        const corrected = ocrService["applyOCRCorrections"](testCase.input);
        expect(corrected).toBe(testCase.expected);
      }
    });

    test("should preserve proper case formatting", () => {
      const testCases = [
        { input: "jace the mind sculptor", expected: "Jace the Mind Sculptor" },
        { input: "force of will", expected: "Force of Will" },
        { input: "birds of paradise", expected: "Birds of Paradise" },
        { input: "path to exile", expected: "Path to Exile" },
      ];

      for (const testCase of testCases) {
        const corrected = ocrService["applyOCRCorrections"](testCase.input);
        expect(corrected).toBe(testCase.expected);
      }
    });
  });

  describe("Name Similarity Calculation", () => {
    test("should calculate accurate similarity scores", () => {
      const testCases = [
        { name1: "Lightning Bolt", name2: "Lightning Bolt", expected: 1.0 },
        { name1: "Lightning Bolt", name2: "Lighming Bolt", expectedMin: 0.8 },
        {
          name1: "Snapcaster Mage",
          name2: "Snapcasler Mage",
          expectedMin: 0.8,
        },
        { name1: "Force of Will", name2: "Force oi Will", expectedMin: 0.85 },
        { name1: "Lightning Bolt", name2: "Counterspell", expectedMax: 0.3 },
      ];

      for (const testCase of testCases) {
        const similarity = ocrService["calculateNameSimilarity"](
          testCase.name1,
          testCase.name2
        );

        if ("expected" in testCase) {
          expect(similarity).toBeCloseTo(testCase.expected, 1);
        } else if ("expectedMin" in testCase) {
          expect(similarity).toBeGreaterThanOrEqual(testCase.expectedMin);
        } else if ("expectedMax" in testCase) {
          expect(similarity).toBeLessThanOrEqual(testCase.expectedMax);
        }
      }
    });
  });

  describe("Integration with Scryfall API", () => {
    test("should validate exact matches with bonus confidence", async () => {
      const mockScryfallService = {
        findCard: jest.fn().mockResolvedValue({
          name: "Lightning Bolt",
          mana_cost: "{R}",
          type_line: "Instant",
          set: "LEA",
        }),
        fuzzySearch: jest.fn(),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Lightning Bolt",
        confidence: 0.8,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](inputResult);

      expect(validated.validated).toBe(true);
      expect(validated.confidence).toBeGreaterThan(0.8);
      expect(validated.name).toBe("Lightning Bolt");
      expect(validated.manaCost).toBe("{R}");
      expect(mockScryfallService.findCard).toHaveBeenCalledWith(
        "Lightning Bolt"
      );
    });

    test("should handle fuzzy matches with confidence adjustment", async () => {
      const mockScryfallService = {
        findCard: jest.fn().mockResolvedValue(null), // No exact match
        fuzzySearch: jest.fn().mockResolvedValue([
          {
            name: "Lightning Bolt",
            mana_cost: "{R}",
            type_line: "Instant",
            set: "LEA",
          },
          {
            name: "Lightning Strike",
            mana_cost: "{1}{R}",
            type_line: "Instant",
            set: "M19",
          },
        ]),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Lighming Bolt", // OCR error
        confidence: 0.8,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](inputResult);

      expect(validated.validated).toBe(true);
      expect(validated.name).toBe("Lightning Bolt");
      expect(validated.alternatives).toContain("Lightning Strike");
      expect(validated.confidence).toBeLessThan(0.8); // Penalty for fuzzy match
      expect(validated.confidence).toBeGreaterThan(0.5); // But not too low
    });

    test("should provide suggestions when no good match found", async () => {
      const mockScryfallService = {
        findCard: jest.fn().mockResolvedValue(null),
        fuzzySearch: jest
          .fn()
          .mockResolvedValue([
            { name: "Some Random Card" },
            { name: "Another Card" },
            { name: "Third Option" },
          ]),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Completely Wrong Name",
        confidence: 0.8,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](inputResult);

      expect(validated.validated).toBe(false);
      expect(validated.confidence).toBeLessThan(0.4); // Heavy penalty
      expect(validated.alternatives).toHaveLength(3);
      expect(validated.alternatives).toContain("Some Random Card");
    });

    test("should try original name if correction fails", async () => {
      const mockScryfallService = {
        findCard: jest
          .fn()
          .mockResolvedValueOnce(null) // Corrected name fails
          .mockResolvedValueOnce({
            // Original name succeeds
            name: "Jace, the Mind Sculptor",
            mana_cost: "{2}{U}{U}",
            type_line: "Legendary Planeswalker — Jace",
          }),
        fuzzySearch: jest.fn().mockResolvedValue([]),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Jace, the Mind Sculptor", // Already correct but correction might change it
        confidence: 0.85,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](inputResult);

      expect(validated.validated).toBe(true);
      expect(validated.name).toBe("Jace, the Mind Sculptor");
      expect(mockScryfallService.findCard).toHaveBeenCalledTimes(2);
    });
  });

  describe("Performance Validation", () => {
    test("should maintain acceptable performance with Scryfall calls", async () => {
      const mockScryfallService = {
        findCard: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    name: "Test Card",
                    mana_cost: "{1}",
                    type_line: "Creature",
                  }),
                100
              )
            ) // Simulate 100ms API call
        ),
        fuzzySearch: jest.fn(),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Test Card",
        confidence: 0.8,
        validated: false,
      };

      const startTime = Date.now();
      await ocrService["validateWithScryfall"](inputResult);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test("should handle API errors gracefully", async () => {
      const mockScryfallService = {
        findCard: jest.fn().mockRejectedValue(new Error("API Error")),
        fuzzySearch: jest.fn().mockRejectedValue(new Error("API Error")),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const inputResult = {
        name: "Test Card",
        confidence: 0.8,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](inputResult);

      expect(validated.validated).toBe(false);
      expect(validated.confidence).toBeLessThan(0.8); // Confidence reduced due to error
      expect(validated.name).toBe("Test Card"); // Original name preserved
    });
  });

  describe("Real-world OCR Scenarios", () => {
    test("should handle complete OCR pipeline with Scryfall validation", async () => {
      // Mock a complete OCR result that needs validation
      const mockOCRResult = {
        name: "Snapcasler Mage", // OCR error
        confidence: 0.85,
        validated: false,
      };

      const mockScryfallService = {
        findCard: jest
          .fn()
          .mockResolvedValueOnce(null) // 'Snapcaster Mage' corrected version fails
          .mockResolvedValueOnce({
            // Direct lookup succeeds
            name: "Snapcaster Mage",
            mana_cost: "{1}{U}",
            type_line: "Creature — Human Wizard",
            set: "ISD",
          }),
        fuzzySearch: jest.fn(),
      };

      ocrService["scryfallService"] = mockScryfallService as any;

      const result = await ocrService["validateWithScryfall"](mockOCRResult);

      expect(result.validated).toBe(true);
      expect(result.name).toBe("Snapcaster Mage");
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.manaCost).toBe("{1}{U}");
      expect(result.type).toBe("Creature — Human Wizard");
    });

    test("should track validation metrics properly", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const mockResult = {
        name: "Lightning Bolt",
        confidence: 0.9,
        validated: true,
      };

      const mockMetrics = {
        processingTime: 1500,
        modelUsed: ["OpenAI-Vision"],
        confidence: 0.9,
        fallbackUsed: false,
      };

      await ocrService.logRecognitionMetrics(mockMetrics, mockResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("OCR_METRICS:")
      );

      const logCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes("OCR_METRICS:")
      );

      if (logCall) {
        const metricsData = JSON.parse(logCall[0].split("OCR_METRICS:")[1]);
        expect(metricsData.validated).toBe(true);
        expect(metricsData.confidence).toBe(0.9);
        expect(metricsData.processingTime).toBe(1500);
      }

      consoleSpy.mockRestore();
    });
  });
});
