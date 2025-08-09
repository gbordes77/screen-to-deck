import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/api';
import { ProcessingStatus, MTGCard } from '@/types';

interface UseOCRProcessOptions {
  onSuccess?: (cards: MTGCard[]) => void;
  onError?: (error: Error) => void;
  validateCards?: boolean;
}

export function useOCRProcess(options: UseOCRProcessOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [cards, setCards] = useState<MTGCard[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setIsProcessing(false);
    setProcessId(null);
    setStatus(null);
    setCards([]);
    setError(null);
    setProgress(0);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    reset();
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await apiService.uploadImage(file, {
        validateCards: options.validateCards ?? true,
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Upload failed');
      }
      
      const { processId: pid } = response.data;
      setProcessId(pid);
      setIsUploading(false);
      setIsProcessing(true);
      
      toast.success('Image uploaded successfully');
      
      // Start polling
      const finalStatus = await apiService.pollProcessingStatus(
        pid,
        (status) => {
          setStatus(status);
          setProgress(status.progress || 0);
        },
        60, // max attempts
        2000 // interval
      );
      
      setStatus(finalStatus);
      setIsProcessing(false);
      
      if (finalStatus.status === 'completed' && finalStatus.result) {
        const extractedCards = finalStatus.result.cards || [];
        setCards(extractedCards);
        toast.success(`Found ${extractedCards.length} cards`);
        options.onSuccess?.(extractedCards);
      } else if (finalStatus.status === 'failed') {
        const error = new Error(finalStatus.error || 'Processing failed');
        setError(error);
        toast.error(error.message);
        options.onError?.(error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsUploading(false);
      setIsProcessing(false);
      toast.error(apiService.handleError(err));
      options.onError?.(error);
    }
  }, [options, reset]);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    reset();
    toast('Processing cancelled');
  }, [reset]);

  return {
    // State
    isUploading,
    isProcessing,
    processId,
    status,
    cards,
    error,
    progress,
    
    // Actions
    uploadImage,
    cancelProcessing,
    reset,
    
    // Computed
    isLoading: isUploading || isProcessing,
  };
}