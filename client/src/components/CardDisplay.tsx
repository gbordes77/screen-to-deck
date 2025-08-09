import { memo } from 'react';
import { MTGCard } from '@/types';
import { Trash2, Edit2, ExternalLink } from 'lucide-react';

interface CardDisplayProps {
  card: MTGCard;
  index: number;
  onEdit?: (index: number, card: MTGCard) => void;
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

export const CardDisplay = memo<CardDisplayProps>(({ 
  card, 
  index, 
  onEdit, 
  onRemove, 
  readonly = false 
}) => {
  const getManaSymbols = (manaCost?: string) => {
    if (!manaCost) return null;
    
    const symbols = manaCost.match(/{[^}]+}/g) || [];
    return symbols.map((symbol, i) => {
      const cleaned = symbol.replace(/[{}]/g, '').toLowerCase();
      const colorMap: Record<string, string> = {
        'w': 'mana-w',
        'u': 'mana-u', 
        'b': 'mana-b',
        'r': 'mana-r',
        'g': 'mana-g',
        'c': 'mana-c',
      };
      
      const className = colorMap[cleaned] || 'mana-c';
      const displayText = isNaN(Number(cleaned)) ? cleaned.toUpperCase() : cleaned;
      
      return (
        <span key={i} className={`mana-symbol ${className}`}>
          {displayText}
        </span>
      );
    });
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic':
        return 'text-orange-600 bg-orange-50';
      case 'rare':
        return 'text-yellow-600 bg-yellow-50';
      case 'uncommon':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Card Image */}
        {card.image_uris?.small && (
          <div className="flex-shrink-0">
            <img
              src={card.image_uris.small}
              alt={card.name}
              className="w-16 h-22 object-cover rounded"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                <span className="text-lg font-bold text-gray-500 mr-2">
                  {card.quantity}×
                </span>
                {card.name}
              </h3>
              
              {/* Mana Cost */}
              {card.mana_cost && (
                <div className="flex items-center gap-1 mt-1">
                  {getManaSymbols(card.mana_cost)}
                  {card.cmc !== undefined && (
                    <span className="ml-2 text-xs text-gray-500">
                      CMC: {card.cmc}
                    </span>
                  )}
                </div>
              )}
              
              {/* Type Line */}
              {card.type_line && (
                <p className="text-sm text-gray-600 mt-1">
                  {card.type_line}
                </p>
              )}
              
              {/* Set and Rarity */}
              <div className="flex items-center gap-2 mt-2">
                {card.set && (
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {card.set}
                  </span>
                )}
                {card.collector_number && (
                  <span className="text-xs text-gray-400">
                    #{card.collector_number}
                  </span>
                )}
                {card.rarity && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRarityColor(card.rarity)}`}>
                    {card.rarity}
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            {!readonly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={() => onEdit(index, card)}
                    className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                    aria-label="Edit card"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label="Remove card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {card.scryfall_id && (
                  <a
                    href={`https://scryfall.com/card/${card.scryfall_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    aria-label="View on Scryfall"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CardDisplay.displayName = 'CardDisplay';