import * as levenshtein from 'fast-levenshtein';
import { metaphone, soundex } from 'talisman/phonetics';
import { jaroWinkler } from 'talisman/metrics/jaro-winkler';

interface MatchResult {
  name: string;
  score: number;
  method: string;
  corrections?: string[];
}

interface FuzzyMatchOptions {
  threshold?: number;
  maxResults?: number;
  usePhonetic?: boolean;
  useTrigrams?: boolean;
  useLevenshtein?: boolean;
  useJaroWinkler?: boolean;
  weights?: {
    exact?: number;
    levenshtein?: number;
    jaroWinkler?: number;
    phonetic?: number;
    trigram?: number;
  };
}

export class FuzzyMatchingService {
  private readonly ocrCorrections: Map<string, string>;
  private readonly commonMisspellings: Map<string, string>;
  private readonly phoneticCache: Map<string, string> = new Map();
  private readonly trigramCache: Map<string, Set<string>> = new Map();

  constructor() {
    // Common OCR mistakes for MTG cards
    this.ocrCorrections = new Map([
      // Character substitutions
      ['0', 'o'],
      ['1', 'l'],
      ['5', 's'],
      ['8', 'b'],
      ['6', 'g'],
      ['9', 'g'],
      ['|', 'l'],
      ['!', 'i'],
      ['@', 'a'],
      ['$', 's'],
      
      // Common word mistakes
      ['lighming', 'lightning'],
      ['lighlning', 'lightning'],
      ['lightnmg', 'lightning'],
      ['snapcasler', 'snapcaster'],
      ['snapcasfer', 'snapcaster'],
      ['brainsform', 'brainstorm'],
      ['brainsforrn', 'brainstorm'],
      ['counlerspell', 'counterspell'],
      ['counterspel', 'counterspell'],
      ['mana crypl', 'mana crypt'],
      ['mana crypf', 'mana crypt'],
      ['sol rmg', 'sol ring'],
      ['sol rlng', 'sol ring'],
      ['force oi', 'force of'],
      ['force ol', 'force of'],
      ['oi will', 'of will'],
      ['ol will', 'of will'],
      ['leleri', 'teferi'],
      ['teleri', 'teferi'],
      ['jace lhe', 'jace the'],
      ['jace fhe', 'jace the'],
      ['gideon oi', 'gideon of'],
      ['gideon ol', 'gideon of'],
      ['planeswalher', 'planeswalker'],
      ['planeswalkef', 'planeswalker'],
      ['crealure', 'creature'],
      ['creafure', 'creature'],
      ['mslant', 'instant'],
      ['instanf', 'instant'],
      ['enchanlment', 'enchantment'],
      ['enchantmenf', 'enchantment'],
      ['arlifact', 'artifact'],
      ['artifacf', 'artifact'],
      ['lerra', 'serra'],
      ['serra', 'serra'],
      ['swords fo', 'swords to'],
      ['swords lo', 'swords to'],
      ['conmander', 'commander'],
      ['cornmander', 'commander'],
    ]);

    // Common typos and alternate spellings
    this.commonMisspellings = new Map([
      ['ajani', 'ajani'],
      ['ajanis', "ajani's"],
      ['elspeth', 'elspeth'],
      ['elspeths', "elspeth's"],
      ['nicol', 'nicol'],
      ['bolas', 'bolas'],
      ['ugin', 'ugin'],
      ['ugins', "ugin's"],
      ['karn', 'karn'],
      ['karns', "karn's"],
      ['teferi', 'teferi'],
      ['teferis', "teferi's"],
      ['liliana', 'liliana'],
      ['lilianas', "liliana's"],
      ['chandra', 'chandra'],
      ['chandras', "chandra's"],
      ['nissa', 'nissa'],
      ['nissas', "nissa's"],
      ['garruk', 'garruk'],
      ['garruks', "garruk's"],
      ['sorin', 'sorin'],
      ['sorins', "sorin's"],
      ['vraska', 'vraska'],
      ['vraskas', "vraska's"],
      ['domri', 'domri'],
      ['domris', "domri's"],
      ['ashiok', 'ashiok'],
      ['ashioks', "ashiok's"],
      ['oko', 'oko'],
      ['okos', "oko's"],
    ]);
  }

