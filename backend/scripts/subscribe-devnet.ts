/**
 * Subscribe to TxLINE on Devnet
 * 
 * This script subscribes to the free World Cup tier on Solana Devnet.
 * 
 * Prerequisites:
 * 1. Get devnet SOL: https://faucet.solana.com/
 * 2. Update .env.devnet with your wallet path if needed
 * 
 * Usage:
 *   npx tsx scripts/subscribe-devnet.ts
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
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Devnet configuration
const TXLINE_PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
const SUBSCRIPTION_TOKEN_MINT = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG'); // Devnet TxL mint
const TXLINE_BASE_URL = 'https://txline-dev.txodds.com';

// Free tier config
const SERVICE_LEVEL_ID = 12; // World Cup & Int Friendlies (REAL-TIME)
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

async function subscribe() {
  console.log('🌍 TxLINE Devnet Subscription');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Network: Devnet`);
  console.log(`Program: ${TXLINE_PROGRAM_ID.toString()}`);
  console.log(`Service Level: ${SERVICE_LEVEL_ID} (World Cup Real-time)`);
  console.log(`Duration: ${DURATION_WEEKS} weeks`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET;
  
  let secretKey: number[];
  if (walletPath) {
    secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  } else {
    const defaultPaths = [
      path.join(os.homedir(), '.config', 'solana', 'id.json'),
      path.join(os.homedir(), 'solana-tx-stack', 'keypairs', 'devnet.json'),
      './keypairs/devnet.json',
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
      console.error('❌ No wallet found. Set ANCHOR_WALLET env var or place keypair in:');
      console.error('   - ~/.config/solana/id.json');
      console.error('   - ./keypairs/devnet.json');
      console.error('\n💡 Get devnet SOL: https://faucet.solana.com/');
      process.exit(1);
    }
  }
  
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);

  // Connect to Solana Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceSol = balance / 1e9;
  console.log(`💰 Balance: ${balanceSol.toFixed(4)} SOL`);
  
  if (balanceSol < 0.01) {
    console.log('\n⚠️  Warning: Low balance! Get devnet SOL:');
    console.log('   https://faucet.solana.com/\n');
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

  // Get user's token account address
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
    console.log('📝 Creating TxL token account...');
    
    const createAccountIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      userAta,
      wallet.publicKey,
      SUBSCRIPTION_TOKEN_MINT,
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

  console.log('\n📝 Sending subscription transaction...');
  console.log(`   Service Level: ${SERVICE_LEVEL_ID}`);
  console.log(`   Duration: ${DURATION_WEEKS} weeks`);
  console.log(`   Pricing Matrix: ${pricingMatrixPda.toString()}`);
  
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
    console.log(`   https://solscan.io/tx/${txSig}?cluster=devnet`);
    
    // Save txSig to file for easy copy
    fs.writeFileSync('./devnet-txsig.txt', txSig);
    console.log('\n💾 TxSig saved to: ./devnet-txsig.txt');

  } catch (error: any) {
    console.error('\n❌ Subscription failed:', error.message);
    
    if (error.message.includes('pricing_matrix not provided')) {
      console.error('\n💡 pricing_matrix account does not exist on devnet.');
      console.error('   TxODDS needs to initialize it first with:');
      console.error('   initializePricingMatrix([ServiceRow for level 12])');
    }
    
    console.error('\n💡 Possible issues:');
    console.error('   - pricing_matrix not initialized on devnet');
    console.error('   - Insufficient devnet SOL (need ~0.005 SOL)');
    console.error('   - Network congestion - try again');
    process.exit(1);
  }
}

subscribe().catch(console.error);
