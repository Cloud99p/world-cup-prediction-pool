#!/usr/bin/env node
/**
 * Generate Solana Keypair - FIXED VERSION
 * Works from any directory by using backend's node_modules
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Try to load from backend/node_modules first
let Keypair;
try {
  const web3 = await import('@solana/web3.js');
  Keypair = web3.Keypair;
} catch {
  // Fallback: try relative path
  try {
    const web3 = await import('../backend/node_modules/@solana/web3.js/dist/index.browser.js');
    Keypair = web3.Keypair;
  } catch (e) {
    console.error('❌ Cannot find @solana/web3.js');
    console.error('Run this from backend folder instead:');
    console.error('  cd backend');
    console.error('  node -e "import{Keypair}from\'@solana/web3.js\';import fs from\'fs\';const kp=Keypair.generate();fs.mkdirSync(\'keypairs\',{recursive:true});fs.writeFileSync(\'keypairs/mainnet.json\',JSON.stringify(Array.from(kp.secretKey)));console.log(\'Public:\',kp.publicKey.toBase58())"');
    process.exit(1);
  }
}

import fs from 'fs';
import path from 'path';

// Parse args
const network = process.argv[2] || 'devnet';
const outputPath = process.argv[3] || './keypairs/mainnet.json';

console.log('🔑 Generating Solana Keypair...\n');

// Generate
const keypair = Keypair.generate();

// Ensure directory exists
const dir = path.dirname(outputPath);
if (dir && dir !== '.' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Save with proper formatting (single line, no extra spaces)
const secretKeyArray = Array.from(keypair.secretKey);
fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray), { mode: 0o600 });

console.log('✅ Keypair generated!\n');
console.log('📍 Public Key:', keypair.publicKey.toBase58());
console.log('📊 Secret Key Length:', keypair.secretKey.length, 'bytes');
console.log('💾 Saved to:', path.resolve(outputPath));
console.log('\n💰 Get faucet SOL:');
console.log('   https://faucet.solana.com/\n');

// Verify the file was written correctly
const verify = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
if (verify.length !== 64) {
  console.error('❌ ERROR: Keypair file is corrupted!');
  console.error('   Expected 64 bytes, got', verify.length);
  process.exit(1);
}
console.log('✅ File verified: 64 bytes (valid)');
