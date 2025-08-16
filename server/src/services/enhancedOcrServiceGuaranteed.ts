import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

// Load environment variables BEFORE initializing the service
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { MTGCard, OCRResult } from '../types';

/**
 * REFACTORED Enhanced OCR Service - NO FAKE CARDS EVER
 * 
 * This service:
 * 1. NEVER invents or generates cards
 * 2. Retries OCR with different parameters if count is wrong
 * 3. Returns ACTUAL results without forcing 60+15
 * 4. Has a strict mode that returns exactly what was found
 */
export class EnhancedOCRServiceGuaranteed {
  private readonly openai: OpenAI | null = null;
  private readonly MIN_IMAGE_SIZE = 5_000; // 5KB minimum (lowered for testing)
  private readonly MIN_RESOLUTION = 800;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly TIMEOUT_MS = 30_000;
  
  // Basic lands for DETECTION ONLY (not generation)
  private readonly BASIC_LANDS: ReadonlyArray<string> = Object.freeze([
    'Plains', 'Island', 'Swamp', 'Mountain', 'Forest'
  ]);

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'TO_BE_SET') {
      this.openai = new OpenAI({ apiKey });
      console.log('✅ Enhanced OCR Service initialized with OpenAI');
    } else {
      console.log('⚠️ Enhanced OCR Service initialized without OpenAI');
    }
  }

  /**
   * Main entry point - Returns ACTUAL OCR results, no fake cards
   */
  public async processImage(imagePath: string, strictMode: boolean = false): Promise<OCRResult> {
    const startTime = Date.now();
    console.log('🎯 Starting REAL OCR Pipeline - NO FAKE CARDS...');
    console.log(`📁 Processing image: ${imagePath}`);
    console.log(`⚙️ Mode: ${strictMode ? 'STRICT (no retries)' : 'RETRY (with improvements)'}`);

    try {
      // Step 1: Validate image
      const validationResult = await this.validateImage(imagePath);
      if (!validationResult.valid) {
        return {
          success: false,
          cards: [],
          confidence: 0,
          processing_time: Date.now() - startTime,
          errors: [validationResult.error || 'Image validation failed'],
          warnings: []
        };
      }

      // Step 2: Detect format
      const format = await this.detectFormat(imagePath);
      console.log(`🎮 Detected format: ${format}`);

      // Step 3: Process with OCR (with retries if not strict mode)
      let result: OCRResult;
      if (strictMode) {
        // Strict mode: single attempt, return exact results
        result = await this.singleOCRAttempt(imagePath, format);
      } else {
        // Retry mode: multiple attempts with different parameters
        result = await this.ocrWithRetries(imagePath, format);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ OCR completed in ${processingTime}ms`);

      // Add final counts to result
      const counts = this.calculateCounts(result.cards);
      console.log(`📊 Final counts: ${counts.mainboard} mainboard, ${counts.sideboard} sideboard`);
      
      if (counts.mainboard !== 60 || counts.sideboard !== 15) {
        result.warnings = [
          ...(result.warnings || []),
          `Found ${counts.mainboard}/60 mainboard and ${counts.sideboard}/15 sideboard cards`
        ];
      }

      return {
        ...result,
        processing_time: processingTime,
        format
      };

    } catch (error) {
      console.error('❌ OCR error:', error);
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Single OCR attempt without retries (for strict mode)
   */
  private async singleOCRAttempt(imagePath: string, format: string): Promise<OCRResult> {
    if (!this.openai) {
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: 0,
        errors: ['OpenAI not configured']
      };
    }

    const cards = await this.callOpenAIVision(imagePath, format, 1);
    const counts = this.calculateCounts(cards);
    
    return {
      success: cards.length > 0,
      cards,
      confidence: this.calculateConfidence(cards, counts),
      processing_time: 0,
      warnings: []
    };
  }

  /**
   * OCR with multiple retry attempts using different parameters
   */
  private async ocrWithRetries(imagePath: string, format: string): Promise<OCRResult> {
    if (!this.openai) {
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: 0,
        errors: ['OpenAI not configured']
      };
    }

    let bestResult: MTGCard[] = [];
    let bestCounts = { mainboard: 0, sideboard: 0, total: 0 };
    const warnings: string[] = [];

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      console.log(`🔄 OCR Attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}...`);
      
      // Try with different parameters on each attempt
      const cards = await this.callOpenAIVision(imagePath, format, attempt);
      const counts = this.calculateCounts(cards);
      
      console.log(`   Found: ${counts.mainboard} mainboard, ${counts.sideboard} sideboard`);

      // If we found the perfect count, return immediately
      if (counts.mainboard === 60 && counts.sideboard === 15) {
        console.log('   ✅ Perfect count achieved!');
        return {
          success: true,
          cards,
          confidence: 1.0,
          processing_time: 0,
          warnings: attempt > 1 ? [`Required ${attempt} attempts to get correct count`] : []
        };
      }

      // Keep the best result (closest to 60+15)
      const currentScore = Math.abs(60 - counts.mainboard) + Math.abs(15 - counts.sideboard);
      const bestScore = Math.abs(60 - bestCounts.mainboard) + Math.abs(15 - bestCounts.sideboard);
      
      if (cards.length > bestResult.length || currentScore < bestScore) {
        bestResult = cards;
        bestCounts = counts;
      }

      // Special focus on lands for later attempts
      if (attempt >= 3) {
        console.log('   🎯 Focusing on land detection...');
        warnings.push(`Attempt ${attempt}: Special focus on land detection`);
      }
    }

    // Return the best result we found
    warnings.push(`Best result after ${this.MAX_RETRY_ATTEMPTS} attempts`);
    
    return {
      success: bestResult.length > 0,
      cards: bestResult,
      confidence: this.calculateConfidence(bestResult, bestCounts),
      processing_time: 0,
      warnings
    };
  }

  /**
   * Call OpenAI Vision API with attempt-specific parameters
   */
  private async callOpenAIVision(imagePath: string, format: string, attempt: number): Promise<MTGCard[]> {
    if (!this.openai) return [];

    try {
      const base64Image = fs.readFileSync(imagePath).toString('base64');
      const prompt = this.buildPrompt(format, attempt);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: attempt >= 3 ? 'high' : 'auto' // Higher detail for later attempts
              }
            }
          ]
        }],
        max_tokens: 4000,
        temperature: attempt === 1 ? 0.1 : 0.2 // Slightly higher temp for retries
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      return this.parseOpenAIResponse(content);

    } catch (error) {
      console.error(`   ❌ OpenAI call failed:`, error);
      return [];
    }
  }

  /**
   * Build prompt based on format and attempt number
   */
  private buildPrompt(format: string, attempt: number): string {
    let prompt = `Extract ALL Magic: The Gathering cards from this ${format} screenshot.\n`;
    
    // Base requirements
    prompt += `CRITICAL REQUIREMENTS:
1. List EVERY card you can see
2. Count quantities accurately (look for x2, x3, x4 indicators)
3. Distinguish between mainboard and sideboard
4. DO NOT add cards that aren't visible\n\n`;

    // Format-specific instructions
    if (format === 'arena') {
      prompt += `ARENA SPECIFIC:
- Main deck is in the center area
- Sideboard appears on the right side
- Small numbers show quantities
- Mana curve at bottom\n\n`;
    } else if (format === 'mtgo') {
      prompt += `MTGO SPECIFIC:
- Text list format
- Each line = 1 card entry
- Sideboard section clearly labeled
- IMPORTANT: Basic lands are often undercounted\n\n`;
    }

    // Attempt-specific focus
    if (attempt >= 3) {
      prompt += `SPECIAL FOCUS FOR THIS ATTEMPT:
- Pay EXTRA attention to basic lands (Plains, Island, Swamp, Mountain, Forest)
- Look carefully at the bottom of the deck list for lands
- Double-check land quantities - they're often higher than initially visible
- In MTGO, lands might be grouped or abbreviated\n\n`;
    }

    if (attempt >= 4) {
      prompt += `ENHANCED DETECTION:
- Zoom in mentally on each section
- Check for partially visible cards at edges
- Look for cards that might be cut off
- Verify sideboard is complete (should be 15 cards)\n\n`;
    }

    prompt += `Return ONLY valid JSON:
{
  "mainboard": [
    {"name": "Card Name", "quantity": 4}
  ],
  "sideboard": [
    {"name": "Sideboard Card", "quantity": 3}
  ]
}`;

    return prompt;
  }

  /**
   * Parse OpenAI response into cards array
   */
  private parseOpenAIResponse(content: string): MTGCard[] {
    try {
      // Clean the response
      let cleanContent = content
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();

      // Find JSON object
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      const cards: MTGCard[] = [];

      // Process mainboard
      if (parsed.mainboard && Array.isArray(parsed.mainboard)) {
        for (const card of parsed.mainboard) {
          if (card.name && card.quantity > 0) {
            cards.push({
              name: card.name.trim(),
              quantity: Math.max(1, card.quantity),
              section: 'mainboard'
            });
          }
        }
      }

      // Process sideboard
      if (parsed.sideboard && Array.isArray(parsed.sideboard)) {
        for (const card of parsed.sideboard) {
          if (card.name && card.quantity > 0) {
            cards.push({
              name: card.name.trim(),
              quantity: Math.max(1, card.quantity),
              section: 'sideboard'
            });
          }
        }
      }

      return cards;

    } catch (error) {
      console.error('   Failed to parse response:', error);
      return [];
    }
  }

  /**
   * Validate image file
   */
  private async validateImage(imagePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!fs.existsSync(imagePath)) {
        return { valid: false, error: 'Image file not found' };
      }

      const stats = fs.statSync(imagePath);
      if (stats.size < this.MIN_IMAGE_SIZE) {
        return { valid: false, error: `Image too small (${stats.size} bytes)` };
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        return { valid: false, error: 'Unable to read image dimensions' };
      }

      if (metadata.width < this.MIN_RESOLUTION && metadata.height < this.MIN_RESOLUTION) {
        return { valid: false, error: `Resolution too low: ${metadata.width}x${metadata.height}` };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: 'Failed to validate image' };
    }
  }

  /**
   * Detect format from image
   */
  private async detectFormat(imagePath: string): Promise<string> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) return 'arena';
      
      const aspectRatio = metadata.width / metadata.height;
      
      if (aspectRatio > 2.0) return 'mtgo';
      if (aspectRatio > 1.5 && aspectRatio < 1.8) return 'arena';
      if (aspectRatio < 1.2) return 'paper';
      
      return 'arena';
    } catch {
      return 'arena';
    }
  }

  /**
   * Calculate card counts
   */
  private calculateCounts(cards: MTGCard[]): { mainboard: number; sideboard: number; total: number } {
    const mainboard = cards
      .filter(c => c.section !== 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    const sideboard = cards
      .filter(c => c.section === 'sideboard')
      .reduce((sum, c) => sum + c.quantity, 0);
    
    return { mainboard, sideboard, total: mainboard + sideboard };
  }

  /**
   * Calculate confidence score based on results
   */
  private calculateConfidence(cards: MTGCard[], counts: { mainboard: number; sideboard: number }): number {
    if (cards.length === 0) return 0;
    
    // Perfect match = 100% confidence
    if (counts.mainboard === 60 && counts.sideboard === 15) return 1.0;
    
    // Calculate based on how close we are to target
    const mainboardScore = Math.max(0, 1 - Math.abs(60 - counts.mainboard) / 60);
    const sideboardScore = Math.max(0, 1 - Math.abs(15 - counts.sideboard) / 15);
    
    return (mainboardScore * 0.7 + sideboardScore * 0.3) * 0.9; // Max 90% if not perfect
  }
}

// Export singleton instance
export default new EnhancedOCRServiceGuaranteed();