#!/usr/bin/env node

/**
 * Solana Keypair Generator
 * Generate a new keypair for testing or deployment
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const network = args[0] || 'devnet'; // devnet, mainnet, testnet
const outputPath = args[1] || './keypairs/generated.json';

console.log('================================================================================');
console.log('🔑 SOLANA KEYPAIR GENERATOR');
console.log('================================================================================\n');

// Generate new keypair
const keypair = Keypair.generate();

console.log('✅ New keypair generated!\n');

console.log('📍 Public Key (Address):');
console.log(`  ${keypair.publicKey.toBase58()}\n`);

console.log('📋 Copy address for faucet:');
console.log(`  echo ${keypair.publicKey.toBase58()} | clip\n`);

// Ensure output directory exists
const outputDir = dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created directory: ${outputDir}\n`);
}

// Save keypair to file
const secretKey = Array.from(keypair.secretKey);
fs.writeFileSync(outputPath, JSON.stringify(secretKey), { mode: 0o600 });

console.log('💾 Keypair saved to:');
console.log(`  ${outputPath}\n`);

console.log('🔒 File permissions set to 600 (owner read/write only)\n');

// Network-specific instructions
console.log('================================================================================');
console.log(`💰 GET ${network.toUpperCase()} SOL`);
console.log('================================================================================\n');

if (network === 'devnet') {
  console.log('Devnet SOL is FREE! Get it from the faucet:\n');
  console.log('1. Go to: https://faucet.solana.com/');
  console.log(`2. Paste your address: ${keypair.publicKey.toBase58()}`);
  console.log('3. Click "Request Airdrop"');
  console.log('4. Wait ~5 seconds\n');
  console.log('Or use Solana CLI:');
  console.log(`  solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet\n`);
} else if (network === 'testnet') {
  console.log('Testnet SOL is FREE! Get it from the faucet:\n');
  console.log('1. Go to: https://faucet.solana.com/');
  console.log(`2. Paste your address: ${keypair.publicKey.toBase58()}`);
  console.log('3. Select "testnet" network');
  console.log('4. Click "Request Airdrop"\n');
} else if (network === 'mainnet') {
  console.log('⚠️  MAINNET - REAL SOL REQUIRED!\n');
  console.log(`Address: ${keypair.publicKey.toBase58()}`);
  console.log('\nFund this address from:');
  console.log('- Exchange (Coinbase, Binance, etc.)');
  console.log('- Another Solana wallet');
  console.log('- Solana faucet (limited amounts)\n');
  console.log('⚠️  WARNING: This is REAL money! Start with small amounts for testing.\n');
}

console.log('================================================================================');
console.log('📊 SUMMARY');
console.log('================================================================================\n');

console.log(`Network:      ${network}`);
console.log(`Public Key:   ${keypair.publicKey.toBase58()}`);
console.log(`Keypair File: ${outputPath}`);
console.log(`Secret Key:   ${secretKey.length} bytes\n`);

console.log('================================================================================');
console.log('✅ Done!');
console.log('================================================================================\n');
