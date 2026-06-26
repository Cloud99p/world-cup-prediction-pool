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

// Initialize TxLINE client
const txlineClient = new TxLINEClient({
  baseUrl: process.env.TXLINE_BASE_URL || 'https://txline.txodds.com',
});

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
    const score = await txlineClient.getScoreSnapshot(parseInt(fixtureId));
    res.json(score);
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).json({ error: 'Failed to fetch score' });
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
