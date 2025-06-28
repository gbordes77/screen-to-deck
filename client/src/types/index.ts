// Card-related types
export interface MTGCard {
  name: string;
  quantity: number;
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

// Frontend-specific types
export interface UploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  progress: number;
}

export interface ConversionState {
  processId: string | null;
  status: ProcessingStatus | null;
  cards: MTGCard[];
  validationResult: ValidationResult | null;
  isPolling: boolean;
}

export interface ExportState {
  selectedFormats: ExportFormat[];
  results: ExportResult[];
  isExporting: boolean;
  deckName: string;
}

// UI Component types
export interface CardDisplayProps {
  card: MTGCard;
  index: number;
  onEdit?: (index: number, card: MTGCard) => void;
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string[];
  maxSize?: number;
  disabled?: boolean;
}

export interface ProgressBarProps {
  progress: number;
  status: string;
  className?: string;
}

// Format configuration
export interface FormatConfig {
  id: ExportFormat;
  name: string;
  description: string;
  extension: string;
  supportsUrl: boolean;
  icon?: string;
}

// Statistics types
export interface DeckStats {
  totalCards: number;
  uniqueCards: number;
  averageCMC: number;
  colorDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  rarityDistribution: Record<string, number>;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Toast notification types
export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// User preferences
export interface UserPreferences {
  theme: Theme;
  autoValidateCards: boolean;
  defaultExportFormat: ExportFormat;
  enableNotifications: boolean;
  language: string;
} 