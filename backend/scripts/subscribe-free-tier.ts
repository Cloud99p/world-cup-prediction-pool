/**
 * Subscribe to TxLINE FREE Tier (Service Level 12)
 * 
 * According to docs: No TxL tokens required, just register on-chain
 * 
 * Usage: npx tsx scripts/subscribe-free-tier.ts
 * 
 * Updated: 2026-06-30 - Based on txodds/tx-on-chain repo examples
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "bn.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MAINNET Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const SUBSCRIPTION_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const RPC_URL = "https://api.mainnet-beta.solana.com";

// Free Tier Configuration
// Try Service Level 1 first (60s delay) - might be initialized before Level 12
// Service Level 12 = Real-time (if available)
const SERVICE_LEVEL_ID = 1; // 60-second delay (more likely to work)
// const SERVICE_LEVEL_ID = 12; // Real-time (uncomment to try)
const DURATION_WEEKS = 4; // 4 weeks
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

// PDAs from official TxLINE docs
const [PRICING_MATRIX_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  TXLINE_PROGRAM_ID
);

// Try multiple possible treasury PDA seeds
const [TOKEN_TREASURY_PDA_V2] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury_v2")],
  TXLINE_PROGRAM_ID
);

const [TOKEN_TREASURY_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury")],
  TXLINE_PROGRAM_ID
);

// Use v2 for now
const TOKEN_TREASURY_PDA_TO_USE = TOKEN_TREASURY_PDA_V2;

async function main() {
  console.log("🌍 TxLINE FREE Tier Subscription (Service Level 12)");
  console.log("=".repeat(60));

  // Load wallet
  const keypairPath = process.env.ANCHOR_WALLET || path.join(__dirname, "../keypairs/mainnet.json");
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Wallet not found at: ${keypairPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  
  console.log(`📝 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`📁 Wallet file: ${keypairPath}`);
  
  // 🔍 DEBUG: Verify this is the expected wallet
  const expectedWallet = "8ifrorg6DFECBXFA6fikQ5YkZAhihcqCi72A9shiuuxU"; // Your main wallet
  if (wallet.publicKey.toBase58() !== expectedWallet) {
    console.warn(`\n⚠️  WARNING: Wallet mismatch!`);
    console.warn(`   Expected: ${expectedWallet}`);
    console.warn(`   Loaded:   ${wallet.publicKey.toBase58()}`);
    console.warn(`   This might cause token account derivation issues.\n`);
  }

  // Connect to mainnet
  const connection = new Connection(RPC_URL, "confirmed");
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);

  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load program with LATEST IDL from docs
  const idlPath = path.join(__dirname, "../idl/txoracle.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);

  // CRITICAL CHECK: Verify pricing_matrix PDA exists on-chain
  console.log("\n🔍 Checking pricing_matrix PDA...");
  try {
    const pricingMatrixInfo = await connection.getAccountInfo(PRICING_MATRIX_PDA);
    if (!pricingMatrixInfo) {
      console.error("❌ pricing_matrix PDA does NOT exist on-chain!");
      console.error(`   PDA: ${PRICING_MATRIX_PDA.toBase58()}`);
      console.error("\n⚠️  This is a TxODDS-side issue. The pricing_matrix must be initialized by TxODDS.");
      console.error("\n💡 Contact TxODDS support (Aidan) to initialize pricing_matrix on mainnet.");
      console.error("   Discord: https://discord.gg/txodds");
      console.error("   Email: support@txodds.com");
      console.error("\n📝 Reference: GitHub issue or Discord ticket-0013");
      process.exit(1);
    }
    console.log(`✅ pricing_matrix PDA exists (${pricingMatrixInfo.data.length} bytes)`);
  } catch (error: any) {
    console.error(`❌ Error checking pricing_matrix: ${error.message}`);
    process.exit(1);
  }

  console.log("\n📋 Subscription Details:");
  console.log(`   Service Level: ${SERVICE_LEVEL_ID} (${SERVICE_LEVEL_ID === 1 ? '60s delay' : 'Real-time'})`);
  console.log(`   Duration: ${DURATION_WEEKS} weeks`);
  console.log(`   Leagues: ${SELECTED_LEAGUES.length === 0 ? 'All (standard bundle)' : SELECTED_LEAGUES.join(', ')}`);
  console.log(`   Cost: FREE (no TxL required)`);

  console.log("\n🚀 Sending subscription transaction...");

  // 🔍 DEBUG: Log all account details before sending
  console.log("\n📋 Account Details (DEBUG):");
  console.log(`   user: ${wallet.publicKey.toBase58()}`);
  console.log(`   pricingMatrix: ${PRICING_MATRIX_PDA.toBase58()}`);
  console.log(`   tokenMint: ${SUBSCRIPTION_TOKEN_MINT.toBase58()}`);
  
  // 🔧 FIX: Use the token account that EXISTS (from debug script)
  const userTokenAccount = new PublicKey("BvnhGgkoszpj1pFpp6VBrZ7enA7F6tspUJGEPhcw95yU");
  console.log(`   userTokenAccount: ${userTokenAccount.toBase58()} (hardcoded - verified exists)`);
  
  // 🔍 DEBUG: Check multiple treasury PDA variations
  console.log(`\n🏛️  Treasury PDA Checks:`);
  
  const [treasuryV2] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    TXLINE_PROGRAM_ID
  );
  const treasuryV2Info = await connection.getAccountInfo(treasuryV2);
  console.log(`   token_treasury_v2: ${treasuryV2.toBase58()}`);
  console.log(`   Exists: ${!!treasuryV2Info}`);
  
  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury")],
    TXLINE_PROGRAM_ID
  );
  const treasuryInfo = await connection.getAccountInfo(treasury);
  console.log(`   token_treasury: ${treasury.toBase58()}`);
  console.log(`   Exists: ${!!treasuryInfo}`);
  
  // Use whichever exists
  const TREASURY_PDA = treasuryV2Info ? treasuryV2 : (treasuryInfo ? treasury : treasuryV2);
  console.log(`   → Using: ${TREASURY_PDA.toBase58()}`);
  
  const tokenTreasuryVault = await anchor.utils.token.associatedAddress({
    mint: SUBSCRIPTION_TOKEN_MINT,
    owner: TREASURY_PDA,
  });
  const vaultInfo = await connection.getAccountInfo(tokenTreasuryVault);
  console.log(`   tokenTreasuryVault: ${tokenTreasuryVault.toBase58()}`);
  console.log(`   Exists: ${!!vaultInfo}`);
  console.log(`   tokenProgram: ${TOKEN_2022_PROGRAM_ID.toBase58()}`);
  console.log(`   associatedTokenProgram: ${ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()}`);
  console.log(`   systemProgram: ${SystemProgram.programId.toBase58()}`);

  // 🔍 DEBUG: Check if accounts exist on-chain
  console.log("\n🔍 Account Existence Check:");
  const pricingInfo = await connection.getAccountInfo(PRICING_MATRIX_PDA);
  console.log(`   pricing_matrix exists: ${!!pricingInfo} (${pricingInfo ? pricingInfo.data.length + ' bytes' : 'N/A'})`);
  
  const tokenMintInfo = await connection.getAccountInfo(SUBSCRIPTION_TOKEN_MINT);
  console.log(`   tokenMint exists: ${!!tokenMintInfo}`);
  
  const userTokenInfo = await connection.getAccountInfo(userTokenAccount);
  console.log(`   userTokenAccount exists: ${!!userTokenInfo}`);
  
  const treasuryVaultInfo = await connection.getAccountInfo(tokenTreasuryVault);
  console.log(`   tokenTreasuryVault exists: ${!!treasuryVaultInfo}`);
  
  const treasuryPdaInfo = await connection.getAccountInfo(TOKEN_TREASURY_PDA);
  console.log(`   tokenTreasuryPda exists: ${!!treasuryPdaInfo}`);

  console.log("\n📡 Building transaction...");

  try {
    // Subscribe on-chain - FREE tier (no TxL payment required)
    // Following official TxLINE docs: https://txline.txodds.com/documentation/worldcup
    const txSig = await program.methods
      .subscribe(new BN(SERVICE_LEVEL_ID), new BN(DURATION_WEEKS))
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: PRICING_MATRIX_PDA,
        tokenMint: SUBSCRIPTION_TOKEN_MINT,
        userTokenAccount: userTokenAccount,
        tokenTreasuryVault: tokenTreasuryVault,
        tokenTreasuryPda: TREASURY_PDA,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Subscription successful!");
    console.log(`🔗 Transaction: https://solscan.io/tx/${txSig}`);
    console.log("\n" + "=".repeat(60));
    console.log("📝 NEXT STEP: Activate your API token");
    console.log("\nRun: npx tsx scripts/activate-token.ts <txSig>");
    console.log(`Example: npx tsx scripts/activate-token.ts ${txSig}`);
    
  } catch (error: any) {
    console.error("\n❌ Subscription failed:", error.message);
    
    // Check error logs
    if (error.logs) {
      console.error("\n📝 Program logs:");
      error.logs.forEach((log: string, i: number) => {
        console.error(`   ${i}: ${log}`);
      });
    }
    
    // Common issues
    if (error.message.includes("pricing_matrix") || error.message.includes("invalid account")) {
      console.log("\n⚠️  Issue: pricing_matrix account problem");
      console.log("💡 The PDA might exist but not be initialized properly");
      console.log("💡 Or the instruction expects a different account structure");
      console.log("\n💡 Contact TxODDS (Aidan) to verify pricing_matrix initialization on mainnet.");
    }
    
    if (error.message.includes("insufficient")) {
      console.log("\n⚠️  Insufficient SOL balance. Fund wallet with at least 0.05 SOL for fees.");
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