  /**
   * Main fuzzy matching function
   */
  async findBestMatch(
    input: string,
    candidates: string[],
    options: FuzzyMatchOptions = {}
  ): Promise<MatchResult[]> {
    const {
      threshold = 0.6,
      maxResults = 5,
      usePhonetic = true,
      useTrigrams = true,
      useLevenshtein = true,
      useJaroWinkler = true,
      weights = {
        exact: 1.0,
        levenshtein: 0.8,
        jaroWinkler: 0.85,
        phonetic: 0.7,
        trigram: 0.75,
      },
    } = options;

    // Clean and correct the input
    const cleanedInput = this.cleanAndCorrect(input);
    const normalizedInput = this.normalize(cleanedInput);

    const results: MatchResult[] = [];

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalize(candidate);
      
      // Check for exact match first
      if (normalizedInput === normalizedCandidate) {
        results.push({
          name: candidate,
          score: 1.0,
          method: 'exact',
        });
        continue;
      }

      const scores: number[] = [];
      const methods: string[] = [];

      // Levenshtein distance
      if (useLevenshtein) {
        const levScore = this.levenshteinScore(normalizedInput, normalizedCandidate);
        scores.push(levScore * (weights.levenshtein || 0.8));
        methods.push(`lev:${levScore.toFixed(2)}`);
      }

      // Jaro-Winkler distance
      if (useJaroWinkler) {
        const jwScore = jaroWinkler(normalizedInput, normalizedCandidate);
        scores.push(jwScore * (weights.jaroWinkler || 0.85));
        methods.push(`jw:${jwScore.toFixed(2)}`);
      }

      // Phonetic matching
      if (usePhonetic) {
        const phonScore = this.phoneticScore(normalizedInput, normalizedCandidate);
        scores.push(phonScore * (weights.phonetic || 0.7));
        methods.push(`phon:${phonScore.toFixed(2)}`);
      }

      // Trigram similarity
      if (useTrigrams) {
        const triScore = this.trigramScore(normalizedInput, normalizedCandidate);
        scores.push(triScore * (weights.trigram || 0.75));
        methods.push(`tri:${triScore.toFixed(2)}`);
      }

      // Calculate weighted average
      const avgScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      if (avgScore >= threshold) {
        results.push({
          name: candidate,
          score: avgScore,
          method: methods.join(','),
          corrections: cleanedInput !== input ? [cleanedInput] : undefined,
        });
      }
    }

