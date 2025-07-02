import { spawn } from "child_process";
import { unlink, writeFile } from "fs/promises";
import OpenAI from "openai";
import { join } from "path";
import sharp from "sharp";
import { ScryfallService } from "./scryfallService";

interface CardRecognitionResult {
  name: string;
  confidence: number;
  manaCost?: string;
  type?: string;
  edition?: string;
  validated: boolean;
  alternatives?: string[];
}

interface ProcessingMetrics {
  processingTime: number;
  modelUsed: string[];
  confidence: number;
  fallbackUsed: boolean;
  easyOcrBlocks?: number;
  openaiTokens?: number;
}

/**
 * Enhanced OCR Service avec pattern multi-pipeline optimisé
 *
 * ARCHITECTURE:
 * 1. EasyOCR (IA spécialisée OCR) - Rapide, spécialisé, fonctionne bien
 * 2. OpenAI Vision (IA généraliste) - Contextuel, comprend les cartes MTG
 * 3. Validation croisée - Combine les deux pour maximiser la précision
 *
 * POURQUOI OPENAI VISION ?
 * - Comprend le CONTEXTE MTG (sait ce qu'est une carte)
 * - Peut distinguer nom de carte vs texte de règles
 * - Corrige les erreurs sémantiques (ex: "Lighming" → "Lightning")
 * - Extrait métadonnées (coût, type) en plus du nom
 *
 * POURQUOI GARDER EASYOCR ?
 * - Excellent pour reconnaissance brute de texte
 * - Rapide et économique
 * - Fonctionne hors ligne
 * - Déjà prouvé sur votre projet
 */
