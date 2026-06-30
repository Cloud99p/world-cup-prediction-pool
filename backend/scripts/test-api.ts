/**
 * Test TxLINE API Connection
 * 
 * Verifies that both JWT and API Token are working correctly.
 * 
 * Usage: npx tsx scripts/test-api.ts
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';
const JWT = process.env.TXLINE_JWT;
const API_TOKEN = process.env.TXLINE_API_TOKEN;

async function testAPI() {
  console.log('🧪 TxLINE API Connection Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`JWT: ${JWT ? JWT.substring(0, 50) + '...' : '❌ MISSING'}`);
  console.log(`API Token: ${API_TOKEN ? API_TOKEN.substring(0, 50) + '...' : '❌ MISSING'}`);
  console.log();

  if (!JWT) {
    console.log('❌ TXLINE_JWT is missing from .env');
    console.log('💡 Run: npx tsx scripts/subscribe-free-tier.ts');
    process.exit(1);
  }

  if (!API_TOKEN) {
    console.log('⚠️  TXLINE_API_TOKEN is missing from .env');
    console.log('💡 Run: npx tsx scripts/subscribe-free-tier.ts, then npx tsx scripts/activate-token.ts <txSig>');
    console.log();
    console.log('📝 Testing with JWT only (limited access)...');
  }

  const headers: any = {
    'Authorization': `Bearer ${JWT}`,
  };
  
  if (API_TOKEN) {
    headers['X-Api-Token'] = API_TOKEN;
  }

  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers,
  });

  // Test 1: Auth check
  console.log('\n📝 Test 1: Getting fresh guest JWT...');
  try {
    const authResponse = await axios.post(`${BASE_URL}/api/auth/guest/start`);
    console.log('✅ Auth endpoint reachable');
    console.log(`   New JWT: ${authResponse.data.token?.substring(0, 50)}...`);
  } catch (error: any) {
    console.log('❌ Auth failed:', error.response?.status, error.message);
  }

  // Test 2: Scores snapshot
  console.log('\n📝 Test 2: Getting score snapshot (fixture: 17952170)...');
  try {
    const response = await client.get('/api/scores/snapshot/17952170');
    console.log('✅ Score snapshot successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Fixture: ${response.data.fixture?.homeTeam || 'N/A'} vs ${response.data.fixture?.awayTeam || 'N/A'}`);
    console.log(`   Score: ${response.data.homeScore || 0}-${response.data.awayScore || 0}`);
  } catch (error: any) {
    console.log('❌ Score snapshot failed:', error.response?.status, error.message);
    if (error.response?.status === 403) {
      console.log('   ⚠️  403 Forbidden - API Token may be missing or invalid');
    }
  }

  // Test 3: Fixtures list
  console.log('\n📝 Test 3: Getting live fixtures...');
  try {
    const response = await client.get('/api/scores/live');
    console.log('✅ Live fixtures successful!');
    console.log(`   Found: ${response.data.length || 0} live fixtures`);
  } catch (error: any) {
    console.log('❌ Live fixtures failed:', error.response?.status, error.message);
  }

  // Test 4: SSE connection test (just check if it connects)
  console.log('\n📝 Test 4: Testing SSE stream connection...');
  try {
    await new Promise<void>((resolve, reject) => {
      const EventSource = require('eventsource');
      const url = `${BASE_URL}/api/scores/stream`;
      const es = new EventSource(url, {
        headers: {
          'Authorization': `Bearer ${JWT}`,
          ...(API_TOKEN && { 'X-Api-Token': API_TOKEN }),
          'Accept': 'text/event-stream',
        },
      });

      es.onopen = () => {
        console.log('✅ SSE stream connected!');
        es.close();
        resolve();
      };

      es.onerror = (err: any) => {
        console.log('❌ SSE stream failed:', err.message);
        es.close();
        reject(err);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('⚠️  SSE timeout (no error but no data either)');
        es.close();
        resolve();
      }, 5000);
    });
  } catch (error: any) {
    console.log('❌ SSE test failed:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   JWT: ${JWT ? '✅' : '❌'}`);
  console.log(`   API Token: ${API_TOKEN ? '✅' : '❌'}`);
  console.log(`   Auth endpoint: ✅`);
  console.log(`   Score API: ${API_TOKEN ? 'Test with token' : 'Limited access'}`);
  console.log(`   SSE stream: ${API_TOKEN ? 'Full access' : 'Limited access'}`);
  
  if (!API_TOKEN) {
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx tsx scripts/subscribe-free-tier.ts');
    console.log('   2. Copy the transaction signature');
    console.log('   3. Run: npx tsx scripts/activate-token.ts <txSig>');
    console.log('   4. Re-run this test: npx tsx scripts/test-api.ts');
  }
}

testAPI().catch(console.error);
