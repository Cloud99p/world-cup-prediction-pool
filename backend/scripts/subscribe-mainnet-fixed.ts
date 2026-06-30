/**
 * Subscribe to TxLINE on MAINNET
 * 
 * Per Aidan @ TxODDS: Use Service Level 1 (World Cup 60s delay)
 * 
 * Usage:
 *   npx tsx scripts/subscribe-mainnet-fixed.ts
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

// Mainnet configuration (per official docs)
const TXLINE_PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA');
const SUBSCRIPTION_TOKEN_MINT = new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL');
const TXLINE_BASE_URL = 'https://txline.txodds.com';

// Per Aidan @ TxODDS: Use Service Level 1
const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies (60s delay)
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

async function subscribe() {
  console.log('🌍 TxLINE MAINNET Subscription');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Network: Mainnet`);
  console.log(`Program: ${TXLINE_PROGRAM_ID.toString()}`);
  console.log(`Service Level: ${SERVICE_LEVEL_ID} (World Cup 60s delay)`);
  console.log(`Duration: ${DURATION_WEEKS} weeks`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load wallet - try mainnet first
  const walletPath = process.env.ANCHOR_WALLET;
  
  let secretKey: number[];
  if (walletPath) {
    secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  } else {
    const defaultPaths = [
      path.join(os.homedir(), '.config', 'solana', 'id.json'),
      path.join(os.homedir(), 'world-cup-prediction-pool', 'backend', 'keypairs', 'mainnet.json'),
      './keypairs/mainnet.json',
      '../keypairs/mainnet.json',
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
      console.error('❌ No mainnet wallet found!');
      console.error('\n💡 Set ANCHOR_WALLET env var or place keypair in:');
      console.error('   - ~/.config/solana/id.json');
      console.error('   - ./keypairs/mainnet.json\n');
      process.exit(1);
    }
  }
  
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);

  // Connect to Solana Mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceSol = balance / 1e9;
  console.log(`💰 Balance: ${balanceSol.toFixed(4)} SOL\n`);
  
  if (balanceSol < 0.001) {
    console.log('⚠️  Warning: Very low SOL balance!\n');
  }

  // Load txoracle program IDL
  const idlPath = './idl/txoracle.json';
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const program = new anchor.Program(idl, TXLINE_PROGRAM_ID, provider);
  console.log(`📄 Loaded txoracle IDL\n`);

  console.log('📡 Fetching PDAs...');
  
  // Get pricing matrix PDA
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    TXLINE_PROGRAM_ID
  );
  console.log(`   Pricing Matrix: ${pricingMatrixPda.toString()}`);

  // Check if pricing_matrix exists BEFORE trying to subscribe
  console.log('\n🔍 Checking if pricing_matrix exists on-chain...');
  try {
    const matrixInfo = await connection.getAccountInfo(pricingMatrixPda);
    if (matrixInfo) {
      console.log('✅ pricing_matrix PDA EXISTS on mainnet!');
      console.log(`   Lamports: ${matrixInfo.lamports}`);
      console.log(`   Owner: ${matrixInfo.owner.toBase58()}`);
    } else {
      console.log('❌ pricing_matrix PDA does NOT exist on mainnet!');
      console.log('\n⚠️  This is a TxODDS infrastructure issue.');
      console.log('   They need to run initializePricingMatrix() first.\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.log('❌ Error checking pricing_matrix:', error.message);
    process.exit(1);
  }

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

  // Get user's token account
  const userAta = getAssociatedTokenAddressSync(
    SUBSCRIPTION_TOKEN_MINT,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log('\n📝 Sending subscription transaction...');
  console.log(`   Service Level: ${SERVICE_LEVEL_ID}`);
  console.log(`   Duration: ${DURATION_WEEKS} weeks`);
  
  try {
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
    console.log(`   npx tsx scripts/activate-token.ts ${txSig}`);
    console.log('\n🔍 View on Solscan:');
    console.log(`   https://solscan.io/tx/${txSig}`);
    
    // Save txSig
    fs.writeFileSync('./mainnet-txsig.txt', txSig);
    console.log('\n💾 TxSig saved to: ./mainnet-txsig.txt');

  } catch (error: any) {
    console.error('\n❌ Subscription failed:', error.message);
    
    if (error.message.includes('pricing_matrix')) {
      console.error('\n💡 pricing_matrix issue - contact TxODDS support');
    }
    
    process.exit(1);
  }
}

subscribe().catch(console.error);
