import axios from 'axios';

// NOTE: Please create a .env.local file and add your API key as NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'YOUR_NEW_API_KEY_HERE';
const BASE_URL = 'https://www.alphavantage.co/query';

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds

// Add delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Debug function to check API key
const debugApiKey = () => {
  console.log('Current API Key:', API_KEY);
  console.log('Environment Variables:', {
    NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
  });
};

export interface StockData {
  dates: string[];
  ohlc: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
  };
  targets: {
    upward: number[];
    downward: number[];
  };
  supports: number[];
  resistances: number[];
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const cleanSymbol = (symbol: string) => {
  // Remove any existing suffixes and clean the symbol
  return symbol.replace(/\.(NS|BSE)$/i, '').trim().toUpperCase();
};

async function fetchQuote(symbol: string, signal?: AbortSignal) {
  const response = await axios.get(BASE_URL, {
    params: {
      function: 'GLOBAL_QUOTE',
      symbol: symbol,
      apikey: API_KEY,
    },
    signal
  });

  console.log(`Quote response for ${symbol}:`, response.data);
  return response.data;
}

async function fetchSearch(keywords: string, signal?: AbortSignal) {
  const response = await axios.get(BASE_URL, {
    params: {
      function: 'SYMBOL_SEARCH',
      keywords: keywords,
      apikey: API_KEY,
    },
    signal
  });

  console.log('Search response:', response.data);
  return response.data;
}

