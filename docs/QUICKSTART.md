# Quick Start Guide

## Get Started in 10 Minutes! ⚡

### 1. Clone & Setup

```bash
# Clone repository
git clone https://github.com/Cloud99p/world-cup-prediction-pool.git
cd world-cup-prediction-pool

# Run deployment script (devnet)
./scripts/deploy.sh devnet
```

### 2. Get TxLINE API Access

```bash
# 1. Get guest JWT
curl -X POST https://txline.txodds.com/auth/guest/start

# 2. Subscribe to free international football tier (Service Level 12 = real-time)
# Use Anchor to call subscribe instruction

# 3. Activate API token
# Follow activation flow in docs/API_USAGE.md
```

### 3. Configure Environment

```bash
# Edit backend/.env with your credentials
nano backend/.env

# Required:
# - TXLINE_JWT (from step 2)
# - TXLINE_API_TOKEN (from step 2)
# - SOLANA_RPC_URL
# - PREDICTION_POOL_PROGRAM_ID (from deployment)
```

### 4. Start Backend

```bash
cd backend
npm run dev
# Server running on http://localhost:8080
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
# App running on http://localhost:3000
```

### 6. Test It Out!

1. Open http://localhost:3000
2. Connect Phantom wallet
3. Browse World Cup matches
4. Place a test bet (use devnet USDC)
5. Watch live scores via SSE
6. (After match) Claim winnings!

---

## Testing Settlement

### Manual Settlement Trigger

```bash
# Trigger settlement for a specific fixture
curl -X POST http://localhost:8080/api/admin/settle/17952170
```

### Test with Historical Data

```bash
# Use historical match data (available 2 weeks to 6 hours ago)
curl http://localhost:8080/api/scores/17952170
```

---

## Common Issues

### "Invalid API token"
- Make sure you activated your token after on-chain subscription
- Check JWT and API token in .env

### "Program not found"
- Deploy the program first: `./scripts/deploy.sh devnet`
- Update PROGRAM_ID in .env

### "Insufficient funds"
- Fund your devnet wallet: `solana airdrop 2`
- Get devnet USDC from faucet

---

## Next Steps

- 📖 Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design
- 🎬 Follow [video-script.md](./demo/video-script.md) for demo recording
- 📚 Check [TxLINE docs](https://txline.txodds.com/documentation/worldcup) for API details

---

**Need help?** Check the full README or open an issue on GitHub!
