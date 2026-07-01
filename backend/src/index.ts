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
import { registerTxLINERoutes } from './routes-txline.js';

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

// Register TxLINE routes (properly ordered to avoid 404 errors)
registerTxLINERoutes(app, txlineClient);

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
    status: mapTxLINEStatus(fixture.Status, fixture.StartTime),
  };
}

/**
 * Map TxLINE status to frontend status
 */
function mapTxLINEStatus(status: string | undefined, startTime?: number): 'scheduled' | 'live' | 'finished' | 'cancelled' {
  if (!status) {
    // If no status, check if match should be live based on start time
    if (startTime) {
      const now = Date.now();
      const startMs = startTime * 1000; // Convert to milliseconds
      const matchStart = new Date(startMs).getTime();
      const matchEnd = matchStart + (2 * 60 * 60 * 1000); // 2 hours after start
      
      if (now >= matchStart && now <= matchEnd) {
        return 'live';
      }
    }
    return 'scheduled';
  }
  
  const s = status.toUpperCase();
  if (s === 'NS') return 'scheduled';
  if (s === 'F' || s === 'FO') return 'finished';
  if (s === 'C' || s === 'A' || s === 'TXCC') return 'cancelled';
  // Everything else is live (Q1, Q2, HT, Q3, Q4, OT, H1, H2, etc.)
  return 'live';
}

/**
 * Transform TxLINE odds to frontend format
 */
function transformOdds(txlineOdds: any[]) {
  const oddsMap: Record<string, number> = {
    HomeWin: 0,
    Draw: 0,
    AwayWin: 0,
    Over2_5: 0,
    Under2_5: 0,
  };
  
  // TxLINE provides Asian Handicap and Over/Under markets (not 1X2)
  // We'll extract Over/Under 2.5 goals as the main market
  for (const odd of txlineOdds || []) {
    const superType = odd.SuperOddsType?.toUpperCase() || '';
    const params = odd.MarketParameters || '';
    const prices = odd.Prices || [];
    
    // Look for Over/Under 2.5 goals
    if (superType.includes('OVERUNDER') && params.includes('2.5')) {
      if (prices.length >= 2) {
        // Prices are in format [over, under] as integers (multiplied by 1000)
        const overOdd = prices[0] / 1000; // Convert from 1694 to 1.694
        const underOdd = prices[1] / 1000;
        console.log(`📊 Found Over/Under 2.5: Over=${overOdd.toFixed(2)}, Under=${underOdd.toFixed(2)}`);
        oddsMap.Over2_5 = overOdd;
        oddsMap.Under2_5 = underOdd;
        
        // For 1X2, we'll use a simple conversion (not perfect but works for demo)
        // This is a placeholder - in production you'd fetch actual 1X2 odds
        oddsMap.HomeWin = 2.0; // Placeholder
        oddsMap.Draw = 3.0;    // Placeholder
        oddsMap.AwayWin = 2.5; // Placeholder
        break;
      }
    }
  }
  
  if (oddsMap.Over2_5 === 0 && oddsMap.Under2_5 === 0) {
    console.log(`⚠️ No Over/Under odds found in ${txlineOdds?.length || 0} markets`);
  }
  
  return oddsMap;
}

/**
 * Get upcoming matches (sorted by start time: nearest first)
 */
app.get('/api/matches/upcoming', async (req, res) => {
  try {
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures();
    
    // Filter for scheduled/upcoming matches
    const upcomingMatches = fixtures.filter((fixture: any) => {
      const status = mapTxLINEStatus(fixture.Status, fixture.StartTime);
      return status === 'scheduled';
    });
    
    // Sort by start time (nearest first)
    upcomingMatches.sort((a: any, b: any) => a.StartTime - b.StartTime);
    
    // Transform and fetch odds for upcoming matches
    const matches = await Promise.all(
      upcomingMatches.map(async (fixture: any) => {
        const odds = await txlineClient.getOddsSnapshot(fixture.FixtureId);
        return {
          ...transformFixture(fixture),
          odds: transformOdds(odds),
        };
      })
    );
    
    res.json({ matches, count: matches.length, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch upcoming matches:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch upcoming matches',
      message: error.message,
    });
  }
});

/**
 * Get live matches only (MUST come before /:fixtureId)
 */
app.get('/api/matches/live', async (req, res) => {
  try {
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures();
    
    // Filter for live matches
    const liveMatches = fixtures.filter((fixture: any) => {
      const status = mapTxLINEStatus(fixture.Status, fixture.StartTime);
      return status === 'live';
    });
    
    // Transform and fetch odds for live matches
    const matches = await Promise.all(
      liveMatches.map(async (fixture: any) => {
        const odds = await txlineClient.getOddsSnapshot(fixture.FixtureId);
        return {
          ...transformFixture(fixture),
          odds: transformOdds(odds),
        };
      })
    );
    
    res.json({ matches, count: matches.length, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch live matches:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch live matches',
      message: error.message,
    });
  }
});

