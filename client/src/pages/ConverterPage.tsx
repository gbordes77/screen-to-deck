import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileImage, Wand2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SimpleImageUpload } from '@/components/SimpleImageUpload';
import { ProcessingIndicator } from '@/components/LoadingStates';
import { CardDisplay } from '@/components/CardDisplay';
import { useOCRProcess } from '@/hooks/useOCRProcess';
import { MTGCard } from '@/types';

export const ConverterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [autocopied, setAutocopied] = useState(false);
  
  // Helper function to generate MTGA format
  const generateMTGAFormat = (cards: MTGCard[]): string => {
    return cards
      .map(card => `${card.quantity} ${card.name}`)
      .join('\n');
  };

  // Auto-copy function
  const autoCopyToClipboard = useCallback(async (cards: MTGCard[]) => {
    try {
      const mtgaFormat = generateMTGAFormat(cards);
      await navigator.clipboard.writeText(mtgaFormat);
      setAutocopied(true);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>✅ Deck copied! Ready to paste in MTGA</span>
        </div>,
        { duration: 4000 }
      );
      setTimeout(() => setAutocopied(false), 3000);
    } catch (error) {
      console.error('Failed to auto-copy:', error);
      toast.error('Could not copy automatically. Please use the copy button.');
    }
  }, []);

  const {
    isLoading,
    progress,
    status,
    cards,
    uploadImage,
    reset,
  } = useOCRProcess({
    onSuccess: async (cards) => {
      // Auto-copy to clipboard first
      if (cards.length > 0) {
        await autoCopyToClipboard(cards);
        // Then navigate to results page with cards data
        setTimeout(() => {
          navigate('/results', { state: { cards, autocopied: true } });
        }, 1500);
      }
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    await uploadImage(selectedFile);
  }, [selectedFile, uploadImage]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setAutocopied(false);
    reset();
  }, [reset]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Convert Your Deck Screenshot
        </h1>
        <p className="text-gray-600">
          Upload a screenshot of your MTG deck and we'll extract the card list
        </p>
      </div>

      {/* Main Content */}
      {!isLoading && cards.length === 0 && (
        <>
          {/* Upload Area */}
          <SimpleImageUpload
            onFileSelect={handleFileSelect}
            disabled={isLoading}
            className="w-full"
          />

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleReset}
                className="btn-outline"
                disabled={isLoading}
              >
                Choose Different Image
              </button>
              <button
                onClick={handleUpload}
                className="btn-primary flex items-center gap-2"
                disabled={isLoading}
              >
                <Wand2 className="w-4 h-4" />
                Process Image
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Processing State */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <FileImage className="w-16 h-16 text-brand-600 animate-pulse" />
            </div>
            <ProcessingIndicator
              progress={progress}
              message={status?.message || 'Processing your image...'}
            />
            <div className="text-center text-sm text-gray-500">
              This may take a few moments depending on the image quality
            </div>
          </div>
        </div>
      )}

      {/* Results Preview */}
      {!isLoading && cards.length > 0 && (
        <div className="space-y-6">
          {/* Success Banner */}
          {autocopied && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Deck copied to clipboard!</p>
                  <p className="text-sm text-green-700">You can now paste it directly into MTG Arena</p>
                </div>
              </div>
              <button
                onClick={() => autoCopyToClipboard(cards)}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Again
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Found {cards.length} cards
            </h2>
            <button
              onClick={handleReset}
              className="btn-outline"
            >
              Process Another Image
            </button>
          </div>
          
          <div className="grid gap-4">
            {cards.slice(0, 5).map((card, index) => (
              <CardDisplay
                key={index}
                card={card}
                index={index}
                readonly
              />
            ))}
          </div>

          {cards.length > 5 && (
            <div className="text-center">
              <button
                onClick={() => navigate('/results', { state: { cards } })}
                className="btn-primary"
              >
                View All Cards & Export Options
                <ArrowRight className="inline-block ml-2 w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
