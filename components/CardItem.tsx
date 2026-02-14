
import React from 'react';
import { PokemonCard } from '../types';

interface CardItemProps {
  card: PokemonCard;
  onRemove: (cardId: string) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onRemove }) => {
  const price = card.cardmarket?.prices?.averageSellPrice ?? card.cardmarket?.prices?.avg1 ?? 0;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg group relative">
      <img src={card.images.small} alt={card.name} className="w-full aspect-[3/4] object-cover" />
      <div className="p-2 text-sm">
        <p className="font-bold truncate">{card.name}</p>
        <p className="text-gray-400 truncate text-xs">{card.set.name}</p>
        <p className="font-semibold text-yellow-400 mt-1">€{price.toFixed(2)}</p>
      </div>
       <button 
        onClick={() => onRemove(card.id)}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove card"
       >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default CardItem;
