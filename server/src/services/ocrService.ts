import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { MTGCard, OCRResult, OpenAIVisionMessage } from '../types';
import { createError } from '../middleware/errorHandler';
import dotenv from 'dotenv';

// Load environment variables before class initialization
dotenv.config();

class OCRService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'TO_BE_SET') {
      console.error('OPENAI_API_KEY is not configured or has default value');
      throw createError('OpenAI API key not configured', 500);
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Process an image and extract MTG card information
   */
  async processImage(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Optimize image for better OCR results
      const optimizedImagePath = await this.optimizeImage(imagePath);
      
      // Convert image to base64
      const base64Image = await this.imageToBase64(optimizedImagePath);
      
      let cards: MTGCard[] = [];

      // Skip EasyOCR, go directly to OpenAI Vision for accuracy
      // EasyOCR is too unreliable on low-res MTG Arena screenshots
      const useOpenAI = true;
      
      if (useOpenAI) {
        if (!this.openai) {
          throw createError('OpenAI client not initialized', 500);
        }
        const messages: OpenAIVisionMessage[] = [
          { role: 'system', content: [{ type: 'text', text: this.getSystemPrompt() }] },
          { role: 'user', content: [
            { type: 'text', text: 'Please extract all Magic: The Gathering cards from this image and return them in the specified JSON format.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' } }
          ]}
        ];
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages as any,
          max_tokens: 2000,
          temperature: 0.1,
        });
        const content = response.choices[0]?.message?.content;
        if (content) {
          const aiCards = this.parseCardsFromResponse(content);
          if (aiCards.length > cards.length) {
            cards = aiCards;
          }
        }
      }
      
      // Clean up optimized image
      if (optimizedImagePath !== imagePath) {
        fs.unlinkSync(optimizedImagePath);
      }

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        cards,
        confidence: this.calculateConfidence(cards),
        processing_time: processingTime,
        warnings: this.generateWarnings(cards),
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        cards: [],
        confidence: 0,
        processing_time: processingTime,
        errors: [error instanceof Error ? error.message : 'Unknown OCR error'],
      };
    }
  }

  /**
   * Run local OCR by delegating to the EasyOCR Python helper.
   * Returns a string content that mimics the JSON block expected by parseCardsFromResponse.
   */
  private runLocalOcr(base64Jpeg: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Try robust solution first, fallback to original script
      const robustScript = path.join(__dirname, '../../../robust_ocr_solution.py');
      const fallbackScript = path.join(__dirname, '../../../discord-bot/ocr_parser_easyocr.py');
      
      const scriptPath = fs.existsSync(robustScript) ? robustScript : fallbackScript;
      
      // Save image temporarily for the robust solution
      const tempPath = `/tmp/mtg_ocr_${Date.now()}.png`;
      const imageBuffer = Buffer.from(base64Jpeg, 'base64');
      fs.writeFileSync(tempPath, imageBuffer);
      
      // Use file path directly for better OCR performance
      const proc = spawn('python3', [scriptPath, tempPath, '--nodejs']);
      let out = '';
      let err = '';
      proc.stdout.on('data', (d) => (out += d.toString()));
      proc.stderr.on('data', (d) => (err += d.toString()));
      proc.on('close', (code) => {
        // Clean up temp file
        try { fs.unlinkSync(tempPath); } catch {}
        
        if (code === 0 && out.trim()) {
          try {
            // If it's the robust solution, convert to expected format
            const result = JSON.parse(out.trim());
            if (result.success && result.sideboard) {
              const formattedJson = {
                sideboard: result.sideboard
              };
              resolve(JSON.stringify(formattedJson));
            } else {
              resolve(out.trim());
            }
          } catch {
            resolve(out.trim());
          }
        } else {
          reject(new Error(err || 'Local OCR failed'));
        }
      });
    });
  }

  /**
   * Optimize image for better OCR results
   */
  private async optimizeImage(imagePath: string): Promise<string> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Only optimize if needed
      if (metadata.width && metadata.width > 2048) {
        const optimizedPath = imagePath.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '_optimized.jpg');
        
        await image
          .resize({ width: 2048, height: undefined, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toFile(optimizedPath);
          
        return optimizedPath;
      }
      
      return imagePath;
    } catch (error) {
      console.warn('Image optimization failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(imagePath: string): Promise<string> {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  }

  /**
   * Get the system prompt for card extraction
   */
  private getSystemPrompt(): string {
    return `You are an expert Magic: The Gathering card recognition system. Your task is to extract card information from deck screenshots or images.

INSTRUCTIONS:
1. Identify all Magic: The Gathering cards visible in the image
2. Extract the card name and quantity for each card
3. Look for patterns like "4x Lightning Bolt" or "Lightning Bolt x4" or just "Lightning Bolt" (assume 1x)
4. Pay attention to sections like "Mainboard", "Sideboard", "Commander"
5. Return ONLY valid JSON in the exact format specified below
6. If you're unsure about a card name, use your best judgment based on MTG card knowledge
7. Ignore non-card text like deck names, usernames, or interface elements

RESPONSE FORMAT (JSON only, no other text):
{
  "mainboard": [
    {"name": "Lightning Bolt", "quantity": 4},
    {"name": "Counterspell", "quantity": 2}
  ],
  "sideboard": [
    {"name": "Red Elemental Blast", "quantity": 2}
  ],
  "commander": [
    {"name": "Teferi, Hero of Dominaria", "quantity": 1}
  ]
}

IMPORTANT:
- Return only the JSON object, no explanations or additional text
- Use exact card names as they appear in Magic: The Gathering
- If no sideboard/commander section is visible, omit those arrays
- Quantities should be numbers, not strings`;
  }

  /**
   * Parse cards from OpenAI response
   */
  private parseCardsFromResponse(content: string): MTGCard[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      const cards: MTGCard[] = [];

      // Process mainboard
      if (parsedData.mainboard && Array.isArray(parsedData.mainboard)) {
        cards.push(...parsedData.mainboard.map((card: any) => ({
          name: card.name.trim(),
          quantity: parseInt(card.quantity) || 1,
        })));
      }

      // Process sideboard
      if (parsedData.sideboard && Array.isArray(parsedData.sideboard)) {
        cards.push(...parsedData.sideboard.map((card: any) => ({
          name: card.name.trim(),
          quantity: parseInt(card.quantity) || 1,
        })));
      }

      // Process commander
      if (parsedData.commander && Array.isArray(parsedData.commander)) {
        cards.push(...parsedData.commander.map((card: any) => ({
          name: card.name.trim(),
          quantity: parseInt(card.quantity) || 1,
        })));
      }

      return cards.filter(card => card.name && card.name.length > 0);
      
    } catch (error) {
      console.error('Failed to parse cards from response:', error);
      console.error('Response content:', content);
      
      // Fallback: try to extract cards using regex
      return this.fallbackCardExtraction(content);
    }
  }

  /**
   * Fallback card extraction using regex patterns
   */
  private fallbackCardExtraction(content: string): MTGCard[] {
    const cards: MTGCard[] = [];
    
    // Common patterns for card listings
    const patterns = [
      /(\d+)x?\s+([A-Za-z][^,\n\r]+)/g,
      /([A-Za-z][^,\n\r]+)\s+x?(\d+)/g,
      /^\s*([A-Za-z][^,\n\r]+?)(?:\s+(\d+))?$/gm,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const quantity = parseInt(match[1]) || parseInt(match[2]) || 1;
        const name = (match[2] || match[1]).trim();
        
        if (name && name.length > 2 && quantity > 0 && quantity <= 20) {
          cards.push({ name, quantity });
        }
      }
    }

    return cards;
  }

  /**
   * Calculate confidence score based on extracted cards
   */
  private calculateConfidence(cards: MTGCard[]): number {
    if (cards.length === 0) return 0;
    
    let score = 0.5; // Base score
    
    // Higher confidence for more cards found
    score += Math.min(cards.length * 0.05, 0.3);
    
    // Higher confidence for reasonable quantities
    const hasReasonableQuantities = cards.every(card => 
      card.quantity >= 1 && card.quantity <= 20
    );
    if (hasReasonableQuantities) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate warnings for the OCR result
   */
  private generateWarnings(cards: MTGCard[]): string[] {
    const warnings: string[] = [];
    
    if (cards.length === 0) {
      warnings.push('No cards detected in the image');
    }
    
    const highQuantityCards = cards.filter(card => card.quantity > 4);
    if (highQuantityCards.length > 0) {
      warnings.push(`High quantities detected: ${highQuantityCards.map(c => c.name).join(', ')}`);
    }
    
    return warnings;
  }
}

export default new OCRService(); 