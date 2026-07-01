/**
 * Create TxL Token Account
 * 
 * Creates an associated token account for TxL tokens (required before subscription)
 * 
 * Usage: npx tsx scripts/create-token-account.ts
 */

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mainnet Configuration
const TXL_TOKEN_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const RPC_URL = "https://api.mainnet-beta.solana.com";

async function main() {
  console.log("🪙 Create TxL Token Account");
  console.log("=".repeat(60));

  // Load wallet
  const keypairPath = process.env.ANCHOR_WALLET || path.join(__dirname, "../keypairs/mainnet.json");
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Wallet not found at: ${keypairPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log(`📝 Wallet: ${wallet.publicKey.toBase58()}`);

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 SOL Balance: ${balance / 1e9} SOL`);

  if (balance < 0.01e9) {
    console.error("\n⚠️  Warning: Low SOL balance! Need ~0.003 SOL for token account creation.");
    console.error("   Fund your wallet first: https://phantom.app");
    process.exit(1);
  }

  // Derive ATA
  const ata = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`\n📍 Token Account: ${ata.toBase58()}`);

  // Check if already exists
  const accountInfo = await connection.getAccountInfo(ata);
  
  if (accountInfo) {
    console.log("\n✅ Token account already exists!");
    const tokenBalance = await connection.getTokenAccountBalance(ata);
    console.log(`   Balance: ${tokenBalance.value.uiAmount} TxL`);
    console.log("\n📝 You're ready to subscribe!");
    console.log("   Run: npx tsx scripts/subscribe-free-tier.ts");
    return;
  }

  console.log("\n🔨 Creating token account...");

  // Create ATA instruction
  const instruction = createAssociatedTokenAccountInstruction(
    wallet.publicKey, // payer
    ata, // associated token account
    wallet.publicKey, // owner
    TXL_TOKEN_MINT, // mint
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Build transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign and send
  const signature = await connection.sendTransaction(transaction, [wallet]);
  console.log(`📡 Sending transaction...`);
  console.log(`   Signature: ${signature}`);

  // Confirm
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  
  if (confirmation.value.err) {
    console.error("\n❌ Transaction failed:", confirmation.value.err);
    process.exit(1);
  }

  console.log("\n✅ Token account created successfully!");
  console.log(`🔗 Transaction: https://solscan.io/tx/${signature}`);
  console.log("\n📝 Next Step: Run subscription");
  console.log("   npx tsx scripts/subscribe-free-tier.ts");
}

main().catch(console.error);
