#!/usr/bin/env node

/**
 * Check Solana Balance
 * Usage: node scripts/check-balance.js [public-key] [devnet|mainnet|testnet]
 */

import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const publicKey = process.argv[2];
const network = process.argv[3] || 'devnet';

// Get RPC URL based on network
const rpcUrls = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

const rpcUrl = rpcUrls[network] || rpcUrls.devnet;

console.log('💰 Checking Solana Balance...\n');

if (!publicKey) {
  console.log('❌ Please provide a public key');
  console.log('Usage: node scripts/check-balance.js <public-key> [network]\n');
  console.log('Example:');
  console.log('  node scripts/check-balance.js 3faWfpSE9YzHXRKuiAWbfuZfiQaPuJ4AFFkd3gGgV8TT devnet\n');
  process.exit(1);
}

try {
  const connection = new Connection(rpcUrl);
  const pubKey = new PublicKey(publicKey);
  
  connection.getBalance(pubKey).then((balance) => {
    console.log(`📍 Address: ${publicKey}`);
    console.log(`🌐 Network: ${network}`);
    console.log(`💰 Balance: ${balance / 1e9} SOL\n`);
    
    if (balance === 0) {
      console.log('⚠️  No SOL found!');
      console.log('\n💰 Get devnet SOL: https://faucet.solana.com/\n');
    } else if (network === 'devnet' || network === 'testnet') {
      console.log('✅ Ready for testing!\n');
    } else {
      console.log('✅ Mainnet balance confirmed!\n');
    }
  }).catch((error) => {
    console.error('❌ Error checking balance:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Invalid public key:', error.message);
  process.exit(1);
}