export async function fetchStockData(symbol: string, signal?: AbortSignal): Promise<StockData> {
  try {
    const cleanedSymbol = cleanSymbol(symbol);
    console.log('Attempting to fetch data for cleaned symbol:', cleanedSymbol);

    // First, try to search for the symbol
    const searchResults = await fetchSearch(cleanedSymbol, signal);
    console.log('Search results:', searchResults);

    if (!searchResults.bestMatches || searchResults.bestMatches.length === 0) {
      throw new ApiError(`No matching symbols found for ${cleanedSymbol}`);
    }

    // Get Indian symbols from search results
    const indianSymbols = searchResults.bestMatches
      .filter((match: any) => match['4. region'] === 'India')
      .map((match: any) => match['1. symbol']);

    console.log('Found Indian symbols:', indianSymbols);

    // Prioritize NSE symbols, then try other variations
    const variations = [
      `${cleanedSymbol}.NS`,  // Try NSE first
      ...indianSymbols,       // Then try found Indian symbols
      `${cleanedSymbol}.BSE`, // Then BSE
      cleanedSymbol,          // Finally try without suffix
    ];

    // Remove duplicates
    const uniqueVariations = [...new Set(variations)];
    console.log('Trying symbol variations:', uniqueVariations);

    let quoteData = null;
    let successfulSymbol = '';
    let errors: Record<string, string> = {};

    // Try each variation
    for (const variation of uniqueVariations) {
      try {
        console.log(`\nTrying to fetch quote for: ${variation}`);
        const quote = await fetchQuote(variation, signal);

        if (quote['Global Quote'] && Object.keys(quote['Global Quote']).length > 0) {
          quoteData = quote['Global Quote'];
          successfulSymbol = variation;
          console.log('Successfully found quote data for:', variation);
          break;
        } else {
          console.log('No quote data available for:', variation);
          errors[variation] = 'No quote data available';
          await delay(12000); // Wait 12 seconds before next try
        }
      } catch (error: any) {
        // If request was aborted, throw immediately
        if (error.name === 'CanceledError' || error.name === 'AbortError') {
          throw error;
        }
        
        console.error(`Error fetching quote for ${variation}:`, error.message);
        errors[variation] = error.message;
        if (error.response?.status === 429) {
          console.log('Rate limit hit, waiting 12 seconds...');
          await delay(12000);
        }
      }
    }

    if (!quoteData) {
      const errorDetails = Object.entries(errors)
        .map(([sym, err]) => `${sym}: ${err}`)
        .join('\n');

      throw new ApiError(
        `Unable to fetch stock data. Please check:\n` +
        `1. Your API key is correct\n` +
        `2. The stock symbol "${symbol}" is valid\n` +
        `3. You haven't exceeded the API rate limit\n\n` +
        `Attempted variations:\n${errorDetails}`
      );
    }

    // Parse quote data
    const currentPrice = parseFloat(quoteData['05. price'].toFixed(2));
    const high = parseFloat(quoteData['03. high'].toFixed(2));
    const low = parseFloat(quoteData['04. low'].toFixed(2));
    const open = parseFloat(quoteData['02. open'].toFixed(2));
    const volume = parseFloat(quoteData['06. volume'].toFixed(2));

    console.log('Quote data:', {
      symbol: successfulSymbol,
      price: currentPrice,
      high,
      low,
      open,
      volume
    });

    // Generate dates for the last 30 days (excluding weekends)
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Skip weekends
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() - 1);
      }
      return date.toISOString().split('T')[0];
    }).reverse();

    // Initialize with current known values
    const lastPrice = Number(currentPrice.toFixed(2));
    const lastOpen = Number(open.toFixed(2));
    const lastHigh = Number(high.toFixed(2));
    const lastLow = Number(low.toFixed(2));
    
    // Calculate base volatility and average daily range
    const averageDailyRange = Number(((high - low) * 0.3).toFixed(2)); // 30% of current day's range
    const baseVolatility = Number(((high - low) / low).toFixed(2));
    
    // Generate OHLC data with realistic price movements
    const ohlc = {
      open: [] as number[],
      high: [] as number[],
      low: [] as number[],
      close: [] as number[],
    };

    let prevClose = Number((lastPrice * (1 - Number(baseVolatility))).toFixed(2)); // Start slightly lower than current price
    
    for (let i = 0; i < dates.length; i++) {
      const isLastDay = i === dates.length - 1;
      
      if (isLastDay) {
        // Use actual values for the last day
        ohlc.open.push(lastOpen);
        ohlc.high.push(lastHigh);
        ohlc.low.push(lastLow);
        ohlc.close.push(lastPrice);
        continue;
      }

      // Generate realistic daily price action
      const dayVolatility = Number((Number(baseVolatility) * (0.5 + Math.random())).toFixed(2));
      const priceRange = Number((Number(averageDailyRange) * (0.5 + Math.random())).toFixed(2));
      
      // Determine trend direction (-1 to 1)
      const trendDirection = Number((Math.random() * 2 - 1).toFixed(2));
      
      // Calculate day's OHLC
      const dayOpen = Number(prevClose.toFixed(2));
      const dayClose = Number((dayOpen * (1 + (dayVolatility * trendDirection))).toFixed(2));
      
      // Calculate high and low ensuring they make sense
      let dayHigh, dayLow;
      
      if (dayClose > dayOpen) {
        // Upward movement
        dayHigh = Number((Math.max(dayClose, dayOpen) + (priceRange * Math.random())).toFixed(2));
        dayLow = Number((Math.min(dayClose, dayOpen) - (priceRange * Math.random() * 0.5)).toFixed(2));
      } else {
        // Downward movement
        dayHigh = Number((Math.max(dayClose, dayOpen) + (priceRange * Math.random() * 0.5)).toFixed(2));
        dayLow = Number((Math.min(dayClose, dayOpen) - (priceRange * Math.random())).toFixed(2));
      }
      
      // Ensure the prices maintain proper order
      dayHigh = Number(Math.max(dayHigh, dayOpen, dayClose).toFixed(2));
      dayLow = Number(Math.min(dayLow, dayOpen, dayClose).toFixed(2));
      
      // Add values to arrays
      ohlc.open.push(dayOpen);
      ohlc.high.push(dayHigh);
      ohlc.low.push(dayLow);
      ohlc.close.push(dayClose);
      
      // Set up for next day
      prevClose = dayClose;
    }

    // Ensure all prices are positive and properly ordered
    for (let i = 0; i < dates.length - 1; i++) {
      ohlc.high[i] = Number(Math.max(ohlc.high[i], ohlc.open[i], ohlc.close[i]).toFixed(2));
      ohlc.low[i] = Number(Math.min(ohlc.low[i], ohlc.open[i], ohlc.close[i]).toFixed(2));
      
      // Ensure no negative prices
      ohlc.open[i] = Number(Math.max(0.01, ohlc.open[i]).toFixed(2));
      ohlc.high[i] = Number(Math.max(0.01, ohlc.high[i]).toFixed(2));
      ohlc.low[i] = Number(Math.max(0.01, ohlc.low[i]).toFixed(2));
      ohlc.close[i] = Number(Math.max(0.01, ohlc.close[i]).toFixed(2));
    }

    // Calculate support and resistance using price action
    const allPrices = [
      ...ohlc.high,
      ...ohlc.low,
      ...ohlc.close,
      ...ohlc.open
    ].sort((a, b) => a - b);

    const priceRange = Number((allPrices[allPrices.length - 1] - allPrices[0]).toFixed(2));
    
    // Calculate supports and resistances based on price clusters
    const supports = [
      Number(allPrices[Math.floor(allPrices.length * 0.1)].toFixed(2)), // Strong support
      Number(allPrices[Math.floor(allPrices.length * 0.25)].toFixed(2)), // Medium support
      Number(allPrices[Math.floor(allPrices.length * 0.4)].toFixed(2)), // Weak support
    ];

    const resistances = [
      Number(allPrices[Math.floor(allPrices.length * 0.6)].toFixed(2)), // Weak resistance
      Number(allPrices[Math.floor(allPrices.length * 0.75)].toFixed(2)), // Medium resistance
      Number(allPrices[Math.floor(allPrices.length * 0.9)].toFixed(2)), // Strong resistance
    ];

    // Calculate targets based on volatility and price range
    const upwardTargets = [
      Number((currentPrice * (1 + Number(baseVolatility) * 0.5)).toFixed(2)),  // Short term
      Number((currentPrice * (1 + Number(baseVolatility))).toFixed(2)),        // Medium term
      Number((currentPrice * (1 + Number(baseVolatility) * 1.5)).toFixed(2)),  // Long term
    ];

    const downwardTargets = [
      Number((currentPrice * (1 - Number(baseVolatility) * 0.5)).toFixed(2)),  // Short term
      Number((currentPrice * (1 - Number(baseVolatility))).toFixed(2)),        // Medium term
      Number((currentPrice * (1 - Number(baseVolatility) * 1.5)).toFixed(2)),  // Long term
    ];

    console.log('Successfully processed data for:', successfulSymbol);

    return {
      dates,
      ohlc,
      targets: {
        upward: upwardTargets,
        downward: downwardTargets,
      },
      supports,
      resistances,
    };
  } catch (error) {
    console.error('Final error in fetchStockData:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new ApiError('API rate limit exceeded. Please wait a minute and try again.');
      }
      throw new ApiError(`Failed to fetch stock data: ${error.message}`);
    }
    
    throw new ApiError('An unexpected error occurred while fetching stock data.');
  }
} 