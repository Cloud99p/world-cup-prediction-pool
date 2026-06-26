#!/usr/bin/env node

/**
 * SUPER Simple TxLINE JWT Getter
 * 
 * No Anchor, no web3.js - just axios!
 * Gets guest JWT and saves to .env
 * 
 * For hackathon: Guest JWT = Premium access (FREE)
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getJWT() {
  console.log('🚀 Getting TxLINE Guest JWT...\n');

  try {
    // Get guest JWT
    console.log('📡 Requesting JWT from TxLINE...');
    const response = await axios.post('https://txline.txodds.com/auth/guest/start');
    const jwt = response.data.token;
    
    console.log('✅ JWT received!\n');
    console.log('Token:', jwt.substring(0, 60) + '...\n');

    // Save to .env
    const envPath = path.resolve(__dirname, '../backend/.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env file not found!');
      console.log('   Run: cp .env.example .env');
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');
    envContent = envContent.replace(
      /TXLINE_JWT=.*/,
      `TXLINE_JWT=${jwt}`
    );
    // Also update API_TOKEN field
    if (envContent.includes('TXLINE_API_TOKEN=')) {
      envContent = envContent.replace(
        /TXLINE_API_TOKEN=.*/,
        `TXLINE_API_TOKEN=${jwt}`
      );
    }
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ JWT saved to .env\n');
    
    console.log('📋 IMPORTANT: Hackathon Free Tier Info\n');
    console.log('═══════════════════════════════════════════');
    console.log('✅ Your guest JWT has PREMIUM access during hackathon!');
    console.log('✅ Service Level 12 (Real-time World Cup) - FREE');
    console.log('✅ No on-chain activation needed!\n');
    
    console.log('📋 Next Steps:');
    console.log('   1. Restart backend: npm run dev');
    console.log('   2. Open http://localhost:3000');
    console.log('   3. Test the API!\n');
    
    console.log('🆘 If SSE streaming fails:');
    console.log('   - Check internet: ping google.com');
    console.log('   - Check DNS: nslookup txline.txodds.com');
    console.log('   - Email support: support@txline.txodds.com');
    console.log('   - Mention: Superteam World Cup Hackathon 2026\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Check internet connection');
    console.log('   - Verify TxLINE API is accessible');
    console.log('   - Try: curl https://txline.txodds.com/auth/guest/start\n');
  }
}

getJWT();
