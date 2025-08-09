import { useState, useCallback, memo } from 'react';
import { Download, Copy, CheckCircle, Upload, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExportFormat, MTGCard, FormatConfig } from '@/types';
import { apiService } from '@/services/api';

interface ExportPanelProps {
  cards: MTGCard[];
  deckName?: string;
  className?: string;
}

const FORMAT_CONFIGS: FormatConfig[] = [
  {
    id: 'mtga',
    name: 'MTG Arena',
    description: 'Import directly into MTG Arena',
    extension: 'txt',
    supportsUrl: false,
    icon: '🎮',
  },
  {
    id: 'moxfield',
    name: 'Moxfield',
    description: 'Popular deck building website',
    extension: 'txt',
    supportsUrl: true,
    icon: '📊',
  },
  {
    id: 'archidekt',
    name: 'Archidekt',
    description: 'Advanced deck builder with pricing',
    extension: 'txt',
    supportsUrl: true,
    icon: '🏛️',
  },
  {
    id: 'tappedout',
    name: 'TappedOut',
    description: 'Community deck sharing platform',
    extension: 'txt',
    supportsUrl: true,
    icon: '🃏',
  },
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text format',
    extension: 'txt',
    supportsUrl: false,
    icon: '📝',
  },
];

export const ExportPanel = memo<ExportPanelProps>(({ 
  cards, 
  deckName = 'My Deck',
  className = '',
}) => {
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set(['mtga']));
  const [exporting, setExporting] = useState(false);
  const [exportResults, setExportResults] = useState<Map<ExportFormat, string>>(new Map());
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);

  const toggleFormat = useCallback((format: ExportFormat) => {
    setSelectedFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(format)) {
        newSet.delete(format);
      } else {
        newSet.add(format);
      }
      return newSet;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!cards.length || selectedFormats.size === 0) return;

    setExporting(true);
    setExportResults(new Map());

    try {
      const promises = Array.from(selectedFormats).map(async (format) => {
        const response = await apiService.exportDeck(cards, format, deckName);
        if (response.success && response.data) {
          return { format, content: response.data.content };
        }
        throw new Error(`Failed to export to ${format}`);
      });

      const results = await Promise.all(promises);
      const resultsMap = new Map<ExportFormat, string>();
      
      results.forEach(({ format, content }) => {
        resultsMap.set(format, content);
      });

      setExportResults(resultsMap);
      toast.success(`Exported to ${results.length} format(s)`);
    } catch (error) {
      toast.error('Export failed for some formats');
      console.error(error);
    } finally {
      setExporting(false);
    }
  }, [cards, selectedFormats, deckName]);

  const handleCopy = useCallback((format: ExportFormat, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedFormat(format);
      toast.success(`Copied ${format.toUpperCase()} format to clipboard`);
      setTimeout(() => setCopiedFormat(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, []);

  const handleDownload = useCallback((format: ExportFormat, content: string) => {
    const config = FORMAT_CONFIGS.find(f => f.id === format);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${config?.extension || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${format.toUpperCase()} format`);
  }, [deckName]);

  const handleShareUrl = useCallback(async (_format: ExportFormat) => {
    // This would typically generate a shareable URL via your backend
    toast('Share URL feature coming soon!');
  }, []);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>

      {/* Format Selection */}
      <div className="space-y-2 mb-6">
        <label className="text-sm font-medium text-gray-700">Select Formats</label>
        <div className="grid grid-cols-1 gap-2">
          {FORMAT_CONFIGS.map((config) => (
            <label
              key={config.id}
              className={`
                flex items-start p-3 rounded-lg border cursor-pointer transition-all
                ${selectedFormats.has(config.id)
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <input
                type="checkbox"
                checked={selectedFormats.has(config.id)}
                onChange={() => toggleFormat(config.id)}
                className="mt-0.5 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <span className="font-medium text-gray-900">{config.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || selectedFormats.size === 0 || cards.length === 0}
        className="btn-primary w-full mb-4"
      >
        {exporting ? (
          <>
            <span className="animate-spin inline-block mr-2">⏳</span>
            Exporting...
          </>
        ) : (
          <>
            <Upload className="inline-block w-4 h-4 mr-2" />
            Export Selected Formats
          </>
        )}
      </button>

      {/* Export Results */}
      {exportResults.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Export Results</h4>
          {Array.from(exportResults.entries()).map(([format, content]) => {
            const config = FORMAT_CONFIGS.find(f => f.id === format);
            return (
              <div key={format} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{config?.icon}</span>
                    <span className="font-medium text-sm">{config?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(format, content)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                      aria-label={`Copy ${format} format`}
                    >
                      {copiedFormat === format ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(format, content)}
                      className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                      aria-label={`Download ${format} format`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {config?.supportsUrl && (
                      <button
                        onClick={() => handleShareUrl(format)}
                        className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        aria-label={`Share ${format} URL`}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 max-h-32 overflow-auto">
                  <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                    {content.substring(0, 500)}
                    {content.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ExportPanel.displayName = 'ExportPanel';