    // Sort by score and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Clean and apply OCR corrections
   */
  cleanAndCorrect(input: string): string {
    let corrected = input.toLowerCase().trim();

    // Apply character-level corrections
    for (const [wrong, right] of this.ocrCorrections) {
      corrected = corrected.replace(new RegExp(wrong, 'g'), right);
    }

    // Apply word-level corrections
    const words = corrected.split(/\s+/);
    const correctedWords = words.map(word => {
      // Check common misspellings
      if (this.commonMisspellings.has(word)) {
        return this.commonMisspellings.get(word)!;
      }
      
      // Check OCR corrections for the whole word
      for (const [wrong, right] of this.ocrCorrections) {
        if (word === wrong) {
          return right;
        }
      }
      
      return word;
    });

    // Rejoin and capitalize properly
    return correctedWords
      .join(' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Normalize string for comparison
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[''`´]/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[—–]/g, '-')
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate Levenshtein-based similarity score
   */
  private levenshteinScore(a: string, b: string): number {
    const distance = levenshtein.get(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate phonetic similarity score
   */
  private phoneticScore(a: string, b: string): number {
    // Get or compute phonetic encodings
    const phoneticA = this.getPhonetic(a);
    const phoneticB = this.getPhonetic(b);

    // Compare both metaphone and soundex
    const metaphoneScore = phoneticA.metaphone === phoneticB.metaphone ? 1 : 
      this.levenshteinScore(phoneticA.metaphone, phoneticB.metaphone);
    
    const soundexScore = phoneticA.soundex === phoneticB.soundex ? 1 :
      this.levenshteinScore(phoneticA.soundex, phoneticB.soundex);

    // Weight metaphone more heavily as it's more accurate
    return (metaphoneScore * 0.7 + soundexScore * 0.3);
  }

  /**
   * Get phonetic encoding with caching
   */
  private getPhonetic(str: string): { metaphone: string; soundex: string } {
    const cacheKey = `${str}:phonetic`;
    
    if (!this.phoneticCache.has(cacheKey)) {
      const result = {
        metaphone: metaphone(str),
        soundex: soundex(str),
      };
      this.phoneticCache.set(cacheKey, JSON.stringify(result));
      return result;
    }

    return JSON.parse(this.phoneticCache.get(cacheKey)!);
  }

  /**
   * Calculate trigram similarity score
   */
  private trigramScore(a: string, b: string): number {
    const trigramsA = this.getTrigrams(a);
    const trigramsB = this.getTrigrams(b);

    if (trigramsA.size === 0 || trigramsB.size === 0) {
      return 0;
    }

    const intersection = new Set([...trigramsA].filter(x => trigramsB.has(x)));
    const union = new Set([...trigramsA, ...trigramsB]);

    return intersection.size / union.size;
  }

  /**
   * Get trigrams with caching
   */
  private getTrigrams(str: string): Set<string> {
    if (this.trigramCache.has(str)) {
      return this.trigramCache.get(str)!;
    }

    const trigrams = new Set<string>();
    const padded = `  ${str}  `;
    
    for (let i = 0; i <= padded.length - 3; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }

    this.trigramCache.set(str, trigrams);
    return trigrams;
  }

  /**
   * Find best match for partial/truncated names
   */
  async findPartialMatch(
    partial: string,
    candidates: string[],
    minLength: number = 3
  ): Promise<MatchResult[]> {
    if (partial.length < minLength) {
      return [];
    }

    const cleanedPartial = this.cleanAndCorrect(partial.replace(/\.+$/, ''));
    const results: MatchResult[] = [];

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalize(candidate);
      
      // Check if candidate starts with the partial
      if (normalizedCandidate.startsWith(this.normalize(cleanedPartial))) {
        results.push({
          name: candidate,
          score: 0.9 + (0.1 * (cleanedPartial.length / candidate.length)),
          method: 'prefix',
        });
      }
      // Check if any word in candidate starts with partial
      else {
        const words = normalizedCandidate.split(/\s+/);
        const partialWords = this.normalize(cleanedPartial).split(/\s+/);
        
        let matchScore = 0;
        for (const partialWord of partialWords) {
          for (const word of words) {
            if (word.startsWith(partialWord)) {
              matchScore += 0.5 / partialWords.length;
            }
          }
        }
        
        if (matchScore > 0.3) {
          results.push({
            name: candidate,
            score: matchScore,
            method: 'word-prefix',
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  /**
   * Batch fuzzy matching for performance
   */
  async batchFuzzyMatch(
    inputs: string[],
    candidates: string[],
    options: FuzzyMatchOptions = {}
  ): Promise<Map<string, MatchResult[]>> {
    const results = new Map<string, MatchResult[]>();
    
    // Process in parallel batches for better performance
    const batchSize = 10;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const batchPromises = batch.map(input => 
        this.findBestMatch(input, candidates, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      batch.forEach((input, index) => {
        results.set(input, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Clear caches to free memory
   */
  clearCaches(): void {
    this.phoneticCache.clear();
    this.trigramCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { phonetic: number; trigram: number } {
    return {
      phonetic: this.phoneticCache.size,
      trigram: this.trigramCache.size,
    };
  }
}

// Singleton instance
let fuzzyMatcherInstance: FuzzyMatchingService | null = null;

export function getFuzzyMatcher(): FuzzyMatchingService {
  if (!fuzzyMatcherInstance) {
    fuzzyMatcherInstance = new FuzzyMatchingService();
  }
  return fuzzyMatcherInstance;
}

export default getFuzzyMatcher;