# Architecture Documentation

## System Overview

# Prediction Pool - Architecture

Prediction Pool is a full-stack decentralized prediction market platform with three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  - Bet placement UI                                          │
│  - Live odds display                                         │
│  - Wallet integration                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Express)                  │
│  - TxLINE SSE stream relay                                   │
│  - REST API                                                  │
│  - Keeper bot                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SOLANA PROGRAM (Anchor/Rust)                    │
│  - USDC escrow                                               │
│  - Bet management                                            │
│  - Settlement via CPI                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TxLINE API (TxODDS)                       │
│  - SSE: Live odds/scores                                     │
│  - REST: Merkle proofs                                       │
│  - On-chain: validate_stat CPI                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Next.js)

**Tech Stack:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- @solana/wallet-adapter-react
- @coral-xyz/anchor

**Key Components:**
- `MatchList` - Browse World Cup matches
- `BetSlip` - Place bets with stake input
- `LiveScores` - Real-time score updates via SSE
- `MyBets` - User's active and settled bets
- `ClaimButton` - Claim winnings UI

**State Management:**
- React Query for server state
- Zustand for client state
- Wallet connection state

---

### 2. Backend (Node.js + Express)

**Tech Stack:**
- Express.js
- TypeScript
- @coral-xyz/anchor
- @solana/web3.js
- eventsource (SSE client)

**API Endpoints:**
```
GET  /health                    - Health check
GET  /api/pools                 - List all pools
GET  /api/pools/:fixtureId      - Pool details
GET  /api/odds/:fixtureId       - Live odds
GET  /api/scores/:fixtureId     - Score snapshot
GET  /stream/scores             - SSE scores stream
POST /api/admin/settle/:fixtureId - Manual settlement
```

**Keeper Bot:**
- Monitors TxLINE scores SSE stream
- Detects match endings (gameState = 'FT' or 'ENDED')
- Fetches Merkle proof from TxLINE API
- Triggers settlement transaction via CPI

---

### 3. Solana Program (Anchor)

**Program ID:** `PredPool111111111111111111111111111111111111111` (placeholder)

**PDAs:**
```rust
// Pool PDA
seeds = [b"pool", fixture_id, outcome_type]

// Bet PDA
seeds = [b"bet", fixture_id, outcome_type, user]

// Escrow Token Account
Owned by pool PDA

// Daily Scores Roots (TxLINE)
seeds = [b"daily_scores_roots", epoch_day]
```

**Instructions:**
1. `initialize_pool` - Create prediction pool for fixture/outcome
2. `place_bet` - Lock USDC and create bet account
3. `settle_pool` - Validate outcome via CPI, mark pool settled
4. `claim_winnings` - Winners withdraw payout

**CPI Flow:**
```rust
// 1. Fetch Merkle proof from TxLINE API
let validation = txline_client.get_stat_validation(...).await?;

// 2. Prepare validate_stat instruction
let ix = Instruction {
    program_id: TXLINE_PROGRAM_ID,
    accounts: vec![...],
    data: serialize_validate_stat(...),
};

// 3. Execute CPI
invoke_signed(&ix, &[...], &[])?;

// 4. Check return value (boolean)
let is_valid = get_return_data()?.data[0] == 0x01;

// 5. If valid, release funds to winners
```

---

### 4. TxLINE Integration

**Authentication Flow:**
1. Get guest JWT: `POST /auth/guest/start`
2. Subscribe on-chain: `program.methods.subscribe(12, 4)` (Level 12 = real-time, free for hackathon)
3. Activate token: `POST /api/token/activate`

**SSE Streams:**
```typescript
// Odds stream
const stream = await fetch(`${BASE_URL}/api/odds/stream`, {
  headers: {
    Authorization: `Bearer ${jwt}`,
    'X-Api-Token': apiToken,
    Accept: 'text/event-stream',
  },
});

// Scores stream (same pattern)
```

**Merkle Proof Verification:**
```typescript
const validation = await axios.get(
  `${BASE_URL}/api/scores/stat-validation`,
  { params: { fixtureId, seq, statKey } }
);

// validation.data contains:
// - summary: fixture metadata
// - subTreeProof: event → batch
// - mainTreeProof: batch → daily root
// - statToProve: the stat being validated
// - statProof: stat → event root
```

---

## Data Flow

### Bet Placement Flow
```
User → Frontend → Backend API → Solana Program → USDC Escrow
                                              ↓
                                      Event: BetPlaced
```

### Settlement Flow
```
Match Ends → TxLINE SSE → Keeper Bot → Fetch Merkle Proof
                                           ↓
                                    CPI to validate_stat
                                           ↓
                                      On-chain Verification
                                           ↓
                                      Pool Marked Settled
                                           ↓
                                      Event: PoolSettled
```

### Claim Flow
```
User → Frontend → "Claim" Button → Solana Program
                                              ↓
                                      Verify Winner Status
                                              ↓
                                      Transfer USDC from Escrow
                                              ↓
                                      Event: WinningsClaimed
```

---

## Security Considerations

### 1. Escrow Security
- USDC locked in PDA-owned token account
- Only settlement instruction can release funds
- No admin key can withdraw (trustless)

### 2. Validation Security
- Merkle proof verified on-chain against published roots
- CPI into TxLINE program (cannot be spoofed)
- Transaction reverts if validation fails

### 3. Keeper Bot Security
- Permissionless settlement (anyone can trigger)
- Validation happens on-chain (bot cannot cheat)
- Failed validation = reverted transaction (bot loses SOL)

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel deploy
```

### Backend (Cloudflare Workers)
```bash
cd backend
npm run build
wrangler deploy
```

### Solana Program (Mainnet)
```bash
cd programs/prediction-pool
anchor build
anchor deploy --provider.cluster mainnet
```

---

## Monitoring

### Metrics to Track
- Total pools created
- Total USDC staked
- Settlement success rate
- Average settlement time
- Keeper bot uptime

### Logging
- All CPI calls logged
- Settlement attempts logged
- SSE connection status
- Error tracking (Sentry)

---

## Future Improvements

1. **Multi-outcome markets** - Beyond 1X2 (correct score, first scorer, etc.)
2. **AMM integration** - Automated market maker for liquidity
3. **Mobile app** - React Native version
4. **Social features** - Leaderboards, friend challenges
5. **Cross-chain** - Bridge to other chains via Wormhole

---

*Built for the Superteam World Cup Hackathon 2026*
