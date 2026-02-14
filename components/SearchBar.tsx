
import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedSet: string;
  setSelectedSet: (set: string) => void;
  sets: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, selectedSet, setSelectedSet, sets }) => {
  return (
    <div className="my-4 flex flex-col sm:flex-row gap-4">
      <input
        type="text"
        placeholder="Search by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
      <select
        value={selectedSet}
        onChange={(e) => setSelectedSet(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        {sets.map(set => (
          <option key={set} value={set}>{set === 'all' ? 'All Sets' : set}</option>
        ))}
      </select>
    </div>
  );
};

export default SearchBar;
