# 🔑 Complete Credential Setup Guide

## Quick Start (15 Minutes Total)

Follow these steps in order to get all credentials needed.

---

## 1️⃣ Solana Wallet (2 minutes)

### Option A: Phantom Wallet (Recommended - Easiest)

1. **Install Phantom**
   - Go to: https://phantom.app
   - Download browser extension
   - Click "Create new wallet"

2. **Save Seed Phrase**
   - Write down the 12-24 words
   - **NEVER share this with anyone!**
   - Store securely (password manager, paper, etc.)

3. **Copy Your Public Key**
   - Click the wallet icon
   - Click the copy button next to your address
   - Save this - you'll need it!

### Option B: CLI Wallet (Advanced)

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/id.json

# View your public key
solana-keygen pubkey
```

---

## 2️⃣ Get SOL for Transaction Fees

### For Mainnet (Production):

**Why:** You need real SOL to pay for transaction fees on mainnet

1. Buy SOL on an exchange (Coinbase, Binance, etc.)
2. Withdraw to your Phantom wallet
3. **Amount needed:** ~0.01 SOL for fees (deployment needs ~2-3 SOL)

### For Devnet (Testing - FREE):

**Why:** You need SOL to pay for transaction fees on devnet (testnet)

### Using Phantom (Devnet Testing):

1. Open Phantom wallet
2. Switch to **Devnet** (click network selector at top)
3. Click "Receive" or "Deposit"
4. Click "Get Devnet SOL" or go to: https://faucet.solana.com
5. Paste your wallet address
6. Click "Request Airdrop"
7. Wait ~10 seconds - you'll receive 2 SOL (free!)

### Using CLI:

```bash
# Get your wallet address
solana-keygen pubkey

# Request airdrop (replace with your address)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Check balance
solana balance --url devnet
```

**Expected:** 
- **Mainnet:** Real SOL balance (e.g., 0.5 SOL)
- **Devnet:** 2 SOL (testnet, free)

---

## 3️⃣ Get TxLINE API Credentials (10 minutes)

### Step 1: Get Guest JWT Token

**Method A: Using curl (Terminal)**

```bash
curl -X POST https://txline.txodds.com/auth/guest/start \
  -H "Content-Type: application/json" \
  | jq -r '.token'
```

**Method B: Using JavaScript (Node.js)**

```bash
# Create a test file
cat > get-jwt.js << 'EOF'
const axios = require('axios');

async function getJWT() {
  const response = await axios.post('https://txline.txodds.com/auth/guest/start');
  console.log('JWT Token:', response.data.token);
  console.log('\nSave this token!');
}

getJWT().catch(console.error);
EOF

# Run it
node get-jwt.js
```

**Method C: Using Postman/Insomnia**

1. Create new POST request
2. URL: `https://txline.txodds.com/auth/guest/start`
3. Headers: `Content-Type: application/json`
4. Send
5. Copy the `token` from response

**Save this JWT token!** Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### Step 2: Activate API Token (Hackathon Free Tier)

For the **hackathon free tier**, you can use the guest JWT directly without on-chain subscription!

**Test your JWT:**

```bash
# Replace YOUR_JWT_TOKEN with the token from Step 1
curl -X GET https://txline.txodds.com/api/scores/snapshot/17952170 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**If it works:** You'll get match data back ✅

**If it fails:** You may need to activate the token (see below)

---

### Step 3: (Optional) Full Activation with On-Chain Subscription

If the guest JWT doesn't work, follow the full activation:

**A. Get Transaction Signature**

You need to call the `subscribe` instruction on the TxLINE program.

**Using their SDK (recommended):**

```bash
# Install dependencies
npm install @coral-xyz/anchor @solana/web3.js

# Create subscription script (see scripts/subscribe-txline.js)
node scripts/subscribe-txline.js
```

**B. Activate Token**

```bash
# You'll need:
# - txSig: Transaction signature from subscription
# - walletSignature: Signature from your wallet
# - jwt: Your JWT from Step 1

curl -X POST https://txline.txodds.com/api/token/activate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txSig": "YOUR_TRANSACTION_SIGNATURE",
    "walletSignature": "YOUR_WALLET_SIGNATURE",
    "leagues": []
  }'
