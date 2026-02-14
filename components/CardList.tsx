
import React from 'react';
import { PokemonCard } from '../types';
import CardItem from './CardItem';

interface CardListProps {
  cards: PokemonCard[];
  onRemoveCard: (cardId: string) => void;
}

const CardList: React.FC<CardListProps> = ({ cards, onRemoveCard }) => {
  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Your collection is empty.</p>
        <p className="text-gray-500">Tap the camera button to scan your first card!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map(card => (
        <CardItem key={card.id} card={card} onRemove={onRemoveCard} />
      ))}
    </div>
  );
};

export default CardList;
