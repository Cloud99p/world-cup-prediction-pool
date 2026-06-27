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
import fs from 'fs';
import path from 'path';
import os from 'os';

let program: anchor.Program;

// TxLINE Program ID (from your .env)
const TXLINE_PROGRAM_ID = new PublicKey(process.env.TXLINE_PROGRAM_ID || '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');

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

  // Load program - try prediction_pool first, then txline
  const idlPaths = ['./idl/prediction_pool.json', './idl/txline.json'];
  
  for (const idlPath of idlPaths) {
    try {
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);
      console.log(`📄 Loaded IDL from: ${idlPath}`);
      break;
    } catch (e) {
      continue;
    }
  }

  if (!program) {
    console.error('❌ Could not find IDL file. Please create one or download from TxLINE.');
    process.exit(1);
  }

  console.log('\n📡 Fetching pricing matrix...');
  
  // Get pricing matrix PDA
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    TXLINE_PROGRAM_ID
  );

  console.log('\n📝 Sending subscription transaction (FREE - no tokens required)...');
  
  try {
    // Subscribe on-chain - simplified accounts for free tier
    const txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        systemProgram: SystemProgram.programId,
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
