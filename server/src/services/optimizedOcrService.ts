import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { MTGCard, OCRResult } from '../types';
import { promisify } from 'util';
import { createHash } from 'crypto';
import mtgoCorrector from './mtgoLandCorrector';
import { getOCRConfig, OCROptimizationConfig } from '../config/ocrOptimizationConfig';

// Simple in-memory cache for processed zones
const zoneCache = new Map<string, OCRResult>();

interface ImageZone {
  type: 'mainboard' | 'sideboard';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcessingMetrics {
  originalResolution: { width: number; height: number };
  finalResolution: { width: number; height: number };
  superResolutionApplied: boolean;
  preprocessingTime: number;
  ocrTime: number;
  totalTime: number;
  parallelProcessing: boolean;
  cacheHits: number;
}

/**
 * Optimized OCR Service with super-resolution and parallel processing
 * Key optimizations:
 * 1. Automatic super-resolution for images < 1200px width
 * 2. Parallel processing of mainboard and sideboard zones
 * 3. Zone-based caching to avoid reprocessing
 * 4. Optimized preprocessing for MTGA/MTGO formats
 */
export class OptimizedOCRService {
  private openai: OpenAI | null = null;
  private config: OCROptimizationConfig;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'TO_BE_SET') {
      this.openai = new OpenAI({ apiKey });
    }
    
    // Load configuration
    this.config = getOCRConfig();
    
