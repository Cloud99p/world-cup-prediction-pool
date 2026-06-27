/**
 * Activate TxLINE API Token
 * 
 * Run this AFTER subscribing on-chain to get your API token.
 * 
 * Usage:
 *   tsx scripts/activate-token.ts <TX_SIGNATURE>
 * 
 * Example:
 *   tsx scripts/activate-token.ts 5kb6gnsSu1inDF9nCVV3WcgKryyBFGFkrYS28Sp1avS8mq6Xcw6iq3yzkBTjmq8bGptgqYTXPmjyWECzKzUxYG3C
 */

import nacl from 'tweetnacl';
import axios from 'axios';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';

async function activateToken(txSig: string) {
  // Load wallet - use existing solana-tx-stack mainnet wallet
  const walletPath = '../../.openclaw/workspace/solana-tx-stack/keypairs/mainnet.json';
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  console.log('🔑 Wallet:', wallet.publicKey.toString());
  console.log('📝 TX Signature:', txSig);

  // Step 1: Get fresh JWT
  console.log('\n📡 Getting guest JWT...');
  const authResponse = await axios.post('https://txline.txodds.com/auth/guest/start');
  const jwt = authResponse.data.token;
  console.log('✅ JWT received:', jwt.substring(0, 50) + '...');

  // Step 2: Create message to sign
  // Format: txSig:leagues:jwt (leagues is empty for free tier)
  const leagues: number[] = []; // Empty for World Cup free tier
  const messageString = `${txSig}:${leagues.join(',')}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  
  console.log('\n📝 Message to sign:', messageString);

  // Step 3: Sign message with wallet
  const signatureBytes = nacl.sign.detached(message, wallet.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');
  
  console.log('✅ Wallet signature:', walletSignature.substring(0, 50) + '...');

  // Step 4: Activate API token
  console.log('\n📡 Activating API token...');
  try {
    const activationResponse = await axios.post(
      'https://txline.txodds.com/api/token/activate',
      {
        txSig,
        walletSignature,
        leagues,
      },
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const apiToken = activationResponse.data.token || activationResponse.data;
    
    console.log('\n✅ API Token activated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API Token:', apiToken);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Update your .env file:');
    console.log(`TXLINE_API_TOKEN=${apiToken}`);
    
    // Optionally write to .env
    const envPath = './.env';
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      envContent = envContent.replace(
        /TXLINE_API_TOKEN=.*/,
        `TXLINE_API_TOKEN=${apiToken}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env file updated!');
    }

  } catch (error: any) {
    console.error('\n❌ Activation failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Main
const txSig = process.argv[2];
if (!txSig) {
  console.error('❌ Usage: tsx scripts/activate-token.ts <TX_SIGNATURE>');
  console.error('\nExample:');
  console.error('  tsx scripts/activate-token.ts 5kb6gnsSu1inDF9nCVV3WcgKryyBFGFkrYS28Sp1avS8mq6Xcw6iq3yzkBTjmq8bGptgqYTXPmjyWECzKzUxYG3C');
  process.exit(1);
}

activateToken(txSig).catch(console.error);