/**
 * Get previous/finished matches with scores (MUST come before /:fixtureId)
 */
app.get('/api/matches/previous', async (req, res) => {
  try {
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures();
    
    // Filter for finished matches
    const finishedMatches = fixtures.filter((fixture: any) => {
      const status = mapTxLINEStatus(fixture.Status, fixture.StartTime);
      return status === 'finished';
    });
    
    // Sort by most recent first
    finishedMatches.sort((a: any, b: any) => b.StartTime - a.StartTime);
    
    // Transform and fetch final scores for finished matches
    const matches = await Promise.all(
      finishedMatches.map(async (fixture: any) => {
        try {
          const scores = await txlineClient.getScoresSnapshot(fixture.FixtureId).catch(() => []);
          return {
            ...transformFixture(fixture),
            scores: scores[0] || null,
          };
        } catch (err: any) {
          console.error(`Failed to fetch data for fixture ${fixture.FixtureId}:`, err.message);
          return {
            ...transformFixture(fixture),
            scores: null,
          };
        }
      })
    );
    
    res.json({ matches, count: matches.length, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch previous matches:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch previous matches',
      message: error.message,
    });
  }
});

/**
 * Get matches filtered by league (MUST come before /:fixtureId)
 */
app.get('/api/matches/league/:leagueId', async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures(leagueId);
    
    const matches = await Promise.all(
      fixtures.map(async (fixture: any) => {
        const odds = await txlineClient.getOddsSnapshot(fixture.FixtureId);
        return {
          ...transformFixture(fixture),
          odds: transformOdds(odds),
        };
      })
    );
    
    res.json({ matches, count: matches.length, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch league matches:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch league matches',
      message: error.message,
    });
  }
});

/**
 * Get single match details (MUST come AFTER specific routes)
 */
app.get('/api/matches/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures();
    const fixture = fixtures.find((f: any) => f.FixtureId === fixtureId);
    
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const odds = await txlineClient.getOddsSnapshot(fixtureId);
    const scores = await txlineClient.getScoresSnapshot(fixtureId);
    
    res.json({
      match: transformFixture(fixture),
      odds: transformOdds(odds),
      scores: scores[0] || null,
      source: 'txline',
    });
  } catch (error: any) {
    console.error('Failed to fetch match details:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch match details',
      message: error.message,
    });
  }
});

/**
 * Get all leagues with match counts
 */
app.get('/api/leagues', async (req, res) => {
  try {
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtures();
    
    // Group by league
    const leagueMap = new Map<number, { id: number; name: string; count: number }>();
    
    for (const fixture of fixtures) {
      const leagueId = fixture.CompetitionId;
      const leagueName = fixture.Competition || 'Unknown';
      
      if (!leagueMap.has(leagueId)) {
        leagueMap.set(leagueId, { id: leagueId, name: leagueName, count: 0 });
      }
      
      leagueMap.get(leagueId)!.count++;
    }
    
    const leagues = Array.from(leagueMap.values());
    res.json({ leagues, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch leagues:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch leagues',
      message: error.message,
    });
  }
});

/**
 * Get pools (placeholder - implement on-chain later)
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
 * Admin endpoint to settle a pool (keeper bot)
 */
app.post('/api/admin/settle/:fixtureId', async (req, res) => {
  try {
    if (!keeperBot) {
      return res.status(400).json({ error: 'Keeper bot not enabled' });
    }

    const fixtureId = parseInt(req.params.fixtureId);
    
    // Fetch final score from TxLINE
    const scores = await txlineClient.getScoresSnapshot(fixtureId);
    const finalScore = scores[0];
    
    if (!finalScore || !['FT', 'AET', 'PEN'].includes(finalScore.GameState)) {
      return res.status(400).json({ error: 'Match not finished' });
    }
    
    // Settle on-chain
    const result = await keeperBot.settlePool(fixtureId, finalScore);
    
    res.json({
      success: true,
      fixtureId,
      finalScore: {
        home: finalScore.HomeScore,
        away: finalScore.AwayScore,
      },
      txSignature: result.txSignature,
    });
  } catch (error: any) {
    console.error('Error settling pool:', error.message);
    res.status(500).json({ 
      error: 'Failed to settle pool',
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`⚽ Matches: http://localhost:${PORT}/api/matches`);
  console.log(`🔴 Live: http://localhost:${PORT}/api/matches/live`);
  console.log(`📊 Leagues: http://localhost:${PORT}/api/leagues`);
});

export default app;
