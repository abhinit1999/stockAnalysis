'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import LoadingSpinner from './LoadingSpinner';
import { fetchStockData, type StockData } from '@/utils/api';

interface StockAnalysisProps {
  symbol: string;
  onError: (message: string) => void;
}

// Dynamically import ApexCharts with a loading fallback
const Chart = dynamic(
  () => import('react-apexcharts'),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
);

export default function StockAnalysis({ symbol, onError }: StockAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    const getStockData = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setStockData(null); // Clear previous data
      
      try {
        console.log('Initiating fetch for symbol:', symbol);
        const data = await fetchStockData(symbol);
        
        // Only update state if component is still mounted
        if (isSubscribed) {
          console.log('Successfully received data for:', symbol);
          setStockData(data);
        }
      } catch (error: any) {
        // Only update error state if component is still mounted
        if (isSubscribed) {
          console.error('Error fetching stock data:', error);
          let errorMessage = 'Failed to fetch stock data';
          
          if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
              errorMessage = 'API rate limit exceeded. Please wait a minute before trying again.';
            } else if (error.message.includes('No data available') || error.message.includes('Unable to fetch data')) {
              errorMessage = `No data available for ${symbol}. Please check if the symbol is correct.`;
            } else {
              errorMessage = error.message;
            }
          }
          
          onError(errorMessage);
          setStockData(null);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    // Add a small delay before making the API call
    const timeoutId = setTimeout(() => {
      getStockData();
    }, 500);

    // Cleanup function
    return () => {
      isSubscribed = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol, onError]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!stockData || !symbol) {
    return null;
  }

  // Format current trading session data
  const currentSession = {
    price: stockData.ohlc.close[stockData.ohlc.close.length - 1].toFixed(2),
    open: stockData.ohlc.open[stockData.ohlc.open.length - 1].toFixed(2),
    high: stockData.ohlc.high[stockData.ohlc.high.length - 1].toFixed(2),
    low: stockData.ohlc.low[stockData.ohlc.low.length - 1].toFixed(2),
    close: stockData.ohlc.close[stockData.ohlc.close.length - 1].toFixed(2),
  };

  const chartOptions: ApexOptions = {
    chart: {
      type: 'candlestick',
      height: 400,
      background: '#1a1a1a',
      foreColor: '#999',
      animations: {
        enabled: true,
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
        autoSelected: 'zoom'
      },
    },
    grid: {
      show: true,
      borderColor: '#2a2a2a',
      strokeDashArray: 1,
      position: 'back',
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#26A69A',
          downward: '#EF5350'
        },
        wick: {
          useFillColor: true,
        }
      }
    },
    title: {
      text: `${symbol} Price Chart`,
      align: 'center',
      style: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#fff'
      },
    },
    annotations: {
      xaxis: [{
        x: new Date(stockData.dates[stockData.dates.length - 1]).getTime(),
        borderColor: '#999',
        label: {
          text: 'Last Session',
          style: {
            color: '#fff',
            background: '#1a1a1a'
          }
        }
      }]
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#999',
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM',
          day: 'dd',
        },
      },
      axisBorder: {
        color: '#2a2a2a'
      },
      axisTicks: {
        color: '#2a2a2a'
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        formatter: (value) => `₹${value.toFixed(2)}`,
        style: {
          colors: '#999',
        }
      },
      axisBorder: {
        color: '#2a2a2a'
      },
      axisTicks: {
        color: '#2a2a2a'
      },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '12px',
      },
      x: {
        show: true,
        format: 'dd MMM yyyy',
      },
      y: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
    },
  };

  const chartSeries = [{
    data: stockData.dates.map((date, index) => ({
      x: new Date(date).getTime(),
      y: [
        stockData.ohlc.open[index],
        stockData.ohlc.high[index],
        stockData.ohlc.low[index],
        stockData.ohlc.close[index],
      ],
    })),
  }];

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">{symbol} Analysis</h2>
      
      {/* Current Trading Session Info */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-1">Current Price</h4>
          <p className="text-lg font-bold text-gray-100">₹{currentSession.price}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-1">Open</h4>
          <p className="text-lg font-bold text-gray-100">₹{currentSession.open}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-1">High</h4>
          <p className="text-lg font-bold text-green-400">₹{currentSession.high}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-1">Low</h4>
          <p className="text-lg font-bold text-red-400">₹{currentSession.low}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-1">Close</h4>
          <p className="text-lg font-bold text-gray-100">₹{currentSession.close}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="w-full h-[400px]">
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="candlestick"
            height={400}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-100">Upward Targets</h3>
          <ul className="space-y-2">
            {stockData.targets.upward.map((target, index) => (
              <li key={`up-${index}`} className="text-green-400 font-medium">
                Target {index + 1}: ₹{target.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-100">Downward Targets</h3>
          <ul className="space-y-2">
            {stockData.targets.downward.map((target, index) => (
              <li key={`down-${index}`} className="text-red-400 font-medium">
                Target {index + 1}: ₹{target.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-100">Support Levels</h3>
          <ul className="space-y-2">
            {stockData.supports.map((support, index) => (
              <li key={`support-${index}`} className="text-blue-400 font-medium">
                Support {index + 1}: ₹{support.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-100">Resistance Levels</h3>
          <ul className="space-y-2">
            {stockData.resistances.map((resistance, index) => (
              <li key={`resistance-${index}`} className="text-purple-400 font-medium">
                Resistance {index + 1}: ₹{resistance.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 