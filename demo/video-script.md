# Demo Video Script - Prediction Pool

**Duration:** 5 minutes  
**Format:** Screen recording with voiceover  
**Tool:** Loom / YouTube

---

## 🎬 Scene 1: Introduction (0:00 - 0:30)

**Visual:** Title screen with project name and hackathon logo

**Voiceover:**
> "Welcome to Prediction Pool - a trustless prediction market platform built on Solana, powered by TxLINE's cryptographically verifiable sports data. I'm competing in the Superteam International Football Hackathon 2026 in the Prediction Markets track."

---

## 🎬 Scene 2: Problem Statement (0:30 - 1:00)

**Visual:** Split screen showing traditional betting vs. our solution

**Voiceover:**
> "Traditional prediction markets rely on centralized oracles, creating trust and censorship risks. Our solution eliminates this by using TxLINE's Merkle-proof-verified data, settled trustlessly on-chain via CPI into TxLINE's validate_stat instruction."

---

## 🎬 Scene 3: Live Demo - Place Bet (1:00 - 2:00)

**Visual:** Frontend UI walkthrough

**Steps:**
1. Connect Phantom wallet
2. Browse football matches
3. Select Brazil vs Germany
4. Choose outcome: Home Win
5. Enter stake: 100 USDC
6. Confirm transaction

**Voiceover:**
> "Let me show you how it works. First, I connect my wallet. Here are the upcoming World Cup matches with live odds from TxLINE. I'll place a 100 USDC bet on Brazil to win. The USDC is locked in a Solana PDA escrow until the match settles."

---

## 🎬 Scene 4: Live Data Stream (2:00 - 2:45)

**Visual:** Live scores dashboard with SSE updates

**Voiceover:**
> "During the match, our backend listens to TxLINE's SSE stream for real-time score updates. Watch as the scores update live - no blockchain interaction needed, just pure data streaming. Users can see the match progress in real-time."

---

## 🎬 Scene 5: Settlement Process (2:45 - 3:45)

**Visual:** Terminal showing keeper bot + on-chain transaction

**Steps:**
1. Match ends (FT shown on UI)
2. Keeper bot detects end
3. Fetches Merkle proof from TxLINE
4. CPI into validate_stat
5. Transaction confirmed

**Voiceover:**
> "When the match ends, our keeper bot automatically triggers settlement. It fetches the Merkle proof from TxLINE, then calls validate_stat via CPI. This cryptographically verifies the final score on-chain. If validation passes - which it does - the pool is marked as settled and winners can claim."

---

## 🎬 Scene 6: Claim Winnings (3:45 - 4:15)

**Visual:** Frontend UI showing claim button

**Steps:**
1. Navigate to "My Bets"
2. Click "Claim Winnings"
3. Transaction confirmed
4. USDC received

**Voiceover:**
> "Winners can now claim their payout. The amount is calculated proportionally based on the total pool. Watch as the USDC is transferred back to my wallet - all verified on-chain."

---

## 🎬 Scene 7: Technical Highlights (4:15 - 4:45)

**Visual:** Architecture diagram + code snippets

**Voiceover:**
> "Under the hood, we're using Anchor for the Solana program, TxLINE's SSE streams for real-time data, and Merkle proof verification for trustless settlement. Every outcome is cryptographically anchored on Solana, eliminating oracle risk entirely."

---

## 🎬 Scene 8: Conclusion (4:45 - 5:00)

**Visual:** Project logo + GitHub repo link

**Voiceover:**
> "World Cup Prediction Pool demonstrates the future of trustless prediction markets. Built for the Superteam World Cup Hackathon 2026. Check out the code on GitHub. Thanks for watching!"

---

## 📋 Recording Checklist

- [ ] Title screen ready
- [ ] Frontend deployed and working
- [ ] Backend running with TxLINE connection
- [ ] Test wallet with USDC loaded
- [ ] Demo match data ready (use historical if no live matches)
- [ ] Terminal ready for keeper bot demo
- [ ] Architecture diagram prepared
- [ ] GitHub repo public
- [ ] Audio tested and clear

---

## 🎯 Key Messages for Judges

1. **Trustless:** No centralized oracle - all data verified on-chain
2. **Real-Time:** Live SSE streams from TxLINE
3. **Secure:** Merkle proof verification via CPI
4. **User-Friendly:** Simple UI, seamless wallet integration
5. **Production-Ready:** Full stack, deployed, working end-to-end

---

*Good luck with the hackathon! 🚀*
