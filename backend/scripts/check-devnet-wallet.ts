/**
 * Check Devnet Wallet & Balance
 * 
 * Usage:
 *   npx tsx scripts/check-devnet-wallet.ts [WALLET_PATH]
 * 
 * If no wallet path provided, searches common devnet locations.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function checkDevnetWallet() {
  console.log('🔍 Checking Devnet Wallet...\n');
  
  // Get wallet path from args or use defaults
  const walletPath = process.argv[2];
  
  let secretKey: number[];
  let walletPubkey: PublicKey;
  let foundPath: string = '';
  
  if (walletPath) {
    // Use specified wallet
    secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    walletPubkey = Keypair.fromSecretKey(Uint8Array.from(secretKey)).publicKey;
    foundPath = walletPath;
  } else {
    // Try common devnet wallet locations
    const defaultPaths = [
      path.join(os.homedir(), '.config', 'solana', 'id.json'),
      path.join(os.homedir(), 'solana-tx-stack', 'keypairs', 'devnet.json'),
      path.join(os.homedir(), 'world-cup-prediction-pool', 'backend', 'keypairs', 'devnet.json'),
      './keypairs/devnet.json',
      '../keypairs/devnet.json',
    ];
    
    console.log('📍 Searching for devnet wallet...\n');
    
    for (const p of defaultPaths) {
      try {
        secretKey = JSON.parse(fs.readFileSync(p, 'utf-8'));
        walletPubkey = Keypair.fromSecretKey(Uint8Array.from(secretKey)).publicKey;
        foundPath = p;
        console.log(`✅ Found wallet: ${p}`);
        break;
      } catch {
        console.log(`   ❌ ${p}`);
        continue;
      }
    }
    
    if (!walletPubkey) {
      console.error('\n❌ No devnet wallet found!\n');
      console.log('💡 Create one with:');
      console.log('   solana-keygen new --outfile ~/.config/solana/id.json\n');
      console.log('📥 Get devnet SOL:');
      console.log('   https://faucet.solana.com/\n');
      process.exit(1);
    }
  }
  
  console.log(`\n📍 Wallet Address: ${walletPubkey.toString()}`);
  
  // Connect to Solana Devnet
  console.log('\n📡 Connecting to Devnet...\n');
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Get SOL balance
  console.log('💰 Checking SOL balance...');
  const balance = await connection.getBalance(walletPubkey);
  const balanceSol = balance / 1e9;
  console.log(`   Balance: ${balanceSol.toFixed(6)} SOL\n`);
  
  // Check for TxL token account
  console.log('🪙 Checking for TxL token account...');
  const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
  const TXL_MINT_DEVNET = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');
  
  const userAta = getAssociatedTokenAddressSync(
    TXL_MINT_DEVNET,
    walletPubkey,
    false
  );
  
  const accountInfo = await connection.getAccountInfo(userAta);
  
  if (accountInfo) {
    console.log(`   ✅ TxL token account exists`);
    console.log(`   Address: ${userAta.toString()}`);
    
    try {
      const { amount } = await connection.getTokenAccountBalance(userAta);
      console.log(`   Balance: ${Number(amount) / 1e6} TxL`);
    } catch {
      console.log(`   Balance: 0 TxL`);
    }
  } else {
    console.log(`   ❌ TxL token account not found (will be created on subscription)`);
  }
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Devnet Wallet Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Wallet:    ${walletPubkey.toString()}`);
  console.log(`Path:      ${foundPath}`);
  console.log(`SOL:       ${balanceSol.toFixed(6)} SOL`);
  console.log(`TxL:       ${accountInfo ? 'Has account' : 'No account yet'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check if ready for subscription
  const minRequired = 0.005;
  if (balanceSol < minRequired) {
    console.log(`⚠️  Warning: Low SOL balance!`);
    console.log(`   Need at least ${minRequired} SOL for subscription fees\n`);
    console.log(`📥 Get devnet SOL:`);
    console.log(`   https://faucet.solana.com/\n`);
  } else {
    console.log('✅ Ready for World Cup free tier subscription!\n');
    console.log('🚀 Run subscription:');
    console.log('   npx tsx scripts/subscribe-devnet.ts\n');
  }
}

checkDevnetWallet().catch(console.error);
