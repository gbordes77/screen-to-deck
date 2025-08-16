import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { MTGCard, OCRResult, OpenAIVisionMessage } from '../types';
import { createError } from '../middleware/errorHandler';
import scryfallService from './scryfallService';
import dotenv from 'dotenv';

// Load environment variables before class initialization
dotenv.config();

class OCRService {
  private openai: OpenAI | null = null;
  private lastOcrRawResult: any = null; // Pour stocker le résultat brut de l'OCR

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

      // ⚠️ CRITICAL: NEVER BYPASS EasyOCR WITHOUT EXPLICIT AUTHORIZATION
      // EasyOCR is PRIMARY engine, OpenAI is FALLBACK only
      // Changing this breaks sideboard detection!
      
      // STEP 1: Try EasyOCR first (PRIMARY ENGINE)
      try {
        console.log('🐍 Running EasyOCR (PRIMARY OCR ENGINE)...');
        const easyOcrResult = await this.runLocalOcr(base64Image);
        // Stocker le résultat brut pour extraire mainboard/sideboard
        try {
          this.lastOcrRawResult = JSON.parse(easyOcrResult);
        } catch (e) {
          this.lastOcrRawResult = null;
        }
        cards = this.parseCardsFromResponse(easyOcrResult);
        
        // Calculate confidence
        const confidence = this.calculateConfidence(cards);
        console.log(`📊 EasyOCR confidence: ${confidence}%`);
        
        // STEP 2: Use OpenAI if confidence < 60% (EasyOCR a souvent des problèmes)
        if (confidence < 60 && this.openai) {
          console.log('⚠️ Low confidence, using OpenAI as fallback...');
          const openAiCards = await this.runOpenAIFallback(base64Image);
          if (openAiCards.length > cards.length) {
            cards = openAiCards;
          }
        }
      } catch (easyOcrError) {
        console.error('❌ EasyOCR failed:', easyOcrError);
        // Fallback to OpenAI if EasyOCR fails
        if (this.openai) {
          console.log('🤖 Falling back to OpenAI Vision...');
          cards = await this.runOpenAIFallback(base64Image);
        } else {
          throw createError('OCR failed and no OpenAI fallback available', 500);
        }
      }
      
      // OLD CODE - KEEP DISABLED
      const useOpenAI = false; // NEVER change without authorization
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

      // STEP 3: Validation Scryfall OBLIGATOIRE (Règle #6)
      console.log('🔍 Validating cards with Scryfall...');
      const validatedCards = await this.validateWithScryfall(cards);
      
      // STEP 4: Never Give Up Mode™ - Garantir 60+15 cartes
      const finalCards = await this.neverGiveUpMode(validatedCards, base64Image);
      
      const processingTime = Date.now() - startTime;
      
      // Séparer mainboard et sideboard si possible
      const mainboard: MTGCard[] = [];
      const sideboard: MTGCard[] = [];
      
