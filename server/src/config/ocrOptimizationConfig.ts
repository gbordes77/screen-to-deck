/**
 * OCR Optimization Configuration
 * Centralized settings for performance tuning
 */

export interface OCROptimizationConfig {
  superResolution: {
    enabled: boolean;
    minWidthThreshold: number;  // Apply SR below this width
    targetWidth: number;         // Target width after SR
    upscaleFactor: number;       // Maximum upscale factor
    adaptiveScaling: boolean;    // Use adaptive scaling based on resolution
  };
  parallelProcessing: {
    enabled: boolean;
    maxWorkers: number;          // Max parallel zones
    minImageSizeForParallel: number; // Min pixels to trigger parallel
  };
  caching: {
    enabled: boolean;
    ttl: number;                 // Cache TTL in ms
    maxEntries: number;          // Max cache entries
  };
  preprocessing: {
    sharpening: boolean;
    contrastEnhancement: boolean;
    noiseReduction: boolean;
    claheClipLimit: number;      // CLAHE clip limit
    tileGridSize: number;        // CLAHE tile grid size
  };
  formatSpecific: {
    mtga: {
      mainboardZoneRatio: number;  // Portion of width for mainboard
      sideboardZoneRatio: number;  // Portion of width for sideboard
      minTextHeight: number;       // Min text height in pixels
    };
    mtgo: {
      mainboardZoneRatio: number;
      sideboardZoneRatio: number;
      applyLandCorrection: boolean;
    };
  };
  performance: {
    enableMetrics: boolean;       // Track performance metrics
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    timeouts: {
      ocr: number;              // OCR timeout in ms
      superResolution: number;   // SR timeout in ms
    };
  };
}

// Default configuration
export const defaultOCRConfig: OCROptimizationConfig = {
  superResolution: {
    enabled: true,
    minWidthThreshold: 1200,
    targetWidth: 2400,
    upscaleFactor: 4,
    adaptiveScaling: true
  },
  parallelProcessing: {
    enabled: true,
    maxWorkers: 4,
    minImageSizeForParallel: 2000000 // 2MP
  },
  caching: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxEntries: 100
  },
  preprocessing: {
    sharpening: true,
    contrastEnhancement: true,
    noiseReduction: true,
    claheClipLimit: 4.0,
    tileGridSize: 8
  },
  formatSpecific: {
    mtga: {
      mainboardZoneRatio: 0.75,
      sideboardZoneRatio: 0.25,
      minTextHeight: 15
    },
    mtgo: {
      mainboardZoneRatio: 0.65,
      sideboardZoneRatio: 0.35,
      applyLandCorrection: true
    }
  },
  performance: {
    enableMetrics: true,
    logLevel: 'info',
    timeouts: {
      ocr: 30000,
      superResolution: 30000
    }
  }
};

// Environment-specific overrides
export function getOCRConfig(): OCROptimizationConfig {
  const config = { ...defaultOCRConfig };
  
  // Override based on environment variables
  if (process.env.OCR_DISABLE_SUPER_RESOLUTION === 'true') {
    config.superResolution.enabled = false;
  }
  
  if (process.env.OCR_DISABLE_PARALLEL === 'true') {
    config.parallelProcessing.enabled = false;
  }
  
  if (process.env.OCR_DISABLE_CACHE === 'true') {
    config.caching.enabled = false;
  }
  
  if (process.env.OCR_MIN_WIDTH_THRESHOLD) {
    config.superResolution.minWidthThreshold = parseInt(process.env.OCR_MIN_WIDTH_THRESHOLD);
  }
  
  if (process.env.OCR_TARGET_WIDTH) {
    config.superResolution.targetWidth = parseInt(process.env.OCR_TARGET_WIDTH);
  }
  
  if (process.env.OCR_MAX_WORKERS) {
    config.parallelProcessing.maxWorkers = parseInt(process.env.OCR_MAX_WORKERS);
  }
  
  if (process.env.NODE_ENV === 'production') {
    config.performance.logLevel = 'warn';
  }
  
  return config;
}