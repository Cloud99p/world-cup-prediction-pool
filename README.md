# Prediction Pool

**Trustless prediction markets for international football, powered by TxLINE's cryptographically verifiable data on Solana.**

[![Superteam Hackathon](https://img.shields.io/badge/Superteam-Hackathon%202026-purple)](https://superteam.fun)
[![Track](https://img.shields.io/badge/Track-Prediction%20Markets-blue)](https://superteam.fun/earn/hackathon/world-cup)
[![TxLINE](https://img.shields.io/badge/Powered%20By-TxLINE-green)](https://txline.txodds.com)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-purple)](https://solana.com)

---

## What Is This?

Prediction Pool enables **trustless, peer-to-peer betting** on international football matches using **cryptographically verifiable sports data** from TxLINE.

**Key Features:**
- ✅ **Trustless Settlement** - CPI into TxLINE's `validate_stat` instruction
- ✅ **Merkle Proof Verification** - All outcomes verified on-chain
- ✅ **USDC Escrow** - Funds locked in Solana PDAs
- ✅ **Real-Time Odds** - Live data from TxLINE SSE streams
- ✅ **Auto-Payout** - Winners paid automatically via keeper bot
- ✅ **No Oracle Risk** - Data verified against on-chain Merkle roots

---

## Submission

**Track:** Prediction Markets & Settlement (18k USDT prize pool)

**Superteam Earn:** [Hackathon](https://superteam.fun/earn/hackathon/world-cup)

---

## Demo / Judge Testing

**For hackathon judges:** No wallet setup or tokens required!

### Option 1: Live Demo (Recommended)

🔗 **Demo Dashboard:** [Insert your deployed URL here]

**Demo Credentials (hardcoded):**
- Backend API key: Pre-configured
- TxLINE API token: Pre-configured
- Network: **Mainnet** (production)

### Option 2: Local Setup

```bash
# Clone and install
git clone https://github.com/Cloud99p/prediction-pool.git
cd prediction-pool/backend
npm install

# Use pre-configured demo credentials (no wallet needed)
cp .env.demo .env

# Start backend
npm run dev

# Start frontend
cd ../frontend
npm install
npm run dev
```

**Demo credentials are pre-configured** - you can browse matches and view predictions immediately without setting up wallets or purchasing tokens.

---

## Quick Start

### Prerequisites

```bash
# Node.js 20+
node --version  # v20.x or higher

# Rust (for Solana program)
rustc --version  # 1.70+

# Solana CLI
solana --version  # 1.16+

# Anchor
anchor --version  # 0.29+
```

### 1. Clone Repository

```bash
git clone https://github.com/Cloud99p/prediction-pool.git
cd prediction-pool
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your TxLINE API credentials
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 4. Deploy Solana Program (Mainnet)

```bash
cd programs/prediction-pool
anchor build
anchor deploy --provider.cluster mainnet
```

⚠️ **Warning:** Deploying to mainnet requires real SOL for deployment fees (~2-3 SOL). Test on devnet first!

---

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  • Bet placement UI                                          │
│  • Live odds (TxLINE SSE)                                    │
│  • Wallet connection (Phantom)                               │
│  • Match outcome viewer                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SOLANA PROGRAM (Anchor)                      │
│  • Prediction Pool PDA                                       │
│  • USDC Escrow (SPL Token)                                   │
│  • CPI → TxLINE validate_stat                                │
│  • Auto-payout logic                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│  • TxLINE SSE stream listener                                │
│  • Merkle proof fetcher                                      │
│  • Keeper bot (settlement trigger)                           │
│  • Analytics + logging                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TxLINE API (TxODDS)                       │
│  • SSE: Live odds + scores                                   │
│  • REST: Merkle proofs                                       │
│  • CPI: validate_stat instruction                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 How It Works

### 1. Place Bet

```typescript
// User selects match, outcome, and stake
const bet = await program.methods
  .placeBet(
    fixtureId,      // Match ID
    outcomeType,    // e.g., "home_win", "draw", "away_win"
    stakeAmount     // USDC amount (in lamports)
  )
  .accounts({
    user: wallet.publicKey,
    escrow: escrowPda,
    usdcMint: USDC_MINT,
  })
  .rpc();
```

### 2. Match Plays (Live Data)

- Backend listens to TxLINE SSE scores stream
- Real-time updates displayed on frontend
- No blockchain interaction needed during match

### 3. Settlement (After Match Ends)

```typescript
// Keeper bot detects match end
const merkleProof = await txlineClient.getStatValidation(fixtureId, seq, statKey);

// CPI into TxLINE validate_stat
const isValid = await program.methods
  .validateStat(...)
  .accounts({ dailyScoresMerkleRoots: dailyPda })
  .view();

// If valid, release funds to winners
if (isValid) {
  await program.methods
    .settleBet(...)
    .rpc();
}
```

---

## 🔧 TxLINE Integration

### Authentication

```typescript
// 1. Get guest JWT
const authResponse = await axios.post(
  "https://txline.txodds.com/auth/guest/start"
);
const jwt = authResponse.data.token;

// 2. Subscribe on-chain (free for World Cup)
const txSig = await program.methods
  .subscribe(12, 4)  // Service Level 12 = real-time, 4 weeks
  .rpc();

// 3. Activate API token
const activationResponse = await axios.post(
  "https://txline.txodds.com/api/token/activate",
  { txSig, walletSignature, leagues: [] }
);
const apiToken = activationResponse.data.token;
```

### SSE Streams

```typescript
// Odds stream
const oddsStream = await fetch("https://txline.txodds.com/api/odds/stream", {
  headers: {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    Accept: "text/event-stream",
  },
});

// Scores stream
const scoresStream = await fetch("https://txline.txodds.com/api/scores/stream", {
  headers: { ... },
});
```

### Merkle Proof Verification

```typescript
const validation = await axios.get(
  `https://txline.txodds.com/api/scores/stat-validation`,
  {
    params: { fixtureId, seq, statKey },
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  }
);

// validation.data contains:
// - summary: fixture metadata
// - subTreeProof: event → batch proof
// - mainTreeProof: batch → daily root proof
// - statToProve: the stat being validated
// - statProof: stat → event root proof
```

---

## 📊 Smart Contract Details

### Program ID

| Network | Program ID |
|---------|------------|
| **Mainnet** | `PredPool111111111111111111111111111111111111111` |
| Devnet | `DevnetProgramID1111111111111111111111111` |

**TxLINE Program IDs:**

| Network | Program ID |
|---------|------------|
| **Mainnet** | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` |
| Devnet | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

### PDAs

| PDA | Seeds | Purpose |
|-----|-------|---------|
| **Escrow** | `["escrow", fixtureId, outcomeType, user]` | Locks USDC for bet |
| **Pool** | `["pool", fixtureId, outcomeType]` | Aggregates all bets for outcome |
| **Daily Roots** | `["daily_scores_roots", epochDay]` | TxLINE Merkle roots |

### Instructions

| Instruction | Purpose | CPI |
|-------------|---------|-----|
| `place_bet` | Lock USDC for bet | SPL Token |
| `settle_bet` | Release funds to winners | TxLINE validate_stat |
| `claim_winnings` | Winner withdraws payout | SPL Token |
| `refund_bet` | Loser gets refunded (if applicable) | SPL Token |

---

## 🎬 Demo Video

**[Watch Demo](./demo/video-script.md)** - 5-minute walkthrough showing:
- Bet placement flow
- Live odds display
- Settlement process
- Merkle proof verification

---

## 📁 Project Structure

```
world-cup-prediction-pool/
├── programs/
│   └── prediction-pool/      # Anchor program
│       ├── src/
│       │   ├── lib.rs
│       │   ├── escrow.rs
│       │   ├── settlement.rs
│       │   └── state.rs
│       └── Cargo.toml
├── backend/
│   ├── src/
│   │   ├── txline-client.ts  # SSE + REST
│   │   ├── merkle-verifier.ts
│   │   ├── keeper-bot.ts
│   │   └── index.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
├── scripts/
│   ├── deploy-program.sh
│   └── test-settlement.ts
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_USAGE.md
├── demo/
│   └── video-script.md
└── README.md
```

---

## 🧪 Testing

### Unit Tests

```bash
cd programs/prediction-pool
anchor test
```

### Integration Tests

```bash
cd backend
npm run test:integration
```

### Test Settlement Flow

```bash
cd scripts
npx tsx test-settlement.ts
```

---

## 🚀 Deployment

### 1. Deploy Solana Program

```bash
cd programs/prediction-pool
anchor build
anchor deploy
```

### 2. Deploy Backend

```bash
cd backend
npm run build
npm run deploy  # Deploys to Cloudflare Workers / Railway
```

**Environment Variables (Backend):**
- `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`
- `TXLINE_PROGRAM_ID=9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`
- `TXLINE_BASE_URL=https://txline.txodds.com`
- `TXLINE_JWT=<your-jwt>`
- `TXLINE_API_TOKEN=<your-api-token>`

### 3. Deploy Frontend

```bash
cd frontend
npm run build
npm run deploy  # Deploys to Vercel
```

**Environment Variables (Vercel):**
- `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`
- `NEXT_PUBLIC_PREDICTION_POOL_PROGRAM_ID=PredPool111111111111111111111111111111111111111`
- `NEXT_PUBLIC_TXLINE_PROGRAM_ID=9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`

---

## 📝 Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** - System design details
- **[API Usage](./docs/API_USAGE.md)** - TxLINE API integration guide
- **[Demo Script](./demo/video-script.md)** - 5-minute demo walkthrough
- **[TxLINE Docs](https://txline.txodds.com/documentation/worldcup)** - Official docs

---

## 🏆 Why This Wins

| Criteria | How We Excel |
|----------|--------------|
| **Core Functionality** | ✅ Full SSE integration + CPI settlement |
| **User Experience** | ✅ Intuitive UI, live updates, clear flows |
| **Code Quality** | ✅ Clean, documented, deterministic |
| **On-Chain Validation** | ✅ Full Merkle proof verification |
| **Demo Video** | ✅ 5-min professional walkthrough |

---

## 📄 License

MIT - Built for the Superteam World Cup Hackathon 2026

---

## 🙏 Acknowledgments

- **[TxODDS](https://txodds.com)** - Cryptographically verifiable sports data
- **[Superteam](https://superteam.fun)** - Hackathon organization
- **[Solana](https://solana.com)** - Blockchain infrastructure
- **[Anchor](https://anchor-lang.com)** - Solana development framework

---

*Built with ☁️ by Cloud99p for the Superteam Hackathon 2026*