      // Si on a déjà la séparation depuis EasyOCR/OpenAI
      let hasSeparation = false;
      try {
        const lastResult = this.lastOcrRawResult;
        if (lastResult && typeof lastResult === 'object') {
          if (lastResult.mainboard && Array.isArray(lastResult.mainboard)) {
            mainboard.push(...lastResult.mainboard);
            hasSeparation = true;
          }
          if (lastResult.sideboard && Array.isArray(lastResult.sideboard)) {
            sideboard.push(...lastResult.sideboard);
            hasSeparation = true;
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
      
      // Si pas de séparation, utiliser l'ancienne méthode
      if (!hasSeparation) {
        // Utiliser les cartes finales validées
        const cardsToSplit = finalCards;
        
        // Essayer de détecter le sideboard dans les cartes
        let sideboardStartIndex = -1;
        for (let i = 0; i < cardsToSplit.length; i++) {
          // Si on trouve une carte qui s'appelle "Sideboard" ou similaire
          if (cardsToSplit[i].name.toLowerCase().includes('sideboard')) {
            sideboardStartIndex = i + 1;
            break;
          }
        }
        
        if (sideboardStartIndex > 0) {
          mainboard.push(...cardsToSplit.slice(0, sideboardStartIndex - 1));
          sideboard.push(...cardsToSplit.slice(sideboardStartIndex));
        } else {
          // Par défaut, considérer les 60 premières comme mainboard
          const mainCount = Math.min(60, cardsToSplit.length);
          mainboard.push(...cardsToSplit.slice(0, mainCount));
          if (cardsToSplit.length > mainCount) {
            sideboard.push(...cardsToSplit.slice(mainCount));
          }
        }
      }
      
      return {
        success: true,
        cards: finalCards, // Legacy field pour compatibilité
        mainboard,
        sideboard,
        confidence: this.calculateConfidence(finalCards),
        processing_time: processingTime,
        warnings: this.generateWarnings(finalCards),
        guaranteed: mainboard.length === 60 && sideboard.length === 15,
        format: this.detectFormat(imagePath), // MTGA/MTGO detection
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
      // Utiliser le wrapper optimisé pour MTGA
      const mtgaWrapper = path.join(__dirname, '../../../easyocr_mtga_wrapper.py');
      const smartWrapper = path.join(__dirname, '../../../easyocr_smart_wrapper.py');
      const workingWrapper = path.join(__dirname, '../../../easyocr_working_wrapper.py');
      const fallbackWrapper = path.join(__dirname, '../../../working_ocr_wrapper.py');
      const stdinScript = path.join(__dirname, '../../../ocr_stdin_wrapper.py');
      
      // Utiliser le nouveau wrapper final avec support stdin complet
      const finalWrapper = path.join(__dirname, '../../../easyocr_stdin_final.py');
      const mtgaFixed = path.join(__dirname, '../../../easyocr_mtga_fixed.py');
      
      // Priorité: MTGA Fixed > Final wrapper > MTGA wrapper > smart wrapper > autres
      let scriptPath = path.join(__dirname, '../../../discord-bot/ocr_parser_easyocr.py');
      if (fs.existsSync(mtgaFixed)) {
        scriptPath = mtgaFixed;
        console.log('🎮 Using MTGA FIXED EasyOCR wrapper with zone detection');
      } else if (fs.existsSync(finalWrapper)) {
        scriptPath = finalWrapper;
        console.log('✅ Using FINAL EasyOCR wrapper with full stdin support');
      } else if (fs.existsSync(mtgaWrapper)) {
        scriptPath = mtgaWrapper;
        console.log('🎮 Using MTGA-optimized EasyOCR wrapper');
      } else if (fs.existsSync(smartWrapper)) {
        scriptPath = smartWrapper;
        console.log('🧠 Using smart EasyOCR wrapper with UI filtering');
      } else if (fs.existsSync(workingWrapper)) {
        scriptPath = workingWrapper;
        console.log('🎯 Using new EasyOCR working wrapper');
      } else if (fs.existsSync(fallbackWrapper)) {
        scriptPath = fallbackWrapper;
        console.log('🔄 Using fallback wrapper');
      } else if (fs.existsSync(stdinScript)) {
        scriptPath = stdinScript;
        console.log('📝 Using stdin wrapper');
      }
      
      const proc = spawn('python3', [scriptPath, '--stdin-base64']);
      let out = '';
      let err = '';
      
      proc.stdout.on('data', (d) => (out += d.toString()));
      proc.stderr.on('data', (d) => (err += d.toString()));
      
      proc.on('close', (code) => {
        if (code === 0 && out.trim()) {
          resolve(out.trim());
        } else {
          // Si EasyOCR échoue, retourner un JSON vide pour forcer OpenAI
          console.log('⚠️ EasyOCR returned empty, will use OpenAI fallback');
          resolve('{"mainboard": [], "sideboard": []}');
        }
      });
      
      proc.on('error', (error) => {
        console.error('❌ Failed to spawn Python process:', error);
        resolve('{"mainboard": [], "sideboard": []}');
      });
      
      // Envoyer l'image base64 via stdin
      proc.stdin.write(base64Jpeg);
      proc.stdin.end();
    });
  }

  /**
   * Run OpenAI Vision as FALLBACK only (never as primary)
   */
  private async runOpenAIFallback(base64Image: string): Promise<MTGCard[]> {
    if (!this.openai) {
      throw createError('OpenAI client not initialized', 500);
    }
    
    const messages: OpenAIVisionMessage[] = [
      { role: 'system', content: [{ type: 'text', text: this.getSystemPrompt() }] },
      { role: 'user', content: [
        { type: 'text', text: 'Extract ONLY Magic: The Gathering card names from the deck list area. IGNORE all UI elements like Home, Profile, Store, etc. Focus on the CENTER/RIGHT area where the actual deck list is displayed. Look for "Sideboard" to separate mainboard from sideboard. DO NOT include menu items or buttons as cards!' },
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
      return this.parseCardsFromResponse(content);
    }
    return [];
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
    return `You are an expert Magic: The Gathering card recognition system. Your task is to extract ONLY card information from deck screenshots.

⚠️ CRITICAL - IGNORE UI ELEMENTS:
DO NOT include ANY of these interface elements as cards:
- Menu items: Home, Profile, Packs, Store, Mastery, Play, Decks, Settings, Craft, Search
- Buttons: Import, Export, Save, Cancel, Done, Edit, Delete, Submit, Ready
- Format labels: Standard, Historic, Explorer, Alchemy, Brawl, Draft, Sealed
- UI text: Best of Three, Best of One, Main Deck, Deck Name, Total, Cards
- Navigation: Back, Next, Previous, Close, Exit, Help
- Game stats: Victory, Defeat, Draw, Rank, Mythic, Diamond, Platinum, Gold, Silver
- IGNORE any text that is NOT a Magic card name!

WHAT TO EXTRACT:
1. ONLY actual Magic: The Gathering card names
2. Card names typically contain:
   - Creature/spell names (e.g., "Lightning Bolt", "Counterspell")
   - Lands (e.g., "Forest", "Island", "Mountain", "Plains", "Swamp")
   - Planeswalkers (e.g., names starting with capital letters)
3. Look for quantity patterns: "4 Lightning Bolt", "2x Counterspell", etc.

MTGA/MTGO SPECIFIC:
1. In MTGA: Deck list is in the CENTER/RIGHT area, NOT the left menu
2. Look for "Sideboard" label - it separates mainboard (60 cards) from sideboard (15 cards)
3. Focus on the deck list area, ignore all surrounding UI

VALIDATION RULES:
- A valid card name is typically 2-5 words
- Card names do NOT include UI actions or menu items
- If unsure whether something is a card, check if it sounds like a spell/creature/land

RESPONSE FORMAT (JSON only):
{
  "mainboard": [
    {"name": "Lightning Bolt", "quantity": 4},
    {"name": "Forest", "quantity": 8}
  ],
  "sideboard": [
    {"name": "Naturalize", "quantity": 2}
  ]
}

IMPORTANT:
- Return ONLY card names, NO UI elements
- Total should be ~75 cards (60 main + 15 side)
- If text doesn't look like a card name, DON'T include it`;
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
  
  /**
   * Validate cards with Scryfall (Règle #6)
   */
  private async validateWithScryfall(cards: MTGCard[]): Promise<MTGCard[]> {
    if (cards.length === 0) return [];
    
    try {
      const { validatedCards } = await scryfallService.validateAndEnrichCards(cards);
      return validatedCards;
    } catch (error) {
      console.error('⚠️ Scryfall validation failed, using original cards:', error);
      return cards;
    }
  }
  
  /**
   * Never Give Up Mode™ - Garantit 60+15 cartes (Règle #6)
   */
  private async neverGiveUpMode(cards: MTGCard[], base64Image: string): Promise<MTGCard[]> {
    // Compter les cartes actuelles
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    
    // Si on a exactement 75 cartes, c'est parfait
    if (totalCards === 75) {
      console.log('✅ Perfect! Exactly 75 cards detected');
      return cards;
    }
    
    // Si on a moins de 75 cartes, essayer de compléter
    if (totalCards < 75) {
      console.log(`⚠️ Only ${totalCards} cards detected, trying to find missing cards...`);
      
      // Stratégie 1: Vérifier les basic lands (souvent mal comptées)
      const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
      const lands = cards.filter(c => 
        basicLands.some(land => c.name.includes(land)) ||
        c.name.includes('Snow-Covered')
      );
      
      if (lands.length > 0 && totalCards < 60) {
        // Ajuster les quantités de terrains pour arriver à 60
        const missingCards = 60 - totalCards;
        if (lands[0]) {
          console.log(`🎯 Adding ${missingCards} to ${lands[0].name}`);
          lands[0].quantity += missingCards;
        }
      }
    }
    
    // Si on a plus de 75 cartes, filtrer les doublons
    if (totalCards > 75) {
      console.log(`⚠️ ${totalCards} cards detected, removing duplicates...`);
      
      // Fusionner les doublons
      const cardMap = new Map<string, MTGCard>();
      for (const card of cards) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.quantity += card.quantity;
        } else {
          cardMap.set(card.name, { ...card });
        }
      }
      
      return Array.from(cardMap.values());
    }
    
    return cards;
  }
  
  /**
   * Detect format (MTGA/MTGO) from image
   */
  private detectFormat(imagePath: string): string {
    // Simple heuristique basée sur le nom du fichier
    const filename = path.basename(imagePath).toLowerCase();
    if (filename.includes('mtga')) return 'mtga';
    if (filename.includes('mtgo')) return 'mtgo';
    if (filename.includes('arena')) return 'mtga';
    if (filename.includes('online')) return 'mtgo';
    return 'unknown';
  }
}

export default new OCRService(); 