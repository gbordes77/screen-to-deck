import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Download, Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CardDisplay } from '@/components/CardDisplay';
import { Skeleton, CardSkeleton } from '@/components/LoadingStates';
import { MTGCard, ExportFormat, DeckStats } from '@/types';
import { apiService } from '@/services/api';

export const ResultsPage: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [cards, setCards] = useState<MTGCard[]>(location.state?.cards || []);
  const [loading, setLoading] = useState(!location.state?.cards);
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mtga');
  const [exportContent, setExportContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [initialAutoCopyDone, setInitialAutoCopyDone] = useState(false);

  // Calculate deck statistics
  const stats = useMemo<DeckStats>(() => {
    if (!cards.length) {
      return {
        totalCards: 0,
        uniqueCards: 0,
        averageCMC: 0,
        colorDistribution: {},
        typeDistribution: {},
        rarityDistribution: {},
      };
    }

    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;
    const totalCMC = cards.reduce((sum, card) => sum + (card.cmc || 0) * card.quantity, 0);
    const averageCMC = totalCMC / totalCards;

    const colorDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};
    const rarityDistribution: Record<string, number> = {};

    cards.forEach(card => {
      // Colors
      if (card.colors) {
        card.colors.forEach(color => {
          colorDistribution[color] = (colorDistribution[color] || 0) + card.quantity;
        });
      }
      
      // Types
      if (card.type_line) {
        const mainType = card.type_line.split(' — ')[0];
        typeDistribution[mainType] = (typeDistribution[mainType] || 0) + card.quantity;
      }
      
      // Rarity
      if (card.rarity) {
        rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + card.quantity;
      }
    });

    return {
      totalCards,
      uniqueCards,
      averageCMC: Math.round(averageCMC * 100) / 100,
      colorDistribution,
      typeDistribution,
      rarityDistribution,
    };
  }, [cards]);

  // Generate MTGA format for a given set of cards
  const generateMTGAFormat = useCallback((cardList: MTGCard[]): string => {
    return cardList
      .map(card => `${card.quantity} ${card.name}`)
      .join('\n');
  }, []);

  // Auto-generate and set MTGA format when cards are loaded
  useEffect(() => {
    if (cards.length > 0 && !exportContent && !initialAutoCopyDone) {
      const mtgaContent = generateMTGAFormat(cards);
      setExportContent(mtgaContent);
      setSelectedFormat('mtga');
      
      // Auto-copy if we came from the converter with autocopied flag
      if (location.state?.autocopied) {
        setInitialAutoCopyDone(true);
        // Show a subtle reminder that it's already copied
        toast(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Deck already in clipboard - paste in MTGA!</span>
          </div>,
          { duration: 3000, icon: null }
        );
      }
    }
  }, [cards, exportContent, generateMTGAFormat, location.state?.autocopied, initialAutoCopyDone]);

  // Load cards from process ID if not provided via state
  useEffect(() => {
    if (!processId || cards.length > 0) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        setLoading(true);
        const response = await apiService.getProcessingStatus(processId);
        
        if (!cancelled && response.success && response.data) {
          if (response.data.status === 'completed' && response.data.result?.cards) {
            const loadedCards = response.data.result.cards;
            setCards(loadedCards);
            
            // Auto-generate MTGA format and copy
            const mtgaContent = generateMTGAFormat(loadedCards);
            setExportContent(mtgaContent);
            setSelectedFormat('mtga');
            
            // Auto-copy to clipboard
            try {
              await navigator.clipboard.writeText(mtgaContent);
              toast.success(
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>✅ Deck copied! Ready to paste in MTGA</span>
                </div>,
                { duration: 4000 }
              );
            } catch (error) {
              console.error('Failed to auto-copy:', error);
            }
          } else if (response.data.status === 'failed') {
            toast.error('Failed to load results');
            navigate('/converter');
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error('Failed to load results');
          navigate('/converter');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [processId, cards.length, navigate, generateMTGAFormat]);

  const handleExport = useCallback(async () => {
    if (!cards.length) return;
    
    try {
      setExporting(true);
      const response = await apiService.exportDeck(cards, selectedFormat, 'My Deck');
      
      if (response.success && response.data) {
        setExportContent(response.data.content);
        
        // Auto-copy the new format to clipboard
        try {
          await navigator.clipboard.writeText(response.data.content);
          setCopied(true);
          toast.success(
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Exported and copied to clipboard!</span>
            </div>
          );
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          toast.success(`Exported to ${selectedFormat.toUpperCase()} format`);
        }
      }
    } catch (error) {
      toast.error('Failed to export deck');
    } finally {
      setExporting(false);
    }
  }, [cards, selectedFormat]);

  const handleCopy = useCallback(() => {
    if (!exportContent) return;
    
    navigator.clipboard.writeText(exportContent).then(() => {
      setCopied(true);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>Copied to clipboard!</span>
        </div>
      );
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, [exportContent]);

  const handleDownload = useCallback(() => {
    if (!exportContent) return;
    
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck.${selectedFormat === 'mtga' ? 'txt' : selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Downloaded!');
  }, [exportContent, selectedFormat]);

  const handleCardEdit = useCallback((index: number, updatedCard: MTGCard) => {
    setCards(prev => prev.map((card, i) => i === index ? updatedCard : card));
  }, []);

  const handleCardRemove = useCallback((index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    toast.success('Card removed');
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-600 mb-4">No cards found</p>
        <button
          onClick={() => navigate('/converter')}
          className="btn-primary"
        >
          <ArrowLeft className="inline-block mr-2 w-4 h-4" />
          Back to Converter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deck Results</h1>
          <p className="text-gray-600 mt-1">
            {stats.totalCards} cards • {stats.uniqueCards} unique
            {stats.averageCMC > 0 && ` • ${stats.averageCMC} avg CMC`}
          </p>
        </div>
        <button
          onClick={() => navigate('/converter')}
          className="btn-outline"
        >
          <ArrowLeft className="inline-block mr-2 w-4 h-4" />
          New Conversion
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Card List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Card List</h2>
          <div className="grid gap-4">
            {cards.map((card, index) => (
              <CardDisplay
                key={index}
                card={card}
                index={index}
                onEdit={handleCardEdit}
                onRemove={handleCardRemove}
              />
            ))}
          </div>
        </div>

        {/* Export Panel */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Cards:</dt>
                <dd className="font-medium">{stats.totalCards}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Unique Cards:</dt>
                <dd className="font-medium">{stats.uniqueCards}</dd>
              </div>
              {stats.averageCMC > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Average CMC:</dt>
                  <dd className="font-medium">{stats.averageCMC}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Export Options */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Deck</h3>
            
            {/* Format Selection */}
            <div className="space-y-3 mb-4">
              <label className="text-sm font-medium text-gray-700">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="input w-full"
              >
                <option value="mtga">MTG Arena</option>
                <option value="moxfield">Moxfield</option>
                <option value="archidekt">Archidekt</option>
                <option value="tappedout">TappedOut</option>
                <option value="txt">Plain Text</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary w-full mb-4 flex items-center justify-center gap-2"
            >
              {exporting ? (
                'Exporting...'
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Generate & Copy
                </>
              )}
            </button>

            {/* Export Content */}
            {exportContent && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <pre className="text-xs text-gray-700 font-mono overflow-auto max-h-64">
                    {exportContent}
                  </pre>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    title="Copy deck list to clipboard"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Again
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
