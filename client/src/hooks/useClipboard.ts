import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseClipboardOptions {
  timeout?: number;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseClipboardReturn {
  copied: boolean;
  error: Error | null;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const {
    timeout = 2500,
    successMessage = 'Copied to clipboard!',
    errorMessage = 'Failed to copy to clipboard',
    onSuccess,
    onError,
  } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!text) {
      const err = new Error('No text to copy');
      setError(err);
      toast.error('Nothing to copy');
      onError?.(err);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      onSuccess?.();
      
      if (timeout > 0) {
        setTimeout(() => {
          setCopied(false);
        }, timeout);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('Clipboard copy failed:', error);
      setError(error);
      setCopied(false);
      
      if (errorMessage) {
        toast.error(errorMessage);
      }
      
      onError?.(error);
    }
  }, [timeout, successMessage, errorMessage, onSuccess, onError]);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return {
    copied,
    error,
    copy,
    reset,
  };
}

// Helper function to format deck for different platforms
export function formatDeckForPlatform(
  cards: Array<{ name: string; quantity: number }>,
  platform: 'mtga' | 'moxfield' | 'archidekt' | 'tappedout' | 'txt'
): string {
  switch (platform) {
    case 'mtga':
      return cards
        .map(card => `${card.quantity} ${card.name}`)
        .join('\n');
    
    case 'moxfield':
    case 'archidekt':
      return cards
        .map(card => `${card.quantity}x ${card.name}`)
        .join('\n');
    
    case 'tappedout':
      return cards
        .map(card => `${card.quantity} ${card.name}`)
        .join('\n');
    
    case 'txt':
    default:
      return cards
        .map(card => `${card.quantity} ${card.name}`)
        .join('\n');
  }
}