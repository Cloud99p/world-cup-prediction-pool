/**
 * Debug: Find Treasury Vault
 * 
 * Checks all possible treasury vault ATA combinations
 * 
 * Usage: npx tsx scripts/debug-treasury-vault.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mainnet Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXL_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const RPC_URL = "https://api.mainnet-beta.solana.com";

async function main() {
  console.log("🔍 Debug: Find Treasury Vault");
  console.log("=".repeat(60));

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");

  // Check both treasury PDA seeds
  const [treasuryV2] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    TXLINE_PROGRAM_ID
  );
  
  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury")],
    TXLINE_PROGRAM_ID
  );

  console.log("\n🏛️  Treasury PDAs:");
  console.log(`   token_treasury_v2: ${treasuryV2.toBase58()}`);
  console.log(`   token_treasury:    ${treasury.toBase58()}`);

  const treasuryV2Info = await connection.getAccountInfo(treasuryV2);
  const treasuryInfo = await connection.getAccountInfo(treasury);
  
  console.log("\n   Exists:");
  console.log(`   token_treasury_v2: ${!!treasuryV2Info}`);
  console.log(`   token_treasury:    ${!!treasuryInfo}`);

  // Check all 4 combinations of treasury vault ATAs
  console.log("\n💰 Treasury Vault ATAs:");
  
  const combinations = [
    { treasury: treasuryV2, tokenProgram: TOKEN_2022_PROGRAM_ID, name: "v2 + TOKEN_2022" },
    { treasury: treasuryV2, tokenProgram: TOKEN_PROGRAM_ID, name: "v2 + TOKEN (legacy)" },
    { treasury: treasury, tokenProgram: TOKEN_2022_PROGRAM_ID, name: "treasury + TOKEN_2022" },
    { treasury: treasury, tokenProgram: TOKEN_PROGRAM_ID, name: "treasury + TOKEN (legacy)" },
  ];

  for (const combo of combinations) {
    const vault = getAssociatedTokenAddressSync(
      TXL_TOKEN_MINT,
      combo.treasury,
      true, // isProgramDerivedAddress
      combo.tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const info = await connection.getAccountInfo(vault);
    const exists = !!info;
    
    console.log(`\n   ${combo.name}:`);
    console.log(`   Vault: ${vault.toBase58()}`);
    console.log(`   Exists: ${exists ? '✅ YES!' : '❌ no'}`);
    
    if (exists && info) {
      console.log(`   ← THIS IS THE ONE!`);
      try {
        const balance = await connection.getTokenAccountBalance(vault);
        console.log(`   Balance: ${balance.value.uiAmount} TxL`);
      } catch (e) {}
    }
  }

  // Also check what token accounts the treasury PDA actually has
  console.log("\n📊 All Token Accounts for treasury PDA:");
  
  const treasury2022Accounts = await connection.getTokenAccountsByOwner(treasury, {
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  if (treasury2022Accounts.value.length > 0) {
    console.log(`   TOKEN_2022 accounts:`);
    treasury2022Accounts.value.forEach((acc, i) => {
      console.log(`   [${i}] ${acc.pubkey.toBase58()}`);
    });
  }
  
  const treasuryLegacyAccounts = await connection.getTokenAccountsByOwner(treasury, {
    programId: TOKEN_PROGRAM_ID,
  });
  
  if (treasuryLegacyAccounts.value.length > 0) {
    console.log(`   TOKEN (legacy) accounts:`);
    treasuryLegacyAccounts.value.forEach((acc, i) => {
      console.log(`   [${i}] ${acc.pubkey.toBase58()}`);
    });
  }

  if (treasury2022Accounts.value.length === 0 && treasuryLegacyAccounts.value.length === 0) {
    console.log(`   No token accounts found for treasury PDA`);
    console.log(`   → Need to create vault ATA!`);
  }
}

main().catch(console.error);