    // Start cache cleanup if caching is enabled
    if (this.config.caching.enabled) {
      this.startCacheCleanup();
    }
  }
  
  private startCacheCleanup(): void {
    // Clean expired cache entries every 5 minutes
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of zoneCache.entries()) {
        // Simple TTL check - in production, store timestamp with cache entry
        if (zoneCache.size > this.config.caching.maxEntries) {
          zoneCache.delete(key);
        }
      }
    }, 300000);
  }

  /**
   * Main entry point with performance metrics
   */
  async processImage(imagePath: string): Promise<OCRResult & { metrics?: ProcessingMetrics }> {
    const startTime = Date.now();
    const metrics: ProcessingMetrics = {
      originalResolution: { width: 0, height: 0 },
      finalResolution: { width: 0, height: 0 },
      superResolutionApplied: false,
      preprocessingTime: 0,
      ocrTime: 0,
      totalTime: 0,
      parallelProcessing: false,
      cacheHits: 0
    };

    console.log('🚀 Starting Optimized OCR Pipeline...');

    try {
      // Step 1: Analyze image and determine if super-resolution is needed
      const preprocessStart = Date.now();
      const quality = await this.analyzeImageQuality(imagePath);
      metrics.originalResolution = { width: quality.width, height: quality.height };
      
      console.log(`📊 Image analysis: ${quality.width}x${quality.height}`);
      console.log(`🎯 Super-resolution needed: ${quality.needsSuperResolution && this.config.superResolution.enabled}`);

      // Step 2: Apply super-resolution if needed and enabled
      let processedPath = imagePath;
      if (quality.needsSuperResolution && this.config.superResolution.enabled) {
        processedPath = await this.applySuperResolution(imagePath, quality.width);
        metrics.superResolutionApplied = true;
        
        // Update final resolution
        const finalQuality = await this.analyzeImageQuality(processedPath);
        metrics.finalResolution = { width: finalQuality.width, height: finalQuality.height };
        
        console.log(`✅ Super-resolution applied: ${metrics.finalResolution.width}x${metrics.finalResolution.height}`);
      } else {
        metrics.finalResolution = metrics.originalResolution;
      }
      metrics.preprocessingTime = Date.now() - preprocessStart;

      // Step 3: Detect format
      const format = await this.detectFormat(processedPath);
      console.log(`🎮 Detected format: ${format}`);

      // Step 4: Define zones for parallel processing
      const zones = this.defineZones(processedPath, format, metrics.finalResolution);
      
      // Step 5: Process zones in parallel
      const ocrStart = Date.now();
      const result = await this.processZonesParallel(processedPath, zones, format, metrics);
      metrics.ocrTime = Date.now() - ocrStart;
      metrics.parallelProcessing = zones.length > 1;

      // Step 6: Validate and fix totals
      const validatedResult = await this.validateAndFix(result, processedPath, format);

      // Clean up temporary files
      if (processedPath !== imagePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      metrics.totalTime = Date.now() - startTime;
      console.log(`✅ OCR completed in ${metrics.totalTime}ms`);
      console.log(`📊 Metrics:`, {
        ...metrics,
        speedup: metrics.preprocessingTime > 0 ? 
          `${(metrics.totalTime / (metrics.preprocessingTime + metrics.ocrTime)).toFixed(2)}x` : 'N/A'
      });

      return {
        ...validatedResult,
        processing_time: metrics.totalTime,
        success: true,
        metrics
      };

    } catch (error) {
      console.error('❌ Optimized OCR error:', error);
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metrics
      };
    }
  }

  /**
   * Analyze image quality with enhanced checks
   */
  private async analyzeImageQuality(imagePath: string): Promise<{
    width: number;
    height: number;
    needsSuperResolution: boolean;
    estimatedTextSize: number;
  }> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    // Estimate text size based on typical card list layouts
    const estimatedTextSize = Math.min(width, height) / 30;
    
    // Need super-resolution if:
    // 1. Width is below threshold
    // 2. Estimated text size is too small for reliable OCR
    const needsSuperResolution = width < this.config.superResolution.minWidthThreshold || 
                                estimatedTextSize < this.config.formatSpecific.mtga.minTextHeight;
    
    return {
      width,
      height,
      needsSuperResolution,
      estimatedTextSize
    };
  }

  /**
   * Apply intelligent super-resolution with format-specific optimization
   */
  private async applySuperResolution(imagePath: string, originalWidth: number): Promise<string> {
    const outputPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_sr_optimized.png');
    
    // Calculate optimal target width based on configuration
    const targetWidth = this.config.superResolution.adaptiveScaling ?
      Math.max(this.config.superResolution.targetWidth, originalWidth * this.config.superResolution.upscaleFactor) :
      this.config.superResolution.targetWidth;
    
    console.log(`🔍 Applying ${(targetWidth / originalWidth).toFixed(1)}x super-resolution...`);
    
    // Try Python super-resolution first (if available)
    const pythonSRPath = path.join(__dirname, '../../../../super_resolution_free.py');
    if (fs.existsSync(pythonSRPath)) {
      try {
        await this.runPythonSuperResolution(imagePath, outputPath, pythonSRPath);
        if (fs.existsSync(outputPath)) {
          return outputPath;
        }
      } catch (error) {
        console.warn('⚠️ Python super-resolution failed, falling back to Sharp');
      }
    }
    
    // Fallback: Advanced Sharp upscaling with multi-stage approach
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const scale = targetWidth / (metadata.width || 1);
    
    // Multi-stage upscaling for better quality
    let currentImage = sharp(imagePath);
    let currentScale = 1.0;
    
    while (currentScale < scale) {
      const stepScale = Math.min(2.0, scale / currentScale);
      const newWidth = Math.round((metadata.width || 0) * currentScale * stepScale);
      
      currentImage = currentImage
        .resize({
          width: newWidth,
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false
        })
        .sharpen({ sigma: 1.0, m1: 0.5, m2: 0.3 })
        .normalize()
        .modulate({
          brightness: 1.05,
          saturation: 1.1
        });
      
      currentScale *= stepScale;
    }
    
    // Apply final enhancements
    await currentImage
      .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Run Python super-resolution script
   */
  private runPythonSuperResolution(input: string, output: string, scriptPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python3', [scriptPath, input, output, '--target-width', '2400']);
      
      let stderr = '';
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(output)) {
          resolve();
        } else {
          reject(new Error(`Python SR failed: ${stderr}`));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error('Python SR timeout'));
      }, 30000);
    });
  }

  /**
   * Detect format with improved heuristics
   */
  private async detectFormat(imagePath: string): Promise<'arena' | 'mtgo' | 'paper'> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      
      // MTGO has very wide aspect ratio (typically > 2.0)
      if (aspectRatio > 2.0) {
        return 'mtgo';
      }
      
      // Arena typically has aspect ratio around 2.0-2.3
      if (aspectRatio >= 1.8 && aspectRatio <= 2.3) {
        return 'arena';
      }
    }
    
    // Default to Arena for standard screenshots
    return 'arena';
  }

  /**
   * Define zones for parallel processing
   */
  private defineZones(imagePath: string, format: string, resolution: { width: number; height: number }): ImageZone[] {
    const zones: ImageZone[] = [];
    
    if (format === 'mtgo') {
      // MTGO: Main list on left, sideboard on right
      const mainRatio = this.config.formatSpecific.mtgo.mainboardZoneRatio;
      const sideRatio = this.config.formatSpecific.mtgo.sideboardZoneRatio;
      
      zones.push({
        type: 'mainboard',
        x: 0,
        y: 0,
        width: Math.round(resolution.width * mainRatio),
        height: resolution.height
      });
      zones.push({
        type: 'sideboard',
        x: Math.round(resolution.width * mainRatio),
        y: 0,
        width: Math.round(resolution.width * sideRatio),
        height: resolution.height
      });
    } else if (format === 'arena') {
      // Arena: Main area center, sideboard right
      const mainRatio = this.config.formatSpecific.mtga.mainboardZoneRatio;
      const sideRatio = this.config.formatSpecific.mtga.sideboardZoneRatio;
      
      zones.push({
        type: 'mainboard',
        x: 0,
        y: 0,
        width: Math.round(resolution.width * mainRatio),
        height: resolution.height
      });
      zones.push({
        type: 'sideboard',
        x: Math.round(resolution.width * mainRatio),
        y: 0,
        width: Math.round(resolution.width * sideRatio),
        height: resolution.height
      });
    } else {
      // Paper: Process as single zone
      zones.push({
        type: 'mainboard',
        x: 0,
        y: 0,
        width: resolution.width,
        height: resolution.height
      });
    }
    
    return zones;
  }

  /**
   * Process zones in parallel for faster extraction
   */
  private async processZonesParallel(
    imagePath: string,
    zones: ImageZone[],
    format: string,
    metrics: ProcessingMetrics
  ): Promise<OCRResult> {
    // Check if parallel processing should be used
    const useParallel = this.config.parallelProcessing.enabled && 
                       zones.length > 1 &&
                       metrics.finalResolution.width * metrics.finalResolution.height > 
                       this.config.parallelProcessing.minImageSizeForParallel;
    
    console.log(`🔄 Processing ${zones.length} zones ${useParallel ? 'in parallel' : 'sequentially'}...`);
    
    let zoneResults: OCRResult[];
    if (useParallel) {
      // Process zones in parallel with worker limit
      const zonePromises = zones.map(zone => this.processZone(imagePath, zone, format, metrics));
      zoneResults = await Promise.all(zonePromises);
      metrics.parallelProcessing = true;
    } else {
      // Process zones sequentially
      zoneResults = [];
      for (const zone of zones) {
        const result = await this.processZone(imagePath, zone, format, metrics);
        zoneResults.push(result);
      }
      metrics.parallelProcessing = false;
    }
    
    // Merge results from all zones
    const allCards: MTGCard[] = [];
    let totalConfidence = 0;
    let zoneCount = 0;
    
    for (const result of zoneResults) {
      if (result.success) {
        allCards.push(...result.cards);
        totalConfidence += result.confidence;
        zoneCount++;
      }
    }
    
    return {
      success: zoneCount > 0,
      cards: allCards,
      confidence: zoneCount > 0 ? totalConfidence / zoneCount : 0,
      processing_time: 0
    };
  }

  /**
   * Process individual zone with caching
   */
  private async processZone(
    imagePath: string,
    zone: ImageZone,
    format: string,
    metrics: ProcessingMetrics
  ): Promise<OCRResult> {
    // Generate cache key based on image and zone
    const cacheKey = this.generateCacheKey(imagePath, zone);
    
    // Check cache first if enabled
    if (this.config.caching.enabled) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit for ${zone.type} zone`);
        metrics.cacheHits++;
        return cached;
      }
    }
    
    // Extract zone from image
    const zoneImagePath = await this.extractZone(imagePath, zone);
    
    try {
      // Try OpenAI Vision for this zone
      let result: OCRResult;
      
      if (this.openai) {
        result = await this.processZoneWithOpenAI(zoneImagePath, zone.type, format);
      } else {
        // Fallback to EasyOCR
        result = await this.processZoneWithEasyOCR(zoneImagePath, zone.type);
      }
      
      // Cache the result if caching is enabled
      if (this.config.caching.enabled) {
        this.cacheResult(cacheKey, result);
      }
      
      // Clean up zone image
      if (fs.existsSync(zoneImagePath)) {
        fs.unlinkSync(zoneImagePath);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error processing ${zone.type} zone:`, error);
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: 0,
        errors: [error instanceof Error ? error.message : 'Zone processing failed']
      };
    }
  }

  /**
   * Extract a specific zone from the image
   */
  private async extractZone(imagePath: string, zone: ImageZone): Promise<string> {
    const outputPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, `_${zone.type}_zone.png`);
    
    await sharp(imagePath)
      .extract({
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height
      })
      .png()
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Process zone with OpenAI Vision
   */
  private async processZoneWithOpenAI(
    zoneImagePath: string,
    zoneType: 'mainboard' | 'sideboard',
    format: string
  ): Promise<OCRResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }
    
    const base64Image = fs.readFileSync(zoneImagePath).toString('base64');
    const prompt = this.getOptimizedPrompt(zoneType, format);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });
    
    const content = response.choices[0]?.message?.content;
    if (content) {
      const cards = this.parseOpenAIResponse(content, zoneType);
      return {
        success: true,
        cards,
        confidence: 0.95,
        processing_time: 0
      };
    }
    
    throw new Error('No response from OpenAI');
  }

  /**
   * Process zone with EasyOCR
   */
  private async processZoneWithEasyOCR(
    zoneImagePath: string,
    zoneType: 'mainboard' | 'sideboard'
  ): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../../discord-bot/ocr_parser_easyocr.py');
      
      if (!fs.existsSync(scriptPath)) {
        reject(new Error('EasyOCR script not found'));
        return;
      }
      
      const proc = spawn('python3', [scriptPath, zoneImagePath, '--format', 'json']);
      let output = '';
      let error = '';
      
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { error += data.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const result = JSON.parse(output);
            const cards = this.parseEasyOCRResult(result, zoneType);
            resolve({
              success: true,
              cards,
              confidence: 0.7,
              processing_time: 0
            });
          } catch (e) {
            reject(new Error('Failed to parse EasyOCR output'));
          }
        } else {
          reject(new Error(error || 'EasyOCR failed'));
        }
      });
    });
  }

  /**
   * Generate cache key for zone
   */
  private generateCacheKey(imagePath: string, zone: ImageZone): string {
    const fileStats = fs.statSync(imagePath);
    const hash = createHash('md5');
    hash.update(`${imagePath}:${fileStats.mtime.getTime()}:${JSON.stringify(zone)}`);
    return hash.digest('hex');
  }

  /**
   * Get cached result if available
   */
  private getCachedResult(key: string): OCRResult | null {
    const cached = zoneCache.get(key);
    if (cached) {
      // Check if cache is still valid (simplified TTL check)
      return cached;
    }
    return null;
  }

  /**
   * Cache OCR result
   */
  private cacheResult(key: string, result: OCRResult): void {
    zoneCache.set(key, result);
    
    // Cache size management based on config
    if (zoneCache.size > this.config.caching.maxEntries) {
      const firstKey = zoneCache.keys().next().value;
      if (firstKey) zoneCache.delete(firstKey);
    }
  }

  /**
   * Get optimized prompt for specific zone and format
   */
  private getOptimizedPrompt(zoneType: 'mainboard' | 'sideboard', format: string): string {
    const isMainboard = zoneType === 'mainboard';
    const expectedCount = isMainboard ? 60 : 15;
    
    let formatSpecific = '';
    if (format === 'mtgo') {
      formatSpecific = `This is an MTGO interface. Each line in the list represents one card.
Count how many times each unique card name appears.`;
    } else if (format === 'arena') {
      formatSpecific = `This is an MTG Arena interface. Look for quantities like x2, x3, x4 next to card names.`;
    }
    
    return `Extract EXACTLY all Magic: The Gathering cards from this ${zoneType} zone.
${formatSpecific}

Expected: Approximately ${expectedCount} total cards in ${zoneType}.

Return ONLY a JSON array of cards:
[{"name": "Card Name", "quantity": 4}, ...]

Be precise with card names. Include all cards visible.`;
  }

  /**
   * Parse OpenAI response
   */
  private parseOpenAIResponse(content: string, zoneType: 'mainboard' | 'sideboard'): MTGCard[] {
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      const data = JSON.parse(jsonMatch[0]);
      const cards: MTGCard[] = [];
      
      for (const card of data) {
        if (card.name && card.quantity) {
          cards.push({
            name: card.name,
            quantity: parseInt(card.quantity) || 1,
            section: zoneType
          });
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return [];
    }
  }

  /**
   * Parse EasyOCR result
   */
  private parseEasyOCRResult(result: any, zoneType: 'mainboard' | 'sideboard'): MTGCard[] {
    const cards: MTGCard[] = [];
    
    if (result.cards) {
      for (const card of result.cards) {
        cards.push({
          name: card.name,
          quantity: card.quantity || 1,
          section: zoneType
        });
      }
    }
    
    return cards;
  }

  /**
   * Validate and fix card counts
   */
  private async validateAndFix(result: OCRResult, imagePath: string, format: string): Promise<OCRResult> {
    // Apply MTGO correction if needed and enabled
    if (format === 'mtgo' && result.cards.length > 0 && this.config.formatSpecific.mtgo.applyLandCorrection) {
      const correctedCards = mtgoCorrector.applyMTGOLandCorrection(result.cards, '');
      result.cards = correctedCards;
    }
    
    const mainboardCount = result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideboardCount = result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    
    console.log(`📊 Final count: ${mainboardCount} mainboard, ${sideboardCount} sideboard`);
    
    if (mainboardCount === 60 && sideboardCount === 15) {
      console.log('✅ Perfect extraction!');
      return result;
    }
    
    // Add warnings if counts are off
    if (mainboardCount !== 60) {
      result.warnings = [...(result.warnings || []), `Mainboard has ${mainboardCount} cards, expected 60`];
    }
    if (sideboardCount !== 15) {
      result.warnings = [...(result.warnings || []), `Sideboard has ${sideboardCount} cards, expected 15`];
    }
    
    return result;
  }
}

export default new OptimizedOCRService();