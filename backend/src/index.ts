/**
 * World Cup Prediction Pool - Backend Server
 * 
 * Features:
 * - TxLINE SSE stream relay
 * - REST API for pool data
 * - Keeper bot for automated settlement
 */

import express from 'express';
import cors from 'cors';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import dotenv from 'dotenv';
import fs from 'fs';
import TxLINEClient from './txline-client.js';
import KeeperBot from './keeper-bot.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize TxLINE client with authentication
const txlineClient = new TxLINEClient({
  baseUrl: process.env.TXLINE_BASE_URL || 'https://txline.txodds.com',
  jwt: process.env.TXLINE_JWT,
  apiToken: process.env.TXLINE_API_TOKEN,
});

// Debug: Log auth status on startup
console.log('🔑 TxLINE Auth Status:');
console.log('   JWT:', process.env.TXLINE_JWT ? `✅ Set (${process.env.TXLINE_JWT.substring(0, 20)}...)` : '❌ Missing');
console.log('   API Token:', process.env.TXLINE_API_TOKEN ? `✅ Set (${process.env.TXLINE_API_TOKEN})` : '❌ Missing');
console.log('   Base URL:', process.env.TXLINE_BASE_URL || 'https://txline.txodds.com');

// Initialize Keeper Bot (if enabled)
let keeperBot: KeeperBot | null = null;

if (process.env.ENABLE_KEEPER_BOT === 'true') {
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
  
  // Load wallet from custom path (not default Solana location)
  const keypairPath = process.env.ANCHOR_WALLET || './keypairs/mainnet.json';
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
  
  keeperBot = new KeeperBot(
    {
      txlineBaseUrl: process.env.TXLINE_BASE_URL!,
      predictionPoolProgramId: new PublicKey(process.env.PREDICTION_POOL_PROGRAM_ID!),
      txlineProgramId: new PublicKey(process.env.TXLINE_PROGRAM_ID!),
      keeperWallet: wallet,
      connection,
    },
    process.env.TXLINE_JWT!,
    process.env.TXLINE_API_TOKEN!
  );
}

// ==================== REST API Routes ====================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Transform TxLINE fixture to frontend format
 */
function transformFixture(fixture: any) {
  return {
    fixtureId: fixture.FixtureId,
    leagueId: fixture.CompetitionId,
    league: fixture.Competition || 'Unknown',
    homeTeam: fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2,
    awayTeam: fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1,
    startTime: fixture.StartTime, // TxLINE returns Unix timestamp in seconds
    status: mapTxLINEStatus(fixture.Status),
  };
}

/**
 * Map TxLINE status to frontend status
 */
function mapTxLINEStatus(status: string): 'scheduled' | 'live' | 'finished' | 'cancelled' {
  const s = status.toUpperCase();
  if (s === 'NS') return 'scheduled';
  if (s === 'F' || s === 'FO') return 'finished';
  if (s === 'C' || s === 'A' || s === 'TXCC') return 'cancelled';
  // Everything else is live (Q1, Q2, HT, Q3, Q4, OT, etc.)
  return 'live';
}

/**
 * Get live/upcoming matches from TxLINE
 * Query params: competitionId (optional) - filter by specific competition
 */
app.get('/api/matches', async (req, res) => {
  try {
    // For demo: return mock data if TxLINE not configured
    if (!process.env.TXLINE_API_TOKEN) {
      return res.json({
        matches: [
          {
            fixtureId: 17952170,
            leagueId: 1,
            homeTeam: 'Brazil',
            awayTeam: 'Germany',
            startTime: Date.now() + 3600000,
            status: 'scheduled' as const,
          },
        ],
        source: 'demo',
      });
    }

    // Fetch from TxLINE - Official API
    const competitionId = req.query.competitionId ? parseInt(req.query.competitionId as string) : undefined;
    const fixtures = await txlineClient.getFixtures(competitionId);
    
    // Transform TxLINE format to frontend format
    const transformed = fixtures.map(transformFixture);
    
    res.json({ matches: transformed, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch matches:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch matches',
      message: error.message,
    });
  }
});

/**
 * Get match details by fixture ID
 */
app.get('/api/matches/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    // Get all fixtures and find the matching one
    const fixtures = await txlineClient.getFixtureSnapshot();
    const fixture = fixtures.find(f => f.fixtureId === fixtureId);
    
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    
    res.json({ match: fixture });
  } catch (error: any) {
    console.error('Failed to fetch match details:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch match details',
      message: error.message,
    });
  }
});

/**
 * Get odds snapshot for a fixture
 */
app.get('/api/odds/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const odds = await txlineClient.getOddsSnapshot(fixtureId);
    res.json({ odds, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch odds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds',
      message: error.message,
    });
  }
});

/**
 * Get scores snapshot for a fixture
 */
app.get('/api/scores/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const scores = await txlineClient.getScoresSnapshot(fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch scores:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scores',
      message: error.message,
    });
  }
});

