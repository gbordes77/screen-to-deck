// Card-related types
export interface MTGCard {
  name: string;
  quantity: number;
  section?: 'mainboard' | 'sideboard'; // Added for 60+15 guarantee tracking
  set?: string;
  collector_number?: string;
  rarity?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  legalities?: Record<string, string>;
  scryfall_id?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
}

// Deck structure
export interface DeckList {
  mainboard: MTGCard[];
  sideboard?: MTGCard[];
  commander?: MTGCard[];
  metadata?: {
    name?: string;
    format?: string;
    description?: string;
    created_at?: string;
    total_cards?: number;
  };
}

// OCR result structure
export interface OCRResult {
  success: boolean;
  cards: MTGCard[];
  confidence: number;
  processing_time: number;
  format?: string; // Added for format detection (arena/mtgo/paper)
  guaranteed?: boolean; // Added to indicate if 60+15 guarantee was met
  errors?: string[];
  warnings?: string[];
}

// Export formats
export type ExportFormat = 'mtga' | 'moxfield' | 'archidekt' | 'tappedout' | 'txt';

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
  url?: string; // For formats that support direct import URLs
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// Scryfall API types
export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  colors: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  image_uris: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  legalities: Record<string, string>;
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
    tix?: string;
  };
}

export interface ScryfallSearchResult {
  object: string;
  total_cards: number;
  has_more: boolean;
  data: ScryfallCard[];
}

// OpenAI Vision types
export interface OpenAIVisionMessage {
  role: 'user' | 'system';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

// Processing status types
export interface ProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: OCRResult;
  error?: string;
  created_at: string;
  updated_at: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Configuration types
export interface AppConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    destination: string;
  };
  scryfall: {
    apiUrl: string;
    rateLimit: number;
  };
  server: {
    port: number;
    corsOrigin: string;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
} 