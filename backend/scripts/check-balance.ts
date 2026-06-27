/**
 * Check SOL Balance
 * 
 * Usage:
 *   npx tsx scripts/check-balance.ts [WALLET_PATH]
 * 
 * If no wallet path provided, uses default locations.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function checkBalance() {
  // Get wallet path from args or use defaults
  const walletPath = process.argv[2];
  
  let secretKey: number[];
  let walletPubkey: PublicKey;
  
  if (walletPath) {
    // Use specified wallet
    secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    walletPubkey = Keypair.fromSecretKey(Uint8Array.from(secretKey)).publicKey;
  } else {
    // Try common locations
    const defaultPaths = [
      path.join(os.homedir(), '.config', 'solana', 'id.json'),
      path.join(os.homedir(), 'solana-tx-stack', 'keypairs', 'mainnet.json'),
      './keypairs/mainnet.json',
    ];
    
    for (const p of defaultPaths) {
      try {
        secretKey = JSON.parse(fs.readFileSync(p, 'utf-8'));
        walletPubkey = Keypair.fromSecretKey(Uint8Array.from(secretKey)).publicKey;
        console.log(`🔑 Using wallet: ${p}`);
        console.log(`📍 Address: ${walletPubkey.toString()}\n`);
        break;
      } catch {
        continue;
      }
    }
    
    if (!walletPubkey) {
      console.error('❌ No wallet found. Set wallet path as argument or place keypair in:');
      console.error('   - ~/.config/solana/id.json');
      console.error('   - ./keypairs/mainnet.json');
      process.exit(1);
    }
  }
  
  // Connect to Solana
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Get balance
  console.log('📡 Fetching balance from Solana mainnet...');
  const balance = await connection.getBalance(walletPubkey);
  const balanceSol = balance / 1e9;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`💰 Balance: ${balanceSol.toFixed(6)} SOL`);
  console.log(`   (${(balanceSol * 20).toFixed(2)} USD approx)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check if enough for subscription
  const minRequired = 0.005; // SOL for fees + token account rent
  if (balanceSol < minRequired) {
    console.log(`⚠️  Warning: Balance too low!`);
    console.log(`   Need at least ${minRequired} SOL for subscription fees`);
    console.log(`   Current: ${balanceSol.toFixed(6)} SOL\n`);
  } else {
    console.log('✅ Balance sufficient for World Cup free tier subscription!\n');
  }
}

checkBalance().catch(console.error);
