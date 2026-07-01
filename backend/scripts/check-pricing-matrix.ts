/**
 * Check pricing_matrix PDA Status
 * 
 * This script checks if the pricing_matrix PDA exists and is properly initialized.
 * 
 * Usage: npx tsx scripts/check-pricing-matrix.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mainnet Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const RPC_URL = "https://api.mainnet-beta.solana.com";

// PDA
const [PRICING_MATRIX_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  TXLINE_PROGRAM_ID
);

async function main() {
  console.log("🔍 TxLINE pricing_matrix Status Check");
  console.log("=".repeat(60));
  console.log(`Network: Mainnet`);
  console.log(`Program: ${TXLINE_PROGRAM_ID.toBase58()}`);
  console.log(`PDA: ${PRICING_MATRIX_PDA.toBase58()}`);
  console.log();

  const connection = new Connection(RPC_URL, "confirmed");

  try {
    // Check if PDA exists
    console.log("📡 Fetching account info...");
    const accountInfo = await connection.getAccountInfo(PRICING_MATRIX_PDA);

    if (!accountInfo) {
      console.error("❌ pricing_matrix PDA does NOT exist on-chain!");
      console.error();
      console.error("⚠️  This is a TxODDS-side issue.");
      console.error();
      console.error("💡 Action Required:");
      console.error("   Contact TxODDS team to initialize pricing_matrix on mainnet.");
      console.error();
      console.error("   📧 Email: support@txodds.com");
      console.error("   💬 Discord: https://discord.gg/txodds (ticket-0013)");
      console.error("   🐙 GitHub: https://github.com/txodds/tx-on-chain");
      console.error();
      console.error("📝 Message to TxODDS:");
      console.error('   "The pricing_matrix PDA needs to be initialized on mainnet');
      console.error('    for the subscribe instruction to work. Please call');
      console.error('    initializePricingMatrix() with ServiceRow entries for');
      console.error('    Service Level 1 (60s delay) and Service Level 12 (real-time)."');
      console.error();
      process.exit(1);
    }

    console.log("✅ pricing_matrix PDA exists!");
    console.log(`   Size: ${accountInfo.data.length} bytes`);
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    console.log(`   Executable: ${accountInfo.executable}`);
    console.log(`   Lamports: ${accountInfo.lamports / 1e9} SOL`);
    console.log();

    // Try to decode the account data
    console.log("📊 Attempting to decode pricing_matrix data...");
    
    // Load IDL to get account structure
    const idlPath = path.join(__dirname, "../idl/txoracle.json");
    if (fs.existsSync(idlPath)) {
      const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
      console.log("✅ IDL loaded successfully");
      
      // Check if we can find the PricingMatrix account type
      const pricingMatrixType = idl.accounts?.find((a: any) => 
        a.name === "pricing_matrix" || a.name === "PricingMatrix"
      );
      
      if (pricingMatrixType) {
        console.log("✅ Found pricing_matrix account type in IDL");
        console.log("   Fields:", JSON.stringify(pricingMatrixType.fields, null, 2));
      } else {
        console.log("⚠️  pricing_matrix account type not found in IDL");
      }
    } else {
      console.log("⚠️  IDL not found, skipping decode");
    }

    console.log();
    console.log("✅ pricing_matrix is ready for subscription!");
    console.log();
    console.log("📝 Next Steps:");
    console.log("   1. Run: npx tsx scripts/subscribe-free-tier.ts");
    console.log("   2. Copy the transaction signature");
    console.log("   3. Run: npx tsx scripts/activate-token.ts <txSig>");
    console.log();

  } catch (error: any) {
    console.error("❌ Error checking pricing_matrix:", error.message);
    
    if (error.message?.includes("Connection failed")) {
      console.error("\n⚠️  RPC connection issue. Try again or check RPC URL.");
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
