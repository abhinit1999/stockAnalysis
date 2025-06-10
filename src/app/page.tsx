'use client';

import { useState } from 'react';
import StockSearch from '@/components/StockSearch';
import StockAnalysis from '@/components/StockAnalysis';
import Toast from '@/components/Toast';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState('');
  const [error, setError] = useState('');

  const handleStockSelect = (symbol: string) => {
    setError(''); // Clear any existing errors
    setSelectedStock(symbol);
  };

  const handleError = (message: string) => {
    setError(message);
    setSelectedStock(''); // Clear selected stock on error
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <main className="flex-grow p-8 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-100">
            Indian Stock Analyzer
          </h1>
          <StockSearch onStockSelect={handleStockSelect} />
          {selectedStock && (
            <StockAnalysis 
              symbol={selectedStock} 
              onError={handleError}
            />
          )}
        </div>
      </main>

      <footer className="bg-gray-800 shadow-lg mt-auto">
        <div className="max-w-4xl mx-auto py-6 px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} Abhinit Kumar. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a
                href="https://github.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://linkedin.com/in/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>

      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => setError('')}
        />
      )}
    </div>
  );
}
