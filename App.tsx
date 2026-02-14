
import React, { useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PokemonCard } from './types';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import CardList from './components/CardList';
import Scanner from './components/Scanner';

const App: React.FC = () => {
  const [collection, setCollection] = useLocalStorage<PokemonCard[]>('pokemonCollection', []);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState('all');

  const addCardToCollection = useCallback((card: PokemonCard) => {
    if (!collection.some(c => c.id === card.id)) {
      setCollection(prev => [...prev, card]);
      setIsScannerOpen(false);
    } else {
      alert('This card is already in your collection!');
    }
  }, [collection, setCollection]);

  const removeCardFromCollection = (cardId: string) => {
    setCollection(collection.filter(card => card.id !== cardId));
  };
  
  const setsInCollection = useMemo(() => {
    const sets = new Set(collection.map(card => card.set.name));
    return ['all', ...Array.from(sets)];
  }, [collection]);

  const filteredCollection = useMemo(() => {
    return collection
      .filter(card => 
        card.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(card => 
        selectedSet === 'all' || card.set.name === selectedSet
      );
  }, [collection, searchTerm, selectedSet]);

  const totalValue = useMemo(() => {
    return collection.reduce((total, card) => {
      const price = card.cardmarket?.prices?.averageSellPrice ?? card.cardmarket?.prices?.avg1 ?? 0;
      return total + price;
    }, 0);
  }, [collection]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header totalValue={totalValue} />
      
      <main className="container mx-auto p-4 pb-24">
        <SearchBar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSet={selectedSet}
          setSelectedSet={setSelectedSet}
          sets={setsInCollection}
        />
        <CardList cards={filteredCollection} onRemoveCard={removeCardFromCollection} />
      </main>

      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-6 right-6 bg-yellow-400 text-gray-900 rounded-full p-4 shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 transition-transform transform hover:scale-110"
        aria-label="Scan new card"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isScannerOpen && (
        <Scanner
          onClose={() => setIsScannerOpen(false)}
          onCardAdded={addCardToCollection}
        />
      )}
    </div>
  );
};

export default App;
