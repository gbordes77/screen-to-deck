import React, { useState } from 'react';
import { Upload, Zap, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

interface OCRResult {
  success: boolean;
  cards: Array<{
    name: string;
    quantity: number;
    section: string;
  }>;
  statistics: {
    mainboard_count: number;
    sideboard_count: number;
    total_unique_cards: number;
    processing_time_ms: number;
    confidence: number;
    methods_used: string[];
  };
  validation: {
    mainboard_valid: boolean;
    sideboard_valid: boolean;
    complete: boolean;
  };
}

export default function EnhancedOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ocr/enhanced', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'OCR processing failed');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const exportToMTGA = () => {
    if (!result) return;

    const mainboard = result.cards.filter(c => c.section !== 'sideboard');
    const sideboard = result.cards.filter(c => c.section === 'sideboard');

    let mtgaFormat = '';
    
    // Mainboard
    mainboard.forEach(card => {
      mtgaFormat += `${card.quantity} ${card.name}\n`;
    });
    
    // Sideboard
    if (sideboard.length > 0) {
      mtgaFormat += '\nSideboard\n';
      sideboard.forEach(card => {
        mtgaFormat += `${card.quantity} ${card.name}\n`;
      });
    }

    // Copy to clipboard
    navigator.clipboard.writeText(mtgaFormat);
    alert('Deck copied to clipboard in MTGA format!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced OCR (Never Give Up Mode)
          </h1>
          <p className="text-gray-600">
            Upload any MTG deck screenshot - this enhanced version uses super-resolution, 
            multiple OCR methods, and NEVER gives up until it finds all 60+15 cards!
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Enhanced Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Automatic 4x super-resolution for low-quality images</li>
                <li>Format detection (Arena, MTGO, Paper)</li>
                <li>Progressive OCR methods (EasyOCR → OpenAI Vision)</li>
                <li>Automatic validation and fixing (exactly 60 mainboard + 15 sideboard)</li>
                <li>Never-give-up mode ensures complete deck extraction</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-gray-600">
                {file ? file.name : 'Click to select an image'}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Supports JPG, PNG, WebP (max 10MB)
              </span>
            </label>
          </div>

          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg shadow"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`mt-4 w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              loading || !file
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing (Never Giving Up)...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Process with Enhanced OCR
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Processing Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Mainboard</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{result.statistics.mainboard_count}/60</span>
                    {result.validation.mainboard_valid && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Sideboard</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{result.statistics.sideboard_count}/15</span>
                    {result.validation.sideboard_valid && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Processing Time</span>
                  <div className="text-xl font-bold">
                    {(result.statistics.processing_time_ms / 1000).toFixed(1)}s
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Confidence</span>
                  <div className="text-xl font-bold">
                    {(result.statistics.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Unique Cards</span>
                  <div className="text-xl font-bold">
                    {result.statistics.total_unique_cards}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status</span>
                  <div className="text-xl font-bold">
                    {result.validation.complete ? (
                      <span className="text-green-600">Complete ✓</span>
                    ) : (
                      <span className="text-yellow-600">Partial</span>
                    )}
                  </div>
                </div>
              </div>
              {result.statistics.methods_used.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Methods Used: </span>
                  <span className="text-sm">{result.statistics.methods_used.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Card Lists */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Mainboard */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Mainboard ({result.statistics.mainboard_count} cards)
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {result.cards
                    .filter(c => c.section !== 'sideboard')
                    .map((card, index) => (
                      <div key={index} className="flex justify-between py-1 hover:bg-gray-50">
                        <span>{card.name}</span>
                        <span className="text-gray-600">×{card.quantity}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Sideboard */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Sideboard ({result.statistics.sideboard_count} cards)
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {result.cards
                    .filter(c => c.section === 'sideboard')
                    .map((card, index) => (
                      <div key={index} className="flex justify-between py-1 hover:bg-gray-50">
                        <span>{card.name}</span>
                        <span className="text-gray-600">×{card.quantity}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToMTGA}
              className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
            >
              Copy to Clipboard (MTGA Format)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}