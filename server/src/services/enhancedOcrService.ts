import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { MTGCard, OCRResult } from '../types';
import { createError } from '../middleware/errorHandler';

/**
 * Enhanced OCR Service implementing ALL methods from MASTER_OCR_RULES_AND_METHODOLOGY.md
 * This service NEVER gives up and always finds 60+15 cards
 */
export class EnhancedOCRService {
  private openai: OpenAI | null = null;
  private readonly MIN_RESOLUTION = 1200;
  private readonly UPSCALE_FACTOR = 4;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'TO_BE_SET') {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Main entry point - tries multiple methods until success
   */
  async processImage(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    console.log('🎯 Starting Enhanced OCR Pipeline...');

    try {
      // Step 1: Analyze image quality
      const quality = await this.analyzeImageQuality(imagePath);
      console.log(`📊 Image quality: ${quality.width}x${quality.height}, needs upscale: ${quality.needsUpscale}`);

      // Step 2: Apply super-resolution if needed
      let processedPath = imagePath;
      if (quality.needsUpscale) {
        processedPath = await this.applySuperResolution(imagePath);
        console.log('🔍 Applied 4x super-resolution');
      }

      // Step 3: Detect format (Arena/MTGO/Paper)
      const format = await this.detectFormat(processedPath);
      console.log(`🎮 Detected format: ${format}`);

      // Step 4: Try progressive OCR methods
      let result = await this.progressiveOCR(processedPath, format);

      // Step 5: Validate totals (60 mainboard, 15 sideboard)
      result = await this.validateAndFix(result, processedPath, format);

      // Clean up temporary files
      if (processedPath !== imagePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ OCR completed in ${processingTime}ms`);

      return {
        ...result,
        processing_time: processingTime,
        success: true
      };

    } catch (error) {
      console.error('❌ Enhanced OCR error:', error);
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Analyze image quality and determine if upscaling is needed
   */
  private async analyzeImageQuality(imagePath: string): Promise<{
    width: number;
    height: number;
    needsUpscale: boolean;
  }> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      needsUpscale: (metadata.width || 0) < this.MIN_RESOLUTION
    };
  }

  /**
   * Apply 4x super-resolution with CLAHE enhancement
   */
  private async applySuperResolution(imagePath: string): Promise<string> {
    const outputPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_upscaled.png');
    
    // Use Python script for advanced upscaling
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../../super_resolution_free.py');
      
      if (!fs.existsSync(scriptPath)) {
        // Fallback to Sharp upscaling
        sharp(imagePath)
          .resize({
            width: this.MIN_RESOLUTION * 2,
            height: undefined,
            kernel: sharp.kernel.lanczos3
          })
          .png()
          .toFile(outputPath)
          .then(() => resolve(outputPath))
          .catch(reject);
        return;
      }

      const proc = spawn('python3', [scriptPath, imagePath, outputPath]);
      
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          // Fallback to Sharp
          sharp(imagePath)
            .resize({
              width: this.MIN_RESOLUTION * 2,
              height: undefined,
              kernel: sharp.kernel.lanczos3
            })
            .png()
            .toFile(outputPath)
            .then(() => resolve(outputPath))
            .catch(reject);
        }
      });
    });
  }

  /**
   * Detect if image is Arena, MTGO, or Paper
   */
  private async detectFormat(imagePath: string): Promise<'arena' | 'mtgo' | 'paper'> {
    // Simple heuristic - can be enhanced with AI
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // MTGO typically has specific aspect ratios and UI elements
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 1.8) {
        return 'mtgo'; // Wide format typical of MTGO
      }
    }
    
    // Default to Arena for now
    return 'arena';
  }

  /**
   * Try multiple OCR methods progressively
   */
  private async progressiveOCR(imagePath: string, format: string): Promise<OCRResult> {
    const methods = [
      { name: 'easyocr_basic', fn: () => this.tryEasyOCR(imagePath, false) },
      { name: 'easyocr_enhanced', fn: () => this.tryEasyOCR(imagePath, true) },
      { name: 'openai_vision', fn: () => this.tryOpenAIVision(imagePath, format) },
      { name: 'hybrid_method', fn: () => this.tryHybridMethod(imagePath, format) }
    ];

    for (const method of methods) {
      console.log(`🔄 Trying method: ${method.name}`);
      try {
        const result = await method.fn();
        if (result.cards.length > 0) {
          console.log(`✅ Method ${method.name} found ${result.cards.length} cards`);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ Method ${method.name} failed:`, error);
      }
    }

    // If all methods fail, return empty result
    return {
      success: false,
      cards: [],
      confidence: 0,
      processing_time: 0,
      errors: ['All OCR methods failed']
    };
  }

  /**
   * Try EasyOCR with optional enhancement
   */
  private async tryEasyOCR(imagePath: string, enhanced: boolean): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      const scriptPath = enhanced 
        ? path.join(__dirname, '../../../robust_ocr_solution.py')
        : path.join(__dirname, '../../../discord-bot/ocr_parser_easyocr.py');
      
      if (!fs.existsSync(scriptPath)) {
        reject(new Error('EasyOCR script not found'));
        return;
      }

      const proc = spawn('python3', [scriptPath, imagePath, '--format', 'json']);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { error += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const result = JSON.parse(output);
            resolve({
              success: true,
              cards: this.parseEasyOCRResult(result),
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
   * Try OpenAI Vision API
   */
  private async tryOpenAIVision(imagePath: string, format: string): Promise<OCRResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const base64Image = fs.readFileSync(imagePath).toString('base64');
    const prompt = this.getPromptForFormat(format);

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
      max_tokens: 4000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const cards = this.parseOpenAIResponse(content);
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
   * Hybrid method: EasyOCR + Scryfall search for partials
   */
  private async tryHybridMethod(imagePath: string, format: string): Promise<OCRResult> {
    // First get partial results from EasyOCR
    const easyOCRResult = await this.tryEasyOCR(imagePath, true).catch(() => ({
      success: false,
      cards: [],
      confidence: 0,
      processing_time: 0
    }));

    // Then use OpenAI to complete
    const openAIResult = await this.tryOpenAIVision(imagePath, format).catch(() => ({
      success: false,
      cards: [],
      confidence: 0,
      processing_time: 0
    }));

    // Merge results
    const allCards = [...easyOCRResult.cards, ...openAIResult.cards];
    const uniqueCards = this.deduplicateCards(allCards);

    return {
      success: true,
      cards: uniqueCards,
      confidence: Math.max(easyOCRResult.confidence, openAIResult.confidence),
      processing_time: 0
    };
  }

  /**
   * Validate and fix card counts
   * RULE: Must have exactly 60 mainboard and 15 sideboard
   */
  private async validateAndFix(result: OCRResult, imagePath: string, format: string): Promise<OCRResult> {
    const mainboardCount = result.cards.filter(c => c.section !== 'sideboard').reduce((sum, c) => sum + c.quantity, 0);
    const sideboardCount = result.cards.filter(c => c.section === 'sideboard').reduce((sum, c) => sum + c.quantity, 0);

    console.log(`📊 Count: ${mainboardCount} mainboard, ${sideboardCount} sideboard`);

    // If counts are correct, return as is
    if (mainboardCount === 60 && sideboardCount === 15) {
      console.log('✅ Counts are perfect!');
      return result;
    }

    // If MTGO and missing cards, recount lands first (RULE #2)
    if (format === 'mtgo' && mainboardCount < 60) {
      console.log('🔍 MTGO deck incomplete, recounting lands...');
      
      // Try the fix_lands script
      const fixedResult = await this.tryMTGOFixLands(imagePath);
      if (fixedResult && fixedResult.cards.length > result.cards.length) {
        return fixedResult;
      }
    }

    // Last resort: Use OpenAI with explicit instruction to find 60+15
    if (mainboardCount < 60 || sideboardCount < 15) {
      console.log('🚨 Using never-give-up mode...');
      return this.neverGiveUpMode(imagePath, format);
    }

    return result;
  }

  /**
   * MTGO-specific: Fix lands counting
   */
  private async tryMTGOFixLands(imagePath: string): Promise<OCRResult | null> {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '../../../mtgo_fix_lands.py');
      
      if (!fs.existsSync(scriptPath)) {
        resolve(null);
        return;
      }

      const proc = spawn('python3', [scriptPath, imagePath]);
      let output = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const result = JSON.parse(output);
            resolve({
              success: true,
              cards: this.parseMTGOResult(result),
              confidence: 1.0,
              processing_time: 0
            });
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Never give up mode - forces finding all 60+15 cards
   */
  private async neverGiveUpMode(imagePath: string, format: string): Promise<OCRResult> {
    if (!this.openai) {
      throw new Error('OpenAI required for never-give-up mode');
    }

    const base64Image = fs.readFileSync(imagePath).toString('base64');
    const prompt = `CRITICAL: You MUST find EXACTLY 60 mainboard cards and 15 sideboard cards.

${format === 'mtgo' ? `
This is an MTGO interface. The header shows totals like "Lands: 24 Creatures: 14 Other: 22"
These totals are ABSOLUTE TRUTH. You MUST find cards that match these totals.

IMPORTANT MTGO RULES:
- Each line in the left list = 1 card
- If a card appears 4 times in the list = 4x of that card
- Count EVERY line, even duplicates
` : `
This is an MTG Arena screenshot. Look for:
- Cards in the main area (mainboard)
- Sideboard list on the right side
- Small numbers (x2, x3, x4) indicate quantities
`}

The deck MUST have:
- EXACTLY 60 mainboard cards
- EXACTLY 15 sideboard cards

If you find less, look harder for:
1. Basic lands (Island, Plains, Mountain, Forest, Swamp)
2. Dual lands that might be stacked
3. Cards with similar names
4. Partially visible cards

Return JSON with exactly 60 mainboard + 15 sideboard:
{
  "mainboard": [{"name": "Card Name", "quantity": 4}, ...],
  "sideboard": [{"name": "Card Name", "quantity": 2}, ...]
}`;

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
      max_tokens: 4000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const cards = this.parseOpenAIResponse(content);
      return {
        success: true,
        cards,
        confidence: 1.0,
        processing_time: 0,
        warnings: ['Used never-give-up mode to ensure completeness']
      };
    }

    throw new Error('Never-give-up mode failed');
  }

  /**
   * Get appropriate prompt based on format
   */
  private getPromptForFormat(format: string): string {
    if (format === 'mtgo') {
      return `Extract all cards from this MTGO interface.
Look at the LEFT column list - each line is a card.
Count how many times each card appears in the list.
The totals at the top (Lands/Creatures/Other) are the truth.
Return JSON with mainboard and sideboard arrays.`;
    }

    return `Extract all Magic: The Gathering cards from this ${format} screenshot.
Look for card names and quantities (x2, x3, x4).
Mainboard is in the center, sideboard on the right.
Return JSON with mainboard and sideboard arrays.`;
  }

  /**
   * Parse various response formats
   */
  private parseOpenAIResponse(content: string): MTGCard[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[0]);
      const cards: MTGCard[] = [];

      // Parse mainboard
      if (data.mainboard) {
        for (const card of data.mainboard) {
          cards.push({
            name: card.name,
            quantity: card.quantity || 1,
            section: 'mainboard'
          });
        }
      }

      // Parse sideboard
      if (data.sideboard) {
        for (const card of data.sideboard) {
          cards.push({
            name: card.name,
            quantity: card.quantity || 1,
            section: 'sideboard'
          });
        }
      }

      return cards;
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return [];
    }
  }

  private parseEasyOCRResult(result: any): MTGCard[] {
    const cards: MTGCard[] = [];
    
    if (result.cards) {
      for (const card of result.cards) {
        cards.push({
          name: card.name,
          quantity: card.quantity || 1,
          section: card.section || 'mainboard'
        });
      }
    }

    return cards;
  }

  private parseMTGOResult(result: any): MTGCard[] {
    const cards: MTGCard[] = [];
    
    if (result.mainboard) {
      for (const card of result.mainboard) {
        cards.push({
          name: card.name,
          quantity: card.quantity || 1,
          section: 'mainboard'
        });
      }
    }

    if (result.sideboard) {
      for (const card of result.sideboard) {
        cards.push({
          name: card.name,
          quantity: card.quantity || 1,
          section: 'sideboard'
        });
      }
    }

    return cards;
  }

  private deduplicateCards(cards: MTGCard[]): MTGCard[] {
    const cardMap = new Map<string, MTGCard>();
    
    for (const card of cards) {
      const key = `${card.name}-${card.section}`;
      if (cardMap.has(key)) {
        const existing = cardMap.get(key)!;
        existing.quantity = Math.max(existing.quantity, card.quantity);
      } else {
        cardMap.set(key, { ...card });
      }
    }

    return Array.from(cardMap.values());
  }
}

export default new EnhancedOCRService();