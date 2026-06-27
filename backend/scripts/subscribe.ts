/**
 * Subscribe to TxLINE Free Tier (World Cup)
 * 
 * This script subscribes to the free World Cup tier on Solana.
 * NO TOKENS REQUIRED - this is the free tier!
 * 
 * After running this, use the txSig to activate your API token.
 * 
 * Usage:
 *   tsx scripts/subscribe.ts
 * 
 * Output:
 *   Transaction signature (txSig) - copy this for activate-token.ts
 */

import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import os from 'os';

let program: anchor.Program;

// TxLINE Program ID - MainNet
const TXLINE_PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA');

// Token Mint for TxLINE subscriptions
const SUBSCRIPTION_TOKEN_MINT = new PublicKey('sLX1i9dfmsuyFBmJTWuGjjRmG4VPWYK6dRRKSM4BCSx');

// Free tier config
const SERVICE_LEVEL_ID = 12; // World Cup & Int Friendlies (REAL-TIME)
// const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies (60-sec delay)
const DURATION_WEEKS = 4; // Minimum subscription duration
const SELECTED_LEAGUES: number[] = []; // Empty for standard free bundle

async function subscribe() {
  console.log('🌍 TxLINE Free Tier Subscription (NO TOKENS REQUIRED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Service Level: ${SERVICE_LEVEL_ID} (${SERVICE_LEVEL_ID === 12 ? 'Real-time' : '60s delay'})`);
  console.log(`Duration: ${DURATION_WEEKS} weeks`);
  console.log(`Leagues: ${SELECTED_LEAGUES.length > 0 ? SELECTED_LEAGUES.join(', ') : 'Standard bundle'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load wallet - use local Solana wallet or ANCHOR_WALLET env var
  const walletPath = process.env.ANCHOR_WALLET;
  
  let secretKey: number[];
  if (walletPath) {
    // Use specified wallet
    secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  } else {
    // Try common Solana CLI wallet locations
    const defaultPaths = [
      path.join(os.homedir(), '.config', 'solana', 'id.json'),
      path.join(os.homedir(), 'solana-tx-stack', 'keypairs', 'mainnet.json'),
      './keypairs/mainnet.json',
    ];
    
    for (const p of defaultPaths) {
      try {
        secretKey = JSON.parse(fs.readFileSync(p, 'utf-8'));
        console.log(`🔑 Using wallet: ${p}`);
        break;
      } catch {
        continue;
      }
    }
    
    if (!secretKey) {
      console.error('❌ No wallet found. Set ANCHOR_WALLET env var or place keypair in one of:');
      console.error('   - ~/.config/solana/id.json');
      console.error('   - ./keypairs/mainnet.json');
      process.exit(1);
    }
  }
  
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  
  console.log('🔑 Wallet:', wallet.publicKey.toString());

  // Connect to Solana
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Load txoracle program IDL
  const idlPath = './idl/txoracle.json';
  
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);
  console.log(`📄 Loaded txoracle IDL from: ${idlPath}`);

  console.log('\n📡 Fetching PDAs...');
  
  // Get pricing matrix PDA
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    TXLINE_PROGRAM_ID
  );

  // Get token treasury PDA and vault
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    TXLINE_PROGRAM_ID
  );
  
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    SUBSCRIPTION_TOKEN_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  // Get user's token account address (create if doesn't exist)
  const userAta = getAssociatedTokenAddressSync(
    SUBSCRIPTION_TOKEN_MINT,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Check if token account exists
  const accountInfo = await connection.getAccountInfo(userAta);
  
  // Create token account if it doesn't exist
  if (!accountInfo) {
    console.log('📝 Creating TxLINE token account...');
    const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
    
    const createAccountIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      userAta, // ATA
      wallet.publicKey, // owner
      SUBSCRIPTION_TOKEN_MINT, // mint
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const tx = new anchor.web3.Transaction().add(createAccountIx);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const signature = await anchor.web3.sendAndConfirmTransaction(
      connection,
      tx,
      [wallet.payer!],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Token account created:', signature);
  } else {
    console.log('✅ Token account already exists');
  }

  console.log('\n📝 Sending subscription transaction (FREE World Cup tier)...');
  
  try {
    // Subscribe on-chain
    const txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: SUBSCRIPTION_TOKEN_MINT,
        userTokenAccount: userAta,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log('\n✅ Subscription successful!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Transaction Signature:');
    console.log(txSig);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Next step: Activate your API token');
    console.log(`   tsx scripts/activate-token.ts ${txSig}`);
    console.log('\n🔍 View on Solscan:');
    console.log(`   https://solscan.io/tx/${txSig}`);

  } catch (error: any) {
    console.error('\n❌ Subscription failed:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('   - Insufficient SOL for transaction fees (need ~0.001 SOL)');
    console.error('   - Wrong program ID');
    console.error('   - IDL mismatch - check with TxLINE team');
    console.error('   - Network congestion - try again');
    process.exit(1);
  }
}

subscribe().catch(console.error);
