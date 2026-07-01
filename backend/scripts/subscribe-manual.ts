/**
 * Subscribe - Manual Instruction Build
 * 
 * Builds the subscribe instruction manually with explicit account metadata
 * This bypasses Anchor's account validation and should work around the bug
 * 
 * Usage: npx tsx scripts/subscribe-manual.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "bn.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mainnet Configuration
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXL_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const RPC_URL = "https://api.mainnet-beta.solana.com";

// Verified accounts (from debug scripts)
const PRICING_MATRIX = new PublicKey("HPjtXsXRYAdBppSMzsqGGDTuhUQT7aXtsbn52CjhqRM7");
const USER_TOKEN_ACCOUNT = new PublicKey("BvnhGgkoszpj1pFpp6VBrZ7enA7F6tspUJGEPhcw95yU");
const TREASURY_PDA = new PublicKey("2oerdMyJXg2CHZ9n2NDVhf3JjJNE8QVDsa7PFpABsAmD");
const TREASURY_VAULT = new PublicKey("AJ9zqsxGh92GLU1R7pL4y85znxzS7bGH7Y1iwKA9vfYp");

const SERVICE_LEVEL_ID = 1; // 60-second delay
const DURATION_WEEKS = 4;

async function main() {
  console.log("🔧 Manual Subscribe Instruction");
  console.log("=".repeat(60));

  // Load wallet
  const keypairPath = process.env.ANCHOR_WALLET || path.join(__dirname, "../keypairs/mainnet.json");
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log(`📝 Wallet: ${wallet.publicKey.toBase58()}`);

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);

  // Load IDL to get instruction discriminator
  const idlPath = path.join(__dirname, "../idl/txoracle.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  // Find subscribe instruction discriminator
  const subscribeIx = idl.instructions.find((i: any) => i.name === "subscribe");
  if (!subscribeIx) {
    console.error("❌ Could not find subscribe instruction in IDL");
    process.exit(1);
  }
  
  const discriminator = Buffer.from(subscribeIx.discriminator);
  console.log(`📋 Discriminator: ${discriminator.toString("hex")}`);

  // Encode arguments (service_level_id: u16, weeks: u8)
  const args = Buffer.alloc(3);
  args.writeUInt16LE(SERVICE_LEVEL_ID, 0);
  args.writeUInt8(DURATION_WEEKS, 2);
  console.log(`📋 Args: service_level=${SERVICE_LEVEL_ID}, weeks=${DURATION_WEEKS}`);

  // Build account metas (EXPLICIT ordering from IDL)
  const keys: AccountMeta[] = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // user
    { pubkey: PRICING_MATRIX, isSigner: false, isWritable: false }, // pricing_matrix
    { pubkey: TXL_TOKEN_MINT, isSigner: false, isWritable: false }, // token_mint
    { pubkey: USER_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // user_token_account
    { pubkey: TREASURY_VAULT, isSigner: false, isWritable: true }, // token_treasury_vault
    { pubkey: TREASURY_PDA, isSigner: false, isWritable: false }, // token_treasury_pda
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
  ];

  console.log("\n📋 Account Keys:");
  keys.forEach((key, i) => {
    console.log(`   ${i+1}. ${key.pubkey.toBase58().substring(0, 20)}... (signer=${key.isSigner}, writable=${key.isWritable})`);
  });

  // Build instruction data
  const data = Buffer.concat([discriminator, args]);

  // Create instruction
  const instruction = new TransactionInstruction({
    keys: keys,
    programId: TXLINE_PROGRAM_ID,
    data: data,
  });

  console.log("\n📡 Building transaction...");

  // Build and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign and send
  console.log("✍️  Signing transaction...");
  const signature = await connection.sendTransaction(transaction, [wallet]);
  console.log(`📡 Sending to network...`);
  console.log(`   Signature: ${signature}`);

  // Confirm
  console.log("⏳ Waiting for confirmation...");
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  
  if (confirmation.value.err) {
    console.error("\n❌ Transaction failed:", confirmation.value.err);
    process.exit(1);
  }

  console.log("\n✅ SUBSCRIPTION SUCCESSFUL!");
  console.log(`🔗 Transaction: https://solscan.io/tx/${signature}`);
  console.log("\n📝 NEXT STEP: Activate your API token");
  console.log(`   Run: npx tsx scripts/activate-token.ts ${signature}`);
}

main().catch(console.error);
