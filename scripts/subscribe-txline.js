#!/usr/bin/env node

/**
 * TxLINE Subscription Script
 * Subscribe to free World Cup tier (Service Level 12)
 */

import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Configuration
const RPC_URL = 'https://api.devnet.solana.com'; // or mainnet-beta
const SERVICE_LEVEL_ID = 12; // World Cup Real-time (FREE)
const DURATION_WEEKS = 4;

// TxLINE Program ID (devnet - check docs for mainnet)
const TXLINE_PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');

// Subscription token mint (TxLINE token)
const SUBSCRIPTION_TOKEN_MINT = new PublicKey('TxLINE_MINT_ADDRESS_HERE'); // Check docs

async function subscribe() {
  console.log('🚀 Subscribing to TxLINE World Cup Tier...\n');

  // Load wallet
  const walletPath = process.env.HOME + '/.config/solana/id.json';
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log('📝 Wallet:', wallet.publicKey.toBase58());

  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, { 
    publicKey: wallet.publicKey,
    signTransaction: async () => {},
    signAllTransactions: async () => {},
  }, { commitment: 'confirmed' });

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('💰 Balance:', balance / anchor.web3.LAMPORTS_PER_SOL, 'SOL\n');

  if (balance === 0) {
    console.log('❌ Wallet has 0 SOL!');
    console.log('Get devnet SOL: https://faucet.solana.com/\n');
    return;
  }

  // Derive PDAs
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    TXLINE_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    TXLINE_PROGRAM_ID
  );

  console.log('📋 Subscription Details:');
  console.log('  Service Level:', SERVICE_LEVEL_ID, '(World Cup Real-time)');
  console.log('  Duration:', DURATION_WEEKS, 'weeks');
  console.log('  Cost: FREE (Hackathon Tier)\n');

  // In production, you would:
  // 1. Load the TxLINE program IDL
  // 2. Create the subscribe instruction
  // 3. Send and confirm transaction
  // 4. Get transaction signature

  console.log('⚠️  NOTE: This is a demo script.');
  console.log('For actual subscription, use the full Anchor program with IDL.\n');
  console.log('See: https://txline.txodds.com/documentation/worldcup\n');

  // For hackathon, you can skip on-chain subscription
  // and use the free tier directly with guest JWT
  console.log('✅ For hackathon testing, you can use the guest JWT directly!');
  console.log('   No on-chain subscription needed for free tier.\n');
}

subscribe().catch(console.error);