```

**Response:**
```json
{
  "token": "your_long_lived_api_token_here"
}
```

**Save this API token!** This is your long-lived access token.

---

## 4️⃣ Get USDC for Betting

### For Mainnet (Production):

**Why:** You need real USDC to place real bets

1. Buy USDC on an exchange
2. Bridge to Solana (or withdraw directly if supported)
3. **Amount needed:** Whatever you want to bet (minimum ~10 USDC for testing)

### Method A: Bridge USDC to Mainnet

1. Use a bridge like https://portalbridge.com or https://allbridge.io
2. Bridge USDC from Ethereum/other chains to Solana mainnet
3. Wait for bridge confirmation (~10-30 minutes)

### For Devnet (Testing - FREE):

**Why:** You need USDC to test placing bets

### Method B: Mint Devnet USDC (Testing Only)

```bash
# USDC mint address on devnet
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Create token account
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Mint devnet USDC (if you have mint authority - usually need faucet)
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1000000 YOUR_WALLET_ADDRESS
```

### Method C: Use Devnet USDC Faucet (Testing Only)

1. Go to: https://faucet.solana.com (or search "devnet USDC faucet")
2. Select USDC token
3. Enter your wallet address
4. Request tokens
5. Wait for confirmation

### Method D: Skip for Now

You can test the frontend **without real USDC** by:
- Using mock transactions in the frontend
- Testing UI flow only
- Adding real USDC later for full demo

---

## 5️⃣ Configure Your Environment Files

### Backend `.env`

```bash
cd world-cup-prediction-pool
cp backend/.env.example backend/.env
nano backend/.env
```

**Fill in:**
```bash
# TxLINE API Configuration
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # From Step 3
TXLINE_API_TOKEN=your_api_token_here  # From Step 3 (if activated)

# Solana Configuration (Mainnet - Production)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed
TXLINE_PROGRAM_ID=9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA

# Program IDs (update after deployment)
PREDICTION_POOL_PROGRAM_ID=PredPool111111111111111111111111111111111111111

# For testing, use devnet:
# SOLANA_RPC_URL=https://api.devnet.solana.com
# TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J

# Keeper Bot Configuration
ENABLE_KEEPER_BOT=true
KEEPER_WALLET_PATH=/home/youruser/.config/solana/id.json

# Server Configuration
PORT=8080
NODE_ENV=development
```

### Frontend `.env.local`

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

**Fill in:**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PREDICTION_POOL_PROGRAM_ID=PredPool111111111111111111111111111111111111111
NEXT_PUBLIC_TXLINE_PROGRAM_ID=9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA

# For testing, use devnet:
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# NEXT_PUBLIC_TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
```

---

## ✅ Verification Checklist

Test each credential:

### 1. Wallet
```bash
# Mainnet (production)
solana balance --url mainnet-beta
# Should show: Your real SOL balance

# Devnet (testing)
solana balance --url devnet
# Should show: 2 SOL (or more)
```

### 2. TxLINE JWT
```bash
curl -X GET https://txline.txodds.com/api/scores/snapshot/17952170 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Should return JSON with match data
```

### 3. Backend
```bash
cd backend
npm install
npm run dev
# Should start on http://localhost:8080
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Should start on http://localhost:3000
```

---

## 🎯 Quick Test Flow

1. Open http://localhost:3000
2. Connect Phantom wallet (devnet)
3. Browse matches
4. Select an outcome
5. Enter stake (e.g., 100 USDC)
6. Click "Place Bet"
7. Approve transaction in Phantom
8. See confirmation!

---

## 🆘 Troubleshooting

### "Invalid JWT"
- Make sure you copied the entire token (no spaces)
- JWT expires after 30 days - get a new one if old
- Try activating the token with on-chain subscription

### "Insufficient funds"
- Get more devnet SOL: https://faucet.solana.com
- Check you're on devnet network in Phantom

### "Cannot connect to backend"
- Make sure backend is running: `npm run dev`
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`

### "Program not found"
- Deploy the program first: `./scripts/deploy.sh devnet`
- Update `PREDICTION_POOL_PROGRAM_ID` in both `.env` files

---

## 📞 Support Resources

- **TxLINE Docs:** https://txline.txodds.com/documentation/worldcup
- **Solana Docs:** https://docs.solana.com
- **Anchor Docs:** https://www.anchor-lang.com
- **Phantom Support:** https://help.phantom.app

---

**Total Time:** ~15-20 minutes  
**Total Cost:** 
- **Mainnet:** ~0.01 SOL for fees + your betting capital
- **Devnet:** FREE (testnet)

Good luck! 🚀
