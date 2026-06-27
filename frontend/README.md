# Prediction Pool - Frontend

React + TypeScript + Next.js frontend for the prediction pool hackathon project.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **@solana/wallet-adapter** - Wallet integration (Phantom, Solflare)
- **@coral-xyz/anchor** - Solana program interaction
- **react-query** - Server state management
- **zustand** - Client state management (bet slip)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PREDICTION_POOL_PROGRAM_ID=PredPool111111111111111111111111111111111111111
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout with wallet provider
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   │   ├── Header.tsx
│   │   ├── MatchList.tsx
│   │   ├── MatchCard.tsx
│   │   └── BetSlip.tsx
│   ├── contexts/             # React contexts
│   │   └── WalletContext.tsx
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client
│   │   └── transactions.ts   # Solana tx functions
│   ├── store/                # Zustand stores
│   │   └── betStore.ts
│   └── types/                # TypeScript types
│       └── index.ts
├── public/                   # Static assets
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Key Features

### 1. Wallet Integration
- Connect Phantom, Solflare, and other Solana wallets
- Automatic network detection (devnet/mainnet)
- Wallet modal for wallet selection

### 2. Match List
- Browse all World Cup matches
- Filter by status (all, live, upcoming)
- Display odds and total staked per outcome

### 3. Bet Placement
- Select outcome with one click
- Enter stake amount with quick buttons
- Real-time payout calculation
- Transaction confirmation

### 4. Live Updates
- SSE stream for live scores
- Real-time odds updates
- Automatic match status tracking

## State Management

### Client State (Zustand)
- `betStore` - Manages bet slip state
  - Selected fixture
  - Selected outcome
  - Stake amount
  - Odds

### Server State (React Query)
- `pools` - All prediction pools
- `poolDetails` - Individual pool data
- `liveOdds` - Real-time odds
- `score` - Current match score

## API Integration

The frontend communicates with the backend API:

```typescript
// Get all pools
const pools = await apiClient.getPools();

// Get pool details
const pool = await apiClient.getPoolDetails(fixtureId);

// Connect to SSE stream
const stream = apiClient.connectScoresStream(
  fixtureId,
  (update) => console.log('Score update:', update)
);
```

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Manual Build

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT - Built for the Superteam World Cup Hackathon 2026
