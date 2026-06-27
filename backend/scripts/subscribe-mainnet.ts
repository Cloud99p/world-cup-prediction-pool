/**
 * Subscribe to TxLINE Free Tier on MAINNET
 * 
 * Service Level 12 = World Cup & Int Friendlies (REAL-TIME)
 * No TxL tokens required for free tier!
 * 
 * Usage: npx tsx scripts/subscribe-mainnet.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MAINNET Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const SUBSCRIPTION_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"); // TxL mainnet
const RPC_URL = "https://api.mainnet-beta.solana.com";

// Free Tier Configuration
const SERVICE_LEVEL_ID = 12; // Real-time World Cup data
const DURATION_WEEKS = 4; // 4 weeks
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

async function main() {
  console.log("🌍 TxLINE Mainnet Subscription - Free Tier (Service Level 12)");
  console.log("=" .repeat(60));

  // Load wallet
  const keypairPath = process.env.ANCHOR_WALLET || path.join(__dirname, "../keypairs/mainnet.json");
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Wallet not found at: ${keypairPath}`);
    console.log("\n💡 Create your wallet first:");
    console.log("   solana-keygen new -o keypairs/mainnet.json");
    console.log("\n   Or set ANCHOR_WALLET env var to your wallet path");
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  
  console.log(`📝 Wallet: ${wallet.publicKey.toBase58()}`);

  // Connect to mainnet
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Check SOL balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.01e9) {
    console.log("⚠️  Warning: Low SOL balance. You may need ~0.01 SOL for transaction fees.");
  }

  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load program
  const idlPath = path.join(__dirname, "../idl/txoracle.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);

  // Derive pricing_matrix PDA (exact same as docs)
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    TXLINE_PROGRAM_ID
  );
  console.log(`📊 Pricing Matrix PDA: ${pricingMatrixPda.toBase58()}`);

  // Verify it exists
  const accountInfo = await connection.getAccountInfo(pricingMatrixPda);
  if (!accountInfo) {
    console.error("❌ pricing_matrix account not found!");
    process.exit(1);
  }
  console.log(`✅ pricing_matrix exists (${accountInfo.data.length} bytes)`);

  // Derive token accounts
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury"), SUBSCRIPTION_TOKEN_MINT.toBuffer()],
    TXLINE_PROGRAM_ID
  );

  const tokenTreasuryVault = await anchor.utils.token.associatedAddress({
    mint: SUBSCRIPTION_TOKEN_MINT,
    owner: tokenTreasuryPda,
  });

  const userTokenAccount = await anchor.utils.token.associatedAddress({
    mint: SUBSCRIPTION_TOKEN_MINT,
    owner: wallet.publicKey,
  });

  console.log("\n📋 Subscription Details:");
  console.log(`   Service Level: ${SERVICE_LEVEL_ID} (World Cup Real-Time)`);
  console.log(`   Duration: ${DURATION_WEEKS} weeks`);
  console.log(`   Token Mint: ${SUBSCRIPTION_TOKEN_MINT.toBase58()}`);
  console.log(`   Cost: FREE (no TxL required)`);

  console.log("\n🚀 Sending subscription transaction...");
  console.log("📋 Accounts:");
  console.log(`   user: ${wallet.publicKey.toBase58()}`);
  console.log(`   pricingMatrix: ${pricingMatrixPda.toBase58()}`);
  console.log(`   tokenMint: ${SUBSCRIPTION_TOKEN_MINT.toBase58()}`);

  try {
    // Subscribe on-chain (FREE - no TxL transfer for free tier)
    const txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: SUBSCRIPTION_TOKEN_MINT,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
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
    console.error("\n📝 Error logs:", error.logs?.join("\n"));
    
    if (error.message.includes("pricing_matrix")) {
      console.log("\n⚠️  Issue with pricing_matrix account");
    } else if (error.message.includes("invalid")) {
      console.log("\n⚠️  Invalid account provided");
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
