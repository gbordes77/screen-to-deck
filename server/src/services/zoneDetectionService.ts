import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import zoneConfig from '../config/zoneDetectionConfig.json';

interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  description?: string;
  grid?: {
    rows: number;
    cols: number;
    maxCards: number;
  };
}

interface DetectionResult {
  platform: 'mtga' | 'mtgo';
  resolution: string;
  zones: {
    main: ExtractedZone[];
    sideboard: ExtractedZone[];
    headers?: ExtractedZone[];
  };
  confidence: number;
  metadata: {
    imageWidth: number;
    imageHeight: number;
    detectedAt: string;
    processingTime: number;
  };
}

interface ExtractedZone {
  buffer: Buffer;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: string;
  index?: number;
}

export class ZoneDetectionService {
  private config: typeof zoneConfig;
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.config = zoneConfig;
    this.debugMode = debugMode;
  }

  /**
   * Detect platform and resolution from image
   */
  async detectPlatformAndResolution(imageBuffer: Buffer): Promise<{
    platform: 'mtga' | 'mtgo';
    resolution: string;
    confidence: number;
  }> {
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    // Find closest resolution
    const resolution = this.findClosestResolution(width, height);
    
    // Detect platform by analyzing image characteristics
    const platform = await this.detectPlatform(imageBuffer, width, height);
    
    return {
      platform,
      resolution,
      confidence: 0.85 // Base confidence, will be refined
    };
  }

  /**
   * Extract zones from image based on detected platform
   */
  async extractZones(
    imageBuffer: Buffer,
    platform?: 'mtga' | 'mtgo',
    resolution?: string
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    
    // Auto-detect if not provided
    if (!platform || !resolution) {
      const detected = await this.detectPlatformAndResolution(imageBuffer);
      platform = platform || detected.platform;
      resolution = resolution || detected.resolution;
    }

    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    // Get zone configuration
    const platformConfig = this.config.platforms[platform];
    const resolutionConfig = platformConfig.resolutions[resolution];
    
    if (!resolutionConfig) {
      throw new Error(`No configuration found for ${platform} at ${resolution}`);
    }

    // Extract zones
    const zones = await this.extractZonesFromConfig(
      imageBuffer,
      resolutionConfig.zones,
      width,
      height
    );

    // Apply preprocessing if needed
    const processedZones = await this.preprocessZones(zones, platform);

    // Organize zones by type
    const organizedZones = this.organizeZones(processedZones, platform);

    const processingTime = Date.now() - startTime;

    return {
      platform,
      resolution,
      zones: organizedZones,
      confidence: this.calculateConfidence(processedZones),
      metadata: {
        imageWidth: width,
        imageHeight: height,
        detectedAt: new Date().toISOString(),
        processingTime
      }
    };
  }

  /**
   * Extract individual zones from image
   */
  private async extractZonesFromConfig(
    imageBuffer: Buffer,
    zonesConfig: Record<string, Zone>,
    imageWidth: number,
    imageHeight: number
  ): Promise<ExtractedZone[]> {
    const extractedZones: ExtractedZone[] = [];
    const image = sharp(imageBuffer);

    for (const [zoneName, zone] of Object.entries(zonesConfig)) {
      try {
        // Convert relative coordinates to absolute pixels
        const x = Math.floor(zone.x * imageWidth);
        const y = Math.floor(zone.y * imageHeight);
        const width = Math.floor(zone.width * imageWidth);
        const height = Math.floor(zone.height * imageHeight);

        // Extract zone
        const zoneBuffer = await image
          .clone()
          .extract({ left: x, top: y, width, height })
          .toBuffer();

        extractedZones.push({
          buffer: zoneBuffer,
          coordinates: { x, y, width, height },
          type: zoneName,
          index: extractedZones.length
        });

        // For grid zones, extract individual cards
        if (zone.grid && (zoneName === 'mainDeck' || zoneName === 'sideboard')) {
          const cardZones = await this.extractCardZones(
            zoneBuffer,
            zone.grid,
            width,
            height,
            zoneName
          );
          extractedZones.push(...cardZones);
        }

        // Debug: Save extracted zones
        if (this.debugMode) {
          await this.saveDebugZone(zoneBuffer, zoneName);
        }
      } catch (error) {
        console.error(`Failed to extract zone ${zoneName}:`, error);
      }
    }

    return extractedZones;
  }

  /**
   * Extract individual card zones from a grid
   */
  private async extractCardZones(
    gridBuffer: Buffer,
    grid: { rows: number; cols: number; maxCards: number },
    gridWidth: number,
    gridHeight: number,
    parentType: string
  ): Promise<ExtractedZone[]> {
    const cardZones: ExtractedZone[] = [];
    const cardWidth = Math.floor(gridWidth / grid.cols);
    const cardHeight = Math.floor(gridHeight / grid.rows);

    const image = sharp(gridBuffer);
    
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cardIndex = row * grid.cols + col;
        if (cardIndex >= grid.maxCards) break;

        try {
          const x = col * cardWidth;
          const y = row * cardHeight;

          const cardBuffer = await image
            .clone()
            .extract({ 
              left: x, 
              top: y, 
              width: Math.min(cardWidth, gridWidth - x),
              height: Math.min(cardHeight, gridHeight - y)
            })
            .toBuffer();

          cardZones.push({
            buffer: cardBuffer,
            coordinates: { x, y, width: cardWidth, height: cardHeight },
            type: `${parentType}_card`,
            index: cardIndex
          });
        } catch (error) {
          // Skip invalid card zones
        }
      }
    }

    return cardZones;
  }

  /**
   * Preprocess zones for better OCR
   */
  private async preprocessZones(
    zones: ExtractedZone[],
    platform: 'mtga' | 'mtgo'
  ): Promise<ExtractedZone[]> {
    const preprocessConfig = this.config.preprocessing;
    const processedZones: ExtractedZone[] = [];

    for (const zone of zones) {
      let processedBuffer = zone.buffer;

      // Apply preprocessing based on configuration
      const image = sharp(processedBuffer);

      // Enhance contrast
      if (preprocessConfig.enhanceContrast.enabled) {
        processedBuffer = await image
          .normalise()
          .toBuffer();
      }

      // Apply sharpening
      if (preprocessConfig.sharpen.enabled) {
        processedBuffer = await sharp(processedBuffer)
          .sharpen()
          .toBuffer();
      }

      // Platform-specific preprocessing
      if (platform === 'mtgo') {
        // MTGO text is typically black on white
        processedBuffer = await sharp(processedBuffer)
          .grayscale()
          .threshold(128)
          .toBuffer();
      } else if (platform === 'mtga') {
        // MTGA has colorful cards, might need different processing
        processedBuffer = await sharp(processedBuffer)
          .modulate({ brightness: 1.1 })
          .toBuffer();
      }

      processedZones.push({
        ...zone,
        buffer: processedBuffer
      });
    }

    return processedZones;
  }

  /**
   * Organize zones by type (main, sideboard, headers)
   */
  private organizeZones(
    zones: ExtractedZone[],
    platform: 'mtga' | 'mtgo'
  ): {
    main: ExtractedZone[];
    sideboard: ExtractedZone[];
    headers?: ExtractedZone[];
  } {
    const main: ExtractedZone[] = [];
    const sideboard: ExtractedZone[] = [];
    const headers: ExtractedZone[] = [];

    for (const zone of zones) {
      if (zone.type.includes('mainDeck')) {
        main.push(zone);
      } else if (zone.type.includes('sideboard')) {
        sideboard.push(zone);
      } else if (zone.type.includes('header') || zone.type.includes('Header')) {
        headers.push(zone);
      }
    }

    return {
      main,
      sideboard,
      ...(headers.length > 0 && { headers })
    };
  }

  /**
   * Detect platform from image characteristics
   */
  private async detectPlatform(
    imageBuffer: Buffer,
    width: number,
    height: number
  ): Promise<'mtga' | 'mtgo'> {
    // Analyze image characteristics
    const stats = await sharp(imageBuffer).stats();
    
    // MTGA typically has darker backgrounds
    const avgBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
    
    // MTGO has lighter backgrounds (usually white/gray)
    if (avgBrightness > 200) {
      return 'mtgo';
    }

    // Additional heuristics could be added here
    // - Check for specific UI elements
    // - Look for text patterns
    // - Analyze color distribution

    return 'mtga';
  }

  /**
   * Find closest supported resolution
   */
  private findClosestResolution(width: number, height: number): string {
    const supportedResolutions = [
      { width: 3840, height: 2160, name: '3840x2160' },
      { width: 2560, height: 1440, name: '2560x1440' },
      { width: 1920, height: 1080, name: '1920x1080' },
      { width: 1280, height: 720, name: '1280x720' }
    ];

    let closest = supportedResolutions[0];
    let minDiff = Math.abs(width - closest.width) + Math.abs(height - closest.height);

    for (const res of supportedResolutions) {
      const diff = Math.abs(width - res.width) + Math.abs(height - res.height);
      if (diff < minDiff) {
        minDiff = diff;
        closest = res;
      }
    }

    return closest.name;
  }

  /**
   * Calculate confidence score for detection
   */
  private calculateConfidence(zones: ExtractedZone[]): number {
    if (zones.length === 0) return 0;

    // Base confidence
    let confidence = 0.7;

    // Increase confidence based on number of zones detected
    if (zones.length > 10) confidence += 0.1;
    if (zones.length > 20) confidence += 0.1;
    if (zones.length > 40) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Save debug zone for analysis
   */
  private async saveDebugZone(buffer: Buffer, zoneName: string): Promise<void> {
    const debugDir = path.join(process.cwd(), 'debug', 'zones');
    await fs.mkdir(debugDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = path.join(debugDir, `zone_${zoneName}_${timestamp}.png`);
    
    await sharp(buffer).png().toFile(filename);
    console.log(`Debug zone saved: ${filename}`);
  }

  /**
   * Generate visual overlay for debugging
   */
  async generateDebugOverlay(
    imageBuffer: Buffer,
    platform: 'mtga' | 'mtgo',
    resolution: string
  ): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    // Get zone configuration
    const platformConfig = this.config.platforms[platform];
    const resolutionConfig = platformConfig.resolutions[resolution];
    
    if (!resolutionConfig) {
      throw new Error(`No configuration found for ${platform} at ${resolution}`);
    }

    // Create SVG overlay with zones
    const svg = this.createZoneOverlaySVG(
      resolutionConfig.zones,
      width,
      height
    );

    // Composite overlay on image
    const result = await sharp(imageBuffer)
      .composite([{
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }])
      .toBuffer();

    return result;
  }

  /**
   * Create SVG overlay showing zones
   */
  private createZoneOverlaySVG(
    zones: Record<string, Zone>,
    width: number,
    height: number
  ): string {
    const colors = {
      mainDeck: '#4CAF50',
      sideboard: '#FF9800',
      deckHeader: '#2196F3',
      sideboardHeader: '#2196F3',
      header: '#2196F3',
      deckName: '#2196F3',
      deckStats: '#9C27B0'
    };

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    for (const [zoneName, zone] of Object.entries(zones)) {
      const x = Math.floor(zone.x * width);
      const y = Math.floor(zone.y * height);
      const w = Math.floor(zone.width * width);
      const h = Math.floor(zone.height * height);
      const color = colors[zoneName] || '#FFFFFF';

      svg += `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" 
              fill="none" stroke="${color}" stroke-width="2" opacity="0.8"/>
        <text x="${x + 5}" y="${y + 20}" fill="${color}" font-size="14" font-weight="bold">
          ${zoneName}
        </text>
      `;
    }

    svg += '</svg>';
    return svg;
  }
}

// Export singleton instance
export default new ZoneDetectionService();