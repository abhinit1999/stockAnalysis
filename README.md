# Indian Stock Analyzer

A real-time stock analysis application for Indian stocks that provides candlestick charts, support/resistance levels, and price targets.

## Features

- Real-time stock data from Alpha Vantage API
- Interactive candlestick charts
- Support and resistance levels
- Price targets (upward and downward)
- Current trading session information
- Dark theme UI
- Mobile responsive design

## Prerequisites

- Node.js 18+ installed
- Alpha Vantage API key (get it from [Alpha Vantage](https://www.alphavantage.co/support/#api-key))

## Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd stockscreener
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

1. Create a [Vercel account](https://vercel.com/signup) if you don't have one

2. Install Vercel CLI:
```bash
npm install -g vercel
```

3. Login to Vercel:
```bash
vercel login
```

4. Deploy the application:
```bash
vercel
```

5. Add your environment variable:
   - Go to your project settings in Vercel dashboard
   - Navigate to "Environment Variables"
   - Add `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` with your API key

6. For production deployment:
```bash
vercel --prod
```

## Environment Variables

- `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY`: Your Alpha Vantage API key

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- ApexCharts
- Alpha Vantage API

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
