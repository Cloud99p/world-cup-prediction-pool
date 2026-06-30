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
const SERVICE_LEVEL_ID = 12; // Real-time World Cup data
const DURATION_WEEKS = 4; // 4 weeks
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

// PDAs from official TxLINE docs
const [PRICING_MATRIX_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  TXLINE_PROGRAM_ID
);

const [TOKEN_TREASURY_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury_v2")],
  TXLINE_PROGRAM_ID
);

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

  console.log("\n📋 Subscription Details:");
  console.log(`   Service Level: ${SERVICE_LEVEL_ID} (World Cup Real-Time)`);
  console.log(`   Duration: ${DURATION_WEEKS} weeks`);
  console.log(`   Leagues: ${SELECTED_LEAGUES.length === 0 ? 'All (standard bundle)' : SELECTED_LEAGUES.join(', ')}`);
  console.log(`   Cost: FREE (no TxL required)`);

  console.log("\n🚀 Sending subscription transaction...");

  try {
    // Subscribe on-chain - FREE tier (no TxL payment required)
    // Following official TxLINE docs: https://txline.txodds.com/documentation/worldcup
    const txSig = await program.methods
      .subscribe(new BN(SERVICE_LEVEL_ID), new BN(DURATION_WEEKS))
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: PRICING_MATRIX_PDA,
        tokenMint: SUBSCRIPTION_TOKEN_MINT,
        userTokenAccount: await anchor.utils.token.associatedAddress({
          mint: SUBSCRIPTION_TOKEN_MINT,
          owner: wallet.publicKey,
        }),
        tokenTreasuryVault: await anchor.utils.token.associatedAddress({
          mint: SUBSCRIPTION_TOKEN_MINT,
          owner: TOKEN_TREASURY_PDA,
        }),
        tokenTreasuryPda: TOKEN_TREASURY_PDA,
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
    if (error.message.includes("pricing_matrix")) {
      console.log("\n⚠️  Issue: pricing_matrix account problem");
      console.log("💡 The PDA might exist but not be initialized properly");
      console.log("💡 Or the instruction expects a different account structure");
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
