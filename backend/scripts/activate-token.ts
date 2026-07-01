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
import path from 'path';
import { fileURLToPath } from 'url';
import { Keypair } from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function activateToken(txSig: string) {
  // Load wallet from backend keypairs
  const walletPath = path.join(__dirname, '../keypairs/mainnet.json');
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
  // Per TxLINE docs: Format is "${txSig}::${jwt}" for free tier (empty leagues = double colon)
  const leagues: number[] = []; // Empty for World Cup free tier
  const messageString = `${txSig}::${jwt}`; // Double colon for empty leagues
  const message = new TextEncoder().encode(messageString);
  
  console.log('\n📝 Message to sign:', messageString);

  // Step 3: Sign message with wallet
  const signatureBytes = nacl.sign.detached(message, wallet.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');
  
  console.log('✅ Wallet signature:', walletSignature.substring(0, 50) + '...');

  // Step 4: Activate API token
  console.log('\n📡 Activating API token...');
  try {
    // Following official docs: https://txline.txodds.com/documentation/worldcup
    // Try multiple possible endpoints
    const endpoints = [
      'https://txline.txodds.com/api/token/activate',
      'https://txline.txodds.com/token/activate', 
      'https://txline-dev.txodds.com/api/token/activate', // fallback to dev
    ];
    
    let activationResponse;
    let usedEndpoint;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📡 Trying: ${endpoint}...`);
        activationResponse = await axios.post(
          endpoint,
          {
            txSig,
            walletSignature,
            leagues: [], // Empty for free tier standard bundle
          },
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );
        usedEndpoint = endpoint;
        break;
      } catch (error: any) {
        console.log(`   ❌ Failed (${error.response?.status || 'unknown'})`);
        if (endpoint === endpoints[endpoints.length - 1]) throw error;
      }
    }
    
    console.log(`\n✅ Activated via: ${usedEndpoint}`);

    const apiToken = activationResponse.data.apiToken || activationResponse.data.token || activationResponse.data;
    
    console.log('\n✅ API Token activated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API Token:', apiToken);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Write to .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      envContent = envContent.replace(
        /TXLINE_API_TOKEN=.*/,
        `TXLINE_API_TOKEN=${apiToken}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env file updated!');
      console.log(`   TXLINE_API_TOKEN=${apiToken.substring(0, 50)}...`);
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart backend: npm run dev');
    console.log('   2. Test API: curl -H "Authorization: Bearer JWT" -H "X-Api-Token: TOKEN" https://txline.txodds.com/api/scores/snapshot/17952170');
    console.log('   3. Test SSE: curl -H "Authorization: Bearer JWT" -H "X-Api-Token: TOKEN" https://txline.txodds.com/api/scores/stream');

  } catch (error: any) {
    console.error('\n❌ Activation failed:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('\n⚠️  403 Forbidden - Common causes:');
      console.log('   - pricing_matrix PDA not initialized (contact TxODDS support)');
      console.log('   - Invalid txSig (make sure subscription tx succeeded)');
      console.log('   - Wallet mismatch (use same wallet for subscribe + activate)');
    }
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
