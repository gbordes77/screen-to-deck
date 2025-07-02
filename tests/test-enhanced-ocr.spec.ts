import * as fs from "fs";
import * as path from "path";
import { EnhancedOCRService } from "../server/src/services/enhanced-ocr.service";

describe("Enhanced OCR Service", () => {
  let ocrService: EnhancedOCRService;

  beforeAll(async () => {
    // Setup test environment
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
    ocrService = new EnhancedOCRService();
  });

  afterAll(async () => {
    await ocrService.destroy();
  });

  describe("Image Preprocessing", () => {
    test("should preprocess image correctly", async () => {
      const testImageBuffer = fs.readFileSync(
        path.join(__dirname, "fixtures", "test-card.jpg")
      );

      const result = await ocrService.recognizeCard(testImageBuffer);

      expect(result.metrics.processingTime).toBeLessThan(5000); // 5s max
      expect(result.result.confidence).toBeGreaterThan(0.5);
      expect(result.result.name).toBeDefined();
    });

    test("should handle invalid images gracefully", async () => {
      const invalidBuffer = Buffer.from("invalid image data");

      await expect(ocrService.recognizeCard(invalidBuffer)).rejects.toThrow(
        "Image preprocessing failed"
      );
    });
  });

  describe("Multi-Pipeline Recognition", () => {
    test("should use multiple models when available", async () => {
      const testImageBuffer = createMockCardImage();

      const result = await ocrService.recognizeCard(testImageBuffer);

      expect(result.metrics.modelUsed).toContain("OpenAI-Vision");
      expect(result.metrics.processingTime).toBeLessThan(10000);
    });

    test("should fallback to Tesseract when OpenAI fails", async () => {
      // Mock OpenAI failure
      const originalOpenAI = ocrService["openai"];
      ocrService["openai"] = {
        chat: {
          completions: {
            create: () => Promise.reject(new Error("API Error")),
          },
        },
      } as any;

      const testImageBuffer = createMockCardImage();
      const result = await ocrService.recognizeCard(testImageBuffer);

      expect(result.metrics.fallbackUsed).toBe(true);
      expect(result.metrics.modelUsed).toContain("Tesseract");

      // Restore
      ocrService["openai"] = originalOpenAI;
    });
  });

  describe("Scryfall Validation", () => {
    test("should validate exact card matches", async () => {
      const mockResult = {
        name: "Lightning Bolt",
        confidence: 0.9,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](mockResult);

      expect(validated.validated).toBe(true);
      expect(validated.confidence).toBeGreaterThan(0.9);
      expect(validated.name).toBe("Lightning Bolt");
    });

    test("should provide alternatives for fuzzy matches", async () => {
      const mockResult = {
        name: "Lightening Bolt", // Typo
        confidence: 0.8,
        validated: false,
      };

      const validated = await ocrService["validateWithScryfall"](mockResult);

      expect(validated.alternatives).toBeDefined();
      expect(validated.alternatives?.length).toBeGreaterThan(0);
      expect(validated.confidence).toBeLessThan(0.8); // Penalty applied
    });
  });

  describe("Performance Requirements", () => {
    test("should meet latency requirements", async () => {
      const testImageBuffer = createMockCardImage();
      const startTime = Date.now();

      const result = await ocrService.recognizeCard(testImageBuffer);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // 5s max for SaaS
      expect(result.metrics.processingTime).toBeLessThan(totalTime);
    });

    test("should achieve target accuracy on known cards", async () => {
      const knownCards = [
        "Lightning Bolt",
        "Counterspell",
        "Black Lotus",
        "Jace, the Mind Sculptor",
      ];

      let successCount = 0;
      const totalTests = knownCards.length;

      for (const cardName of knownCards) {
        const mockImage = createMockCardImageWithText(cardName);
        const result = await ocrService.recognizeCard(mockImage);

        if (result.result.confidence > 0.9 && result.result.validated) {
          successCount++;
        }
      }

      const accuracy = successCount / totalTests;
      expect(accuracy).toBeGreaterThan(0.95); // 95% target for known cards
    });
  });

  describe("Error Handling", () => {
    test("should handle network failures gracefully", async () => {
      // Simulate network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const testImageBuffer = createMockCardImage();

      await expect(ocrService.recognizeCard(testImageBuffer)).rejects.toThrow(
        "OCR processing failed"
      );

      global.fetch = originalFetch;
    });

    test("should handle rate limiting", async () => {
      // Mock rate limit response
      const mockRateLimit = jest.fn().mockRejectedValue({
        status: 429,
        message: "Rate limit exceeded",
      });

      // Test should handle gracefully and retry or fallback
      const testImageBuffer = createMockCardImage();
      const result = await ocrService.recognizeCard(testImageBuffer);

      expect(result.metrics.fallbackUsed).toBeDefined();
    });
  });

  describe("Metrics and Monitoring", () => {
    test("should log comprehensive metrics", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const testImageBuffer = createMockCardImage();
      const result = await ocrService.recognizeCard(testImageBuffer);

      await ocrService.logRecognitionMetrics(result.metrics, result.result);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("OCR_METRICS:")
      );

      const logCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes("OCR_METRICS:")
      );

      if (logCall) {
        const metricsData = JSON.parse(logCall[0].split("OCR_METRICS:")[1]);
        expect(metricsData.timestamp).toBeDefined();
        expect(metricsData.processingTime).toBeGreaterThan(0);
        expect(metricsData.confidence).toBeDefined();
        expect(metricsData.validated).toBeDefined();
      }

      consoleSpy.mockRestore();
    });
  });
});

// Helper functions
function createMockCardImage(): Buffer {
  // Create a simple test image buffer
  // In real tests, this would be actual card images
  return Buffer.from("mock-image-data-for-testing");
}

function createMockCardImageWithText(cardName: string): Buffer {
  // Create mock image with specific card name
  // This would simulate an image containing the specified card
  return Buffer.from(`mock-image-with-${cardName.replace(/\s+/g, "-")}`);
}

// Performance benchmarks
describe("OCR Performance Benchmarks", () => {
  let ocrService: EnhancedOCRService;

  beforeAll(async () => {
    ocrService = new EnhancedOCRService();
  });

  afterAll(async () => {
    await ocrService.destroy();
  });

  test("Benchmark: 100 cards processing", async () => {
    const startTime = Date.now();
    const results = [];

    for (let i = 0; i < 100; i++) {
      const mockImage = createMockCardImage();
      const result = await ocrService.recognizeCard(mockImage);
      results.push(result);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / 100;

    console.log(`Benchmark Results:
      - Total time: ${totalTime}ms
      - Average per card: ${avgTime}ms
      - Throughput: ${(60000 / avgTime).toFixed(0)} cards/minute
    `);

    expect(avgTime).toBeLessThan(2000); // 2s per card max
    expect(totalTime).toBeLessThan(200000); // 200s total max
  }, 300000); // 5 min timeout

  test("Concurrent processing test", async () => {
    const concurrentRequests = 10;
    const promises = [];

    const startTime = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const mockImage = createMockCardImage();
      promises.push(ocrService.recognizeCard(mockImage));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    expect(results.length).toBe(concurrentRequests);
    expect(totalTime).toBeLessThan(15000); // Should handle 10 concurrent in 15s

    console.log(`Concurrent Processing:
      - ${concurrentRequests} cards processed in ${totalTime}ms
      - Average: ${totalTime / concurrentRequests}ms per card
    `);
  });
});