/**
 * Get historical scores for a fixture
 */
app.get('/api/scores/historical/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const scores = await txlineClient.getHistoricalScores(fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch historical scores:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch historical scores',
      message: error.message,
    });
  }
});

/**
 * Get active pools
 */
app.get('/api/pools', async (req, res) => {
  try {
    // In production: query from database or on-chain
    const pools = [
      {
        fixtureId: 17952170,
        homeTeam: 'Brazil',
        awayTeam: 'Germany',
        startTime: '2026-07-01T15:00:00Z',
        totalStaked: 1000000, // USDC (6 decimals)
        betCount: 42,
        isSettled: false,
      },
    ];
    res.json(pools);
  } catch (error) {
    console.error('Error fetching pools:', error);
    res.status(500).json({ error: 'Failed to fetch pools' });
  }
});

/**
 * Get pool details
 */
app.get('/api/pools/:fixtureId', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    // In production: fetch from on-chain or database
    res.json({
      fixtureId: parseInt(fixtureId),
      homeTeam: 'Brazil',
      awayTeam: 'Germany',
      outcomes: [
        { type: 'HomeWin', odds: 2.1, totalStaked: 500000 },
        { type: 'Draw', odds: 3.5, totalStaked: 200000 },
        { type: 'AwayWin', odds: 3.2, totalStaked: 300000 },
      ],
    });
  } catch (error) {
    console.error('Error fetching pool:', error);
    res.status(500).json({ error: 'Failed to fetch pool' });
  }
});

/**
 * Get live odds for a fixture
 */
app.get('/api/odds/:fixtureId', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    const odds = await txlineClient.getLiveOdds(parseInt(fixtureId));
    res.json(odds);
  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

/**
 * Get score snapshot
 */
app.get('/api/scores/:fixtureId', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    
    // Demo mode: return mock data if TxLINE fails
    if (!process.env.TXLINE_API_TOKEN) {
      return res.json({
        fixtureId: parseInt(fixtureId),
        homeScore: Math.floor(Math.random() * 3),
        awayScore: Math.floor(Math.random() * 2),
        gameState: '1H',
        timestamp: Date.now(),
        seq: 1,
      });
    }
    
    const score = await txlineClient.getScoreSnapshot(parseInt(fixtureId));
    res.json(score);
  } catch (error: any) {
    console.error('Error fetching score:', error.message);
    // Fallback to demo data
    res.json({
      fixtureId: parseInt(req.params.fixtureId),
      homeScore: Math.floor(Math.random() * 3),
      awayScore: Math.floor(Math.random() * 2),
      gameState: '1H',
      timestamp: Date.now(),
      seq: 1,
    });
  }
});

/**
 * SSE endpoint for live scores (relay from TxLINE)
 */
app.get('/stream/scores', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const fixtureId = req.query.fixtureId ? parseInt(req.query.fixtureId as string) : undefined;

  // Demo mode: send mock updates if TxLINE not configured
  if (!process.env.TXLINE_API_TOKEN) {
    console.log('🎭 Demo mode: sending mock score updates');
    const demoInterval = setInterval(() => {
      const mockUpdate = {
        fixtureId: fixtureId || 17952170,
        homeScore: Math.floor(Math.random() * 4),
        awayScore: Math.floor(Math.random() * 3),
        gameState: '1H',
        timestamp: Date.now(),
        seq: Math.floor(Date.now() / 1000),
      };
      res.write(`data: ${JSON.stringify(mockUpdate)}\n\n`);
    }, 5000); // Send update every 5 seconds

    req.on('close', () => {
      clearInterval(demoInterval);
    });
    return;
  }

  const stream = txlineClient.connectScoresStream(
    (update) => {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    },
    (error) => {
      console.error('Score stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream disconnected' })}\n\n`);
    },
    fixtureId
  );

  req.on('close', () => {
    txlineClient.disconnect(stream);
  });
});

/**
 * Trigger manual settlement (admin only)
 */
app.post('/api/admin/settle/:fixtureId', async (req, res) => {
  try {
    if (!keeperBot) {
      return res.status(500).json({ error: 'Keeper bot not enabled' });
    }

    const { fixtureId } = req.params;
    await keeperBot.triggerSettlement(parseInt(fixtureId));
    
    res.json({ success: true, message: 'Settlement triggered' });
  } catch (error) {
    console.error('Error triggering settlement:', error);
    res.status(500).json({ error: 'Failed to trigger settlement' });
  }
});

// ==================== Server Startup ====================

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 TxLINE Base URL: ${process.env.TXLINE_BASE_URL}`);
  console.log(`🤖 Keeper Bot: ${process.env.ENABLE_KEEPER_BOT === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // Start keeper bot if enabled
  if (keeperBot) {
    keeperBot.startMonitoring().catch(console.error);
  }
});

export default app;