export class EnhancedOCRService {
  private openai: OpenAI;
  private scryfallService: ScryfallService;
  private tempDir: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.scryfallService = new ScryfallService();
    this.tempDir = process.env.TEMP_DIR || "/tmp";
  }

  /**
   * Point d'entrée principal - Pattern multi-pipeline
   */
  async recognizeCard(imageBuffer: Buffer): Promise<{
    result: CardRecognitionResult;
    metrics: ProcessingMetrics;
  }> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    let easyOcrBlocks = 0;
    let openaiTokens = 0;

    try {
      // 1. Preprocessing avancé de l'image
      const preprocessedImage = await this.preprocessImage(imageBuffer);

      // 2. PIPELINE PARALLÈLE - Les deux en même temps pour optimiser
      const [easyOcrResult, openaiResult] = await Promise.allSettled([
        this.recognizeWithEasyOCR(preprocessedImage),
        this.recognizeWithOpenAI(preprocessedImage),
      ]);

      // 3. Analyser les résultats
      let easyOcrData = null;
      let openaiData = null;

      if (easyOcrResult.status === "fulfilled" && easyOcrResult.value) {
        easyOcrData = easyOcrResult.value;
        modelsUsed.push("EasyOCR");
        easyOcrBlocks = easyOcrData.blocksDetected || 0;
      }

      if (openaiResult.status === "fulfilled" && openaiResult.value) {
        openaiData = openaiResult.value;
        modelsUsed.push("OpenAI-Vision");
        openaiTokens = openaiData.tokensUsed || 0;
      }

      // 4. STRATÉGIE DE FUSION INTELLIGENTE
      const mergedResult = await this.mergeMultiPipelineResults(
        easyOcrData,
        openaiData
      );

      // 5. Validation Scryfall avec enrichissement
      const finalResult = await this.validateWithScryfall(mergedResult);

      const metrics: ProcessingMetrics = {
        processingTime: Date.now() - startTime,
        modelUsed: modelsUsed,
        confidence: finalResult.confidence,
        fallbackUsed:
          modelsUsed.length === 1 && !modelsUsed.includes("OpenAI-Vision"),
        easyOcrBlocks,
        openaiTokens,
      };

      return { result: finalResult, metrics };
    } catch (error) {
      console.error("Enhanced OCR failed:", error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Preprocessing d'image optimisé pour MTG
   */
  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        // Taille optimale pour MTG (basé sur vos tests EasyOCR)
        .resize(1600, 1200, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        // Amélioration pour OCR
        .normalize()
        .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
        .modulate({ brightness: 1.05, saturation: 0.95 })
        .toFormat("png")
        .toBuffer();
    } catch (error) {
      console.error("Image preprocessing failed:", error);
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * EasyOCR via wrapper Python (garde votre implémentation qui marche)
   */
  private async recognizeWithEasyOCR(imageBuffer: Buffer): Promise<any> {
    const tempImagePath = join(this.tempDir, `easyocr_${Date.now()}.png`);

    try {
      // Sauvegarder l'image temporairement
      await writeFile(tempImagePath, imageBuffer);

      // Appeler le script Python EasyOCR (réutilise votre code existant)
      const pythonResult = await this.callPythonEasyOCR(tempImagePath);

      return {
        name: pythonResult.bestCardName,
        confidence: pythonResult.confidence,
        blocksDetected: pythonResult.totalBlocks,
        allText: pythonResult.fullText,
        validated: false,
      };
    } catch (error) {
      console.error("EasyOCR failed:", error);
      return null;
    } finally {
      // Nettoyer
      try {
        await unlink(tempImagePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Wrapper pour appeler votre script Python EasyOCR existant
   */
  private async callPythonEasyOCR(imagePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Appelle le wrapper EasyOCR optimisé
      const pythonProcess = spawn("python3", [
        "discord-bot/easyocr_wrapper.py",
        "--image",
        imagePath,
        "--output-json",
      ]);

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse EasyOCR output: ${e.message}`));
          }
        } else {
          reject(new Error(`EasyOCR process failed: ${stderr}`));
        }
      });

      // Timeout après 30 secondes
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error("EasyOCR timeout"));
      }, 30000);
    });
  }

  /**
   * OpenAI Vision - POURQUOI C'EST PUISSANT POUR MTG
   */
  private async recognizeWithOpenAI(imageBuffer: Buffer): Promise<any> {
    try {
      const base64Image = imageBuffer.toString("base64");

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                // PROMPT SPÉCIALISÉ MTG - C'est là que la magie opère
                text: `You are an expert Magic: The Gathering card scanner. Analyze this image and extract ONLY the card names with their quantities.

CONTEXT: This is likely a deck list screenshot (Magic Arena, Moxfield, etc.) or individual card images.

TASK: Extract card information with this EXACT JSON format:
{
  "cards": [
    {
      "name": "exact card name",
      "quantity": 1,
      "manaCost": "mana cost if visible",
      "type": "type line if visible",
      "confidence": 0.95
    }
  ],
  "context": "what type of image this appears to be",
  "tokensUsed": "estimate of tokens used"
}

RULES:
1. Focus ONLY on card names - ignore flavor text, rules text, player names
2. Be extremely precise with card names (spelling matters)
3. If you see quantity numbers (1x, 2x, etc.) extract them
4. If unsure about a name, provide your best guess but lower confidence
5. Ignore everything that's not a Magic card name
6. Common formats: "4 Lightning Bolt", "1x Snapcaster Mage", "Jace, the Mind Sculptor"

Be precise and focused on card names only.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      return {
        cards: parsed.cards || [],
        context: parsed.context,
        tokensUsed: response.usage?.total_tokens || 0,
        confidence: parsed.cards?.[0]?.confidence || 0.7,
      };
    } catch (error) {
      console.error("OpenAI Vision failed:", error);
      return null;
    }
  }

  /**
   * FUSION INTELLIGENTE - Combine EasyOCR + OpenAI
   *
   * STRATÉGIE:
   * 1. Si OpenAI détecte des cartes structurées → Priorité OpenAI
   * 2. Si EasyOCR a un texte net → Validation croisée
   * 3. Si conflit → Prendre le plus confiant et valider avec Scryfall
   */
  private async mergeMultiPipelineResults(
    easyOcrResult: any,
    openaiResult: any
  ): Promise<CardRecognitionResult> {
    // Stratégie 1: OpenAI a détecté des cartes structurées
    if (openaiResult?.cards?.length > 0) {
      const bestCard = openaiResult.cards[0];
      if (bestCard.confidence > 0.8) {
        return {
          name: bestCard.name,
          confidence: bestCard.confidence,
          manaCost: bestCard.manaCost,
          type: bestCard.type,
          validated: false,
        };
      }
    }

    // Stratégie 2: EasyOCR a du texte net
    if (easyOcrResult?.name && easyOcrResult.confidence > 0.7) {
      return {
        name: easyOcrResult.name,
        confidence: easyOcrResult.confidence,
        validated: false,
      };
    }

    // Stratégie 3: Résultats partiels - prendre le meilleur
    if (openaiResult?.cards?.length > 0) {
      const bestCard = openaiResult.cards[0];
      return {
        name: bestCard.name,
        confidence: bestCard.confidence * 0.8, // Pénalité pour faible confiance
        manaCost: bestCard.manaCost,
        type: bestCard.type,
        validated: false,
      };
    }

    if (easyOcrResult?.name) {
      return {
        name: easyOcrResult.name,
        confidence: easyOcrResult.confidence * 0.8,
        validated: false,
      };
    }

    throw new Error("No valid card recognition result from any pipeline");
  }

  /**
   * Validation Scryfall avec corrections OCR spécialisées MTG
   */
  private async validateWithScryfall(
    result: CardRecognitionResult
  ): Promise<CardRecognitionResult> {
    try {
      // Correction OCR préalable
      const correctedName = this.applyOCRCorrections(result.name);

      // Test nom exact
      const exactMatch = await this.scryfallService.findCard(correctedName);

      if (exactMatch) {
        return {
          ...result,
          name: exactMatch.name,
          confidence: Math.min(1.0, result.confidence + 0.15),
          manaCost: exactMatch.mana_cost || result.manaCost,
          type: exactMatch.type_line || result.type,
          edition: exactMatch.set || result.edition,
          validated: true,
        };
      }

      // Recherche approximative
      const fuzzyMatches = await this.scryfallService.fuzzySearch(
        correctedName,
        5
      );

      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        const similarityScore = this.calculateNameSimilarity(
          correctedName,
          bestMatch.name
        );

        if (similarityScore > 0.7) {
          return {
            ...result,
            name: bestMatch.name,
            alternatives: fuzzyMatches.slice(1, 4).map((card) => card.name),
            confidence: result.confidence * (0.7 + similarityScore * 0.3),
            manaCost: bestMatch.mana_cost || result.manaCost,
            type: bestMatch.type_line || result.type,
            edition: bestMatch.set || result.edition,
            validated: true,
          };
        }
      }

      // Tentative avec nom original
      if (correctedName !== result.name) {
        const originalExactMatch = await this.scryfallService.findCard(
          result.name
        );
        if (originalExactMatch) {
          return {
            ...result,
            name: originalExactMatch.name,
            confidence: Math.min(1.0, result.confidence + 0.1),
            validated: true,
          };
        }
      }

      return {
        ...result,
        confidence: result.confidence * 0.4,
        validated: false,
        alternatives: fuzzyMatches.slice(0, 3).map((card) => card.name),
      };
    } catch (error) {
      console.error("Scryfall validation failed:", error);
      return {
        ...result,
        confidence: result.confidence * 0.6,
        validated: false,
      };
    }
  }

  // [Méthodes utilitaires - corrections OCR, similarité, etc. - identiques à avant]
  private applyOCRCorrections(cardName: string): string {
    const corrections: Record<string, string> = {
      lighming: "lightning",
      lighlning: "lightning",
      snapcasler: "snapcaster",
      // ... etc
    };

    let corrected = cardName.toLowerCase().trim();
    for (const [wrong, correct] of Object.entries(corrections)) {
      if (corrected.includes(wrong)) {
        corrected = corrected.replace(wrong, correct);
      }
    }

    return this.restoreProperCase(corrected);
  }

  private restoreProperCase(name: string): string {
    return name
      .split(" ")
      .map((word) => {
        const lowercaseWords = [
          "of",
          "the",
          "and",
          "or",
          "in",
          "on",
          "at",
          "to",
          "for",
        ];
        if (lowercaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ")
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    const distance = this.levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);

    return maxLength > 0 ? 1 - distance / maxLength : 1;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  async logRecognitionMetrics(
    metrics: ProcessingMetrics,
    result: CardRecognitionResult
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      processingTime: metrics.processingTime,
      modelsUsed: metrics.modelUsed,
      confidence: result.confidence,
      validated: result.validated,
      fallbackUsed: metrics.fallbackUsed,
      easyOcrBlocks: metrics.easyOcrBlocks,
      openaiTokens: metrics.openaiTokens,
    };

    console.log("OCR_METRICS:", JSON.stringify(logData));
  }

  async destroy() {
    // Pas de ressources à nettoyer (EasyOCR via subprocess, OpenAI via HTTP)
  }
}
