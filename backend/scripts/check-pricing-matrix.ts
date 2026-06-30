/**
 * Check if pricing_matrix PDA exists on-chain
 * 
 * Usage: npx tsx scripts/check-pricing-matrix.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");

async function main() {
  console.log("🔍 Checking pricing_matrix PDA status...\n");

  const connection = new Connection(RPC_URL, "confirmed");

  // Calculate pricing_matrix PDA
  const [pricingMatrixPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    TXLINE_PROGRAM_ID
  );

  console.log(`📍 Program ID: ${TXLINE_PROGRAM_ID.toBase58()}`);
  console.log(`📍 pricing_matrix PDA: ${pricingMatrixPda.toBase58()}`);
  console.log(`📍 Bump: ${bump}\n`);

  try {
    const accountInfo = await connection.getAccountInfo(pricingMatrixPda);

    if (accountInfo) {
      console.log("✅ pricing_matrix PDA EXISTS on-chain!");
      console.log(`   Lamports: ${accountInfo.lamports}`);
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   Data size: ${accountInfo.data.length} bytes`);
      console.log("\n💡 The PDA exists - the issue might be with account structure in the script.");
    } else {
      console.log("❌ pricing_matrix PDA does NOT exist on-chain!");
      console.log("\n⚠️  This means TxODDS hasn't initialized it yet.");
      console.log("\n📋 Next Steps:");
      console.log("   1. Contact TxODDS support (Aidan) to initialize pricing_matrix");
      console.log("   2. Mention: pricing_matrix PDA not initialized on mainnet");
      console.log("   3. PDA address: " + pricingMatrixPda.toBase58());
      console.log("\n💡 Alternative: Use guest JWT directly for hackathon (limited access)");
      console.log("   - No on-chain subscription needed");
      console.log("   - Works for World Cup data during hackathon period");
      console.log("   - Contact support@txline.txodds.com for hackathon activation");
    }
  } catch (error: any) {
    console.log("❌ Error checking PDA:", error.message);
  }

  // Also check devnet
  console.log("\n" + "=".repeat(60));
  console.log("🔍 Checking devnet...\n");

  const devnetConnection = new Connection("https://api.devnet.solana.com", "confirmed");
  const [devnetPricingMatrixPda, devnetBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J") // devnet program
  );

  console.log(`📍 Devnet Program ID: 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`);
  console.log(`📍 Devnet pricing_matrix PDA: ${devnetPricingMatrixPda.toBase58()}`);
  console.log(`📍 Devnet Bump: ${devnetBump}\n`);

  try {
    const devnetAccountInfo = await devnetConnection.getAccountInfo(devnetPricingMatrixPda);

    if (devnetAccountInfo) {
      console.log("✅ Devnet pricing_matrix PDA EXISTS!");
      console.log("💡 You can test on devnet while waiting for mainnet initialization");
    } else {
      console.log("❌ Devnet pricing_matrix PDA also does NOT exist");
    }
  } catch (error: any) {
    console.log("❌ Error checking devnet PDA:", error.message);
  }
}

main().catch(console.error);
