import axios, { AxiosInstance } from 'axios';
import { 
  APIResponse, 
  ProcessingStatus, 
  MTGCard, 
  ExportFormat, 
  ExportResult,
  ValidationResult,
  DeckStats 
} from '../types';

class APIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      // Vite injects import.meta.env at runtime; during type-check it exists.
      baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // OCR Service Methods
  async uploadImage(file: File, options: {
    validateCards?: boolean;
    deckName?: string;
  } = {}): Promise<APIResponse<{ processId: string; status: string; message: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    
    if (options.validateCards !== undefined) {
      formData.append('validateCards', String(options.validateCards));
    }
    
    if (options.deckName) {
      formData.append('deckName', options.deckName);
    }

    const response = await this.api.post('/ocr/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async uploadImageBase64(imageData: string, options: {
    validateCards?: boolean;
    deckName?: string;
  } = {}): Promise<APIResponse<{ processId: string; status: string; message: string }>> {
    const response = await this.api.post('/ocr/process-base64', {
      image: imageData,
      ...options,
    });

    return response.data;
  }

  async getProcessingStatus(processId: string): Promise<APIResponse<ProcessingStatus>> {
    const response = await this.api.get(`/ocr/status/${processId}`);
    return response.data;
  }

  async getProcessingJobs(): Promise<APIResponse<ProcessingStatus[]>> {
    const response = await this.api.get('/ocr/jobs');
    return response.data;
  }

  async deleteProcessingJob(processId: string): Promise<APIResponse> {
    const response = await this.api.delete(`/ocr/jobs/${processId}`);
    return response.data;
  }

  // Export Service Methods
  async exportDeck(
    cards: MTGCard[], 
    format: ExportFormat, 
    deckName?: string
  ): Promise<APIResponse<ExportResult>> {
    const response = await this.api.post(`/export/${format}`, {
      cards,
      deckName,
    });

    return response.data;
  }

  async exportDeckToAllFormats(
    cards: MTGCard[], 
    deckName?: string
  ): Promise<APIResponse<{ exports: ExportResult[]; count: number }>> {
    const response = await this.api.post('/export/all', {
      cards,
      deckName,
    });

    return response.data;
  }

  async generateDeckStats(cards: MTGCard[]): Promise<APIResponse<DeckStats>> {
    const response = await this.api.post('/export/stats', { cards });
    return response.data;
  }

  async getExportFormats(): Promise<APIResponse<{ formats: any[]; count: number }>> {
    const response = await this.api.get('/export/formats');
    return response.data;
  }

  async previewExport(
    cards: MTGCard[], 
    format: ExportFormat, 
    deckName?: string
  ): Promise<APIResponse<any>> {
    const response = await this.api.post(`/export/preview/${format}`, {
      cards,
      deckName,
    });

    return response.data;
  }

  async downloadExport(
    cards: MTGCard[], 
    format: ExportFormat, 
    deckName?: string
  ): Promise<Blob> {
    const response = await this.api.post(`/export/download/${format}`, {
      cards,
      deckName,
    }, {
      responseType: 'blob',
    });

    return response.data;
  }

  // Cards Service Methods
  async searchCards(query: string, limit = 20): Promise<APIResponse<{
    cards: any[];
    count: number;
    query: string;
  }>> {
    const response = await this.api.get('/cards/search', {
      params: { q: query, limit },
    });

    return response.data;
  }

  async findCardByName(name: string): Promise<APIResponse<any>> {
    const response = await this.api.get(`/cards/named/${encodeURIComponent(name)}`);
    return response.data;
  }

  async getCardById(id: string): Promise<APIResponse<any>> {
    const response = await this.api.get(`/cards/${id}`);
    return response.data;
  }

  async validateCards(cards: MTGCard[]): Promise<APIResponse<{
    validatedCards: MTGCard[];
    validation: ValidationResult;
    originalCount: number;
    validatedCount: number;
  }>> {
    const response = await this.api.post('/cards/validate', { cards });
    return response.data;
  }

  async getRandomCard(): Promise<APIResponse<any>> {
    const response = await this.api.get('/cards/random');
    return response.data;
  }

  async checkFormatLegality(
    cards: MTGCard[], 
    format: string
  ): Promise<APIResponse<{
    format: string;
    legal: boolean;
    issues: string[];
    cardCount: number;
  }>> {
    const response = await this.api.post(`/cards/legality/${format}`, { cards });
    return response.data;
  }

  async autocompleteCards(partial: string, limit = 10): Promise<APIResponse<{
    suggestions: Array<{
      name: string;
      id: string;
      mana_cost: string;
      type_line: string;
    }>;
    count: number;
    partial: string;
  }>> {
    const response = await this.api.get(`/cards/autocomplete/${encodeURIComponent(partial)}`, {
      params: { limit },
    });

    return response.data;
  }

  async getCacheStats(): Promise<APIResponse<any>> {
    const response = await this.api.get('/cards/cache/stats');
    return response.data;
  }

  async clearCache(): Promise<APIResponse> {
    const response = await this.api.delete('/cards/cache');
    return response.data;
  }

  // Health and Info
  async getHealthStatus(): Promise<APIResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  async getAPIInfo(): Promise<APIResponse> {
    const response = await this.api.get('/');
    return response.data;
  }

  // Utility Methods
  async pollProcessingStatus(
    processId: string,
    onUpdate?: (status: ProcessingStatus) => void,
    maxAttempts = 60,
    interval = 2000
  ): Promise<ProcessingStatus> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const response = await this.getProcessingStatus(processId);
          
          if (!response.success || !response.data) {
            throw new Error('Failed to get processing status');
          }

          const status = response.data;
          
          if (onUpdate) {
            onUpdate(status);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
            return;
          }

          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // Error handling utility
  handleError(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) {
        return error.response.data.error;
      }
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      if (error.message) {
        return error.message;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unknown error occurred';
  }
}

export const apiService = new APIService();
export default apiService; 