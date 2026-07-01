# TxLINE Scripts

Helper scripts for TxLINE API integration.

---

## 🔍 Diagnostic Scripts

### check-pricing-matrix.ts

**Checks if the pricing_matrix PDA exists and is initialized on-chain.**

Run this FIRST before attempting subscription.

```bash
npx tsx scripts/check-pricing-matrix.ts
```

**Output:**
- ✅ `pricing_matrix PDA exists!` - Ready to subscribe
- ❌ `pricing_matrix PDA does NOT exist` - Contact TxODDS support

---

## 📋 Subscription Flow

### Step 1: Check pricing_matrix (REQUIRED)

```bash
npx tsx scripts/check-pricing-matrix.ts
```

**If this fails, stop!** Contact TxODDS support (Aidan) to initialize pricing_matrix on mainnet.

---

### Step 2: Subscribe to Free Tier

```bash
npx tsx scripts/subscribe-free-tier.ts
```

**Output:** Transaction signature (txSig)

Example:
```
✅ Subscription successful!
🔗 Transaction: https://solscan.io/tx/5KtP7xQj9mN3vR8wL2hF6yD4cB1aE9sT0uX7iG3pK4mZ...
```

**Copy the txSig!**

---

### Step 3: Activate API Token

```bash
npx tsx scripts/activate-token.ts <TX_SIGNATURE>
```

Example:
```bash
npx tsx scripts/activate-token.ts 5KtP7xQj9mN3vR8wL2hF6yD4cB1aE9sT0uX7iG3pK4mZ...
```

**Output:** API Token (automatically saved to `.env`)

---

### Step 4: Test API Access

```bash
curl -X GET "https://txline.txodds.com/api/scores/snapshot/17952170" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "X-Api-Token: YOUR_API_TOKEN"
```

---

## 🔧 Troubleshooting

### pricing_matrix PDA does not exist

**Error:**
```
❌ pricing_matrix PDA does NOT exist on-chain!
```

**Solution:** Contact TxODDS team

- 📧 Email: support@txodds.com
- 💬 Discord: https://discord.gg/txodds (reference ticket-0013)
- 🐙 GitHub: https://github.com/txodds/tx-on-chain

**Message:**
> "The pricing_matrix PDA needs to be initialized on mainnet for the subscribe instruction to work. Please call `initializePricingMatrix()` with ServiceRow entries for Service Level 1 (60s delay) and Service Level 12 (real-time)."

---

### 403 Forbidden on activation

**Error:**
```
❌ Activation failed: 403 Forbidden
```

**Common causes:**
1. pricing_matrix not initialized (see above)
2. Invalid txSig (subscription tx failed)
3. Wallet mismatch (use same wallet for subscribe + activate)
4. Wrong network (devnet txSig won't work on mainnet API)

---

### Insufficient SOL

**Error:**
```
❌ Subscription failed: insufficient lamports
```

**Solution:** Fund wallet with at least 0.05 SOL for transaction fees.

```bash
solana balance  # Check balance
```

---

## 📝 Configuration

All scripts use mainnet by default. Edit the script files to use devnet for testing:

```typescript
// Change this line in the script:
const TXLINE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"); // devnet
const RPC_URL = "https://api.devnet.solana.com";
```

---

## 🔑 Wallet Setup

Scripts look for wallet at: `backend/keypairs/mainnet.json`

**Generate new wallet:**
```bash
solana-keygen new --outfile backend/keypairs/mainnet.json
```

**Fund wallet:**
- Mainnet: Transfer SOL from exchange or another wallet
- Devnet: `solana airdrop 2 <WALLET_ADDRESS> --url devnet`

---

## 📚 Documentation

- Hosted Docs: https://txline.txodds.com/documentation/worldcup
- GitHub Repo: https://github.com/txodds/tx-on-chain
- API Reference: https://txline.txodds.com/docs/docs.yaml
