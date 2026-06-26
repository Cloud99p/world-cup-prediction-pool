#!/usr/bin/env node

/**
 * Generate Solana Keypair
 * Usage: node scripts/generate-keypair.js [devnet|mainnet|testnet] [output-path]
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Get args
const network = process.argv[2] || 'devnet';
const outputPath = process.argv[3] || './backend/keypairs/mainnet.json';

console.log('🔑 Generating Solana Keypair...\n');

// Generate keypair
const keypair = Keypair.generate();

// Ensure directory exists
const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
if (dir && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Save keypair
fs.writeFileSync(outputPath, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });

console.log('✅ Keypair generated!\n');
console.log('📍 Public Key:', keypair.publicKey.toBase58());
console.log('💾 Saved to:', outputPath);
console.log('\n💰 Get faucet SOL:');
console.log('   https://faucet.solana.com/\n');
