'use client';

import { useState } from 'react';

interface StockSearchProps {
  onStockSelect: (symbol: string) => void;
}

export default function StockSearch({ onStockSelect }: StockSearchProps) {
  const [symbol, setSymbol] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onStockSelect(symbol.trim().toUpperCase());
      setSymbol(''); // Clear input after submission
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="mb-8">
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter stock symbol (e.g., RELIANCE, TCS, INFY)"
        className="w-full px-6 py-3 text-lg text-gray-100 bg-gray-800 border-2 border-gray-700 rounded-lg 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 shadow-sm placeholder:text-gray-500 transition-all duration-200
                 hover:border-blue-400"
      />
    </div>
  );
} 