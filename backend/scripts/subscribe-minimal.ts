/**
 * Minimal Subscribe Test
 * 
 * Stripped-down version to isolate the pricing_matrix issue
 * 
 * Usage: npx tsx scripts/subscribe-minimal.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "bn.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mainnet Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXL_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const RPC_URL = "https://api.mainnet-beta.solana.com";

const SERVICE_LEVEL_ID = 1;
const DURATION_WEEKS = 4;

async function main() {
  console.log("🔬 Minimal Subscribe Test");
  console.log("=".repeat(60));

  // Load wallet
  const keypairPath = process.env.ANCHOR_WALLET || path.join(__dirname, "../keypairs/mainnet.json");
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = path.join(__dirname, "../idl/txoracle.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);

  console.log("\n📋 Deriving PDAs...");

  // Derive PDAs (exactly as in official docs)
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId
  );
  console.log(`token_treasury_v2: ${tokenTreasuryPda.toBase58()}`);

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`token_treasury_vault: ${tokenTreasuryVault.toBase58()}`);

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId
  );
  console.log(`pricing_matrix: ${pricingMatrixPda.toBase58()}`);

  const userTokenAccount = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`user_token_account: ${userTokenAccount.toBase58()}`);

  console.log("\n🚀 Sending subscribe instruction...");

  // 🔍 DEBUG: Check account existence
  console.log("\n🔍 Account Existence Check:");
  const pricingInfo = await connection.getAccountInfo(pricingMatrixPda);
  console.log(`   pricing_matrix exists: ${!!pricingInfo} (${pricingInfo ? pricingInfo.data.length + ' bytes' : 'N/A'})`);
  
  const tokenMintInfo = await connection.getAccountInfo(TXL_TOKEN_MINT);
  console.log(`   tokenMint exists: ${!!tokenMintInfo}`);
  
  const userTokenInfo = await connection.getAccountInfo(userTokenAccount);
  console.log(`   userTokenAccount exists: ${!!userTokenInfo}`);
  
  const treasuryVaultInfo = await connection.getAccountInfo(tokenTreasuryVault);
  console.log(`   tokenTreasuryVault exists: ${!!treasuryVaultInfo}`);

  console.log("\n📋 Final Account List:");
  console.log(`   1. user: ${wallet.publicKey.toBase58()}`);
  console.log(`   2. pricingMatrix: ${pricingMatrixPda.toBase58()}`);
  console.log(`   3. tokenMint: ${TXL_TOKEN_MINT.toBase58()}`);
  console.log(`   4. userTokenAccount: ${userTokenAccount.toBase58()}`);
  console.log(`   5. tokenTreasuryVault: ${tokenTreasuryVault.toBase58()}`);
  console.log(`   6. tokenTreasuryPda: ${tokenTreasuryPda.toBase58()}`);
  console.log(`   7. tokenProgram: ${TOKEN_2022_PROGRAM_ID.toBase58()}`);
  console.log(`   8. associatedTokenProgram: ${ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()}`);
  console.log(`   9. systemProgram: ${SystemProgram.programId.toBase58()}`);

  try {
    const txSig = await program.methods
      .subscribe(new BN(SERVICE_LEVEL_ID), new BN(DURATION_WEEKS))
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: TXL_TOKEN_MINT,
        userTokenAccount: userTokenAccount,
        tokenTreasuryVault: tokenTreasuryVault,
        tokenTreasuryPda: tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ SUCCESS!");
    console.log(`TX: https://solscan.io/tx/${txSig}`);
    
  } catch (error: any) {
    console.error("\n❌ FAILED:", error.message);
    
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string, i: number) => {
        console.error(`  ${i}: ${log}`);
      });
    }
  }
}

main().catch(console.error);
