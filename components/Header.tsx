
import React from 'react';

interface HeaderProps {
  totalValue: number;
}

const Header: React.FC<HeaderProps> = ({ totalValue }) => {
  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-400">PokéCollection</h1>
        <div className="text-right">
          <p className="text-sm text-gray-400">Total Value</p>
          <p className="text-xl font-semibold">€{totalValue.toFixed(2)}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
