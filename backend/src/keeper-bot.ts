/**
 * Keeper Bot - Automated settlement trigger
 * 
 * Monitors TxLINE scores stream for match endings,
 * fetches Merkle proofs, and triggers settlement.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import BN from 'bn.js';
import TxLINEClient, { ScoreUpdate, StatValidation } from './txline-client';
import * as anchor from '@coral-xyz/anchor';

interface BetPool {
  fixtureId: number;
  outcomeType: number;
  totalStaked: number;
  isSettled: boolean;
}

interface SettlementConfig {
  txlineBaseUrl: string;
  predictionPoolProgramId: PublicKey;
  txlineProgramId: PublicKey;
  keeperWallet: anchor.Wallet;
  connection: Connection;
}

export class KeeperBot {
  private txlineClient: TxLINEClient;
  private config: SettlementConfig;
  private program: Program;
  private activePools: Map<number, BetPool> = new Map();
  private scoreStream: any;

  constructor(config: SettlementConfig, jwt: string, apiToken: string) {
    this.config = config;
    
    this.txlineClient = new TxLINEClient({
      baseUrl: config.txlineBaseUrl,
      jwt,
      apiToken,
    });

    // Initialize Anchor program
    const provider = new AnchorProvider(config.connection, config.keeperWallet, {
      commitment: 'confirmed',
    });

    // Load program IDL (would be loaded from file in production)
    const idl = require('../idl/prediction_pool.json');
    this.program = new Program(idl as any, config.predictionPoolProgramId, provider);
  }

  /**
   * Start monitoring for match endings
   */
  async startMonitoring() {
    console.log('🤖 Keeper Bot starting...');

    this.scoreStream = this.txlineClient.connectScoresStream(
      (update) => this.handleScoreUpdate(update),
      (error) => console.error('Stream error:', error)
    );

    console.log('✅ Connected to TxLINE scores stream');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.scoreStream) {
      this.txlineClient.disconnect(this.scoreStream);
      console.log('⏹️  Keeper Bot stopped');
    }
  }

  /**
   * Handle incoming score update
   */
  private async handleScoreUpdate(update: ScoreUpdate) {
    console.log(`📊 Score update: Fixture ${update.fixtureId} - ${update.homeScore}:${update.awayScore} (${update.gameState})`);

    // Check if match has ended
    if (update.gameState === 'FT' || update.gameState === 'ENDED') {
      console.log(`⚽ Match ${update.fixtureId} has ended! Triggering settlement...`);
      await this.settlePool(update.fixtureId, update);
    }
  }

  /**
   * Settle a prediction pool after match ends
   */
  private async settlePool(fixtureId: number, finalScore: ScoreUpdate) {
    try {
      // 1. Fetch Merkle proof from TxLINE
      console.log('🔐 Fetching Merkle proof...');
      const validation = await this.txlineClient.getStatValidation(
        fixtureId,
        finalScore.seq,
        1002 // statKey for home score (example)
      );

      console.log('✅ Merkle proof fetched');

      // 2. Prepare validation parameters
      const fixtureSummary = {
        fixtureId: new BN(validation.summary.fixtureId),
        updateStats: {
          updateCount: validation.summary.updateStats.updateCount,
          minTimestamp: new BN(validation.summary.updateStats.minTimestamp),
          maxTimestamp: new BN(validation.summary.updateStats.maxTimestamp),
        },
        eventsSubtreeRoot: validation.summary.eventStatsSubTreeRoot,
      };

      const fixtureProof = validation.subTreeProof.map((p) => ({
        hash: p.hash,
        isRightSibling: p.isRightSibling,
      }));

      const mainTreeProof = validation.mainTreeProof.map((p) => ({
        hash: p.hash,
        isRightSibling: p.isRightSibling,
      }));

      const statToProve = {
        statKey: validation.statToProve.statKey,
        statValue: new BN(validation.statToProve.statValue),
        statProof: validation.statProof.map((p) => ({
          hash: p.hash,
          isRightSibling: p.isRightSibling,
        })),
      };

      const predicate = {
        threshold: new BN(0),
        comparison: { greaterThan: {} },
      };

      // 3. Find daily scores PDA
      const epochDay = Math.floor(validation.summary.updateStats.minTimestamp / 86400000);
      const [dailyScoresPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('daily_scores_roots'),
          new BN(epochDay).toBuffer('le', 2),
        ],
        this.config.txlineProgramId
      );

      // 4. Execute settlement transaction
      console.log('📝 Executing settlement transaction...');
      const tx = await this.program.methods
        .settlePool(fixtureSummary, fixtureProof, mainTreeProof, predicate, statToProve)
        .accounts({
          admin: this.config.keeperWallet.publicKey,
          pool: await this.getPoolPda(fixtureId),
          txlineProgram: this.config.txlineProgramId,
          dailyScoresRoots: dailyScoresPda,
        })
        .rpc();

      console.log(`✅ Settlement successful! TX: ${tx}`);

      // 5. Notify winners (in production, emit events or update database)
      await this.notifyWinners(fixtureId);

    } catch (error) {
      console.error('❌ Settlement failed:', error);
      // In production: implement retry logic or alert system
    }
  }

  /**
   * Get pool PDA for a fixture
   */
  private async getPoolPda(fixtureId: number, outcomeType: number = 0): Promise<PublicKey> {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('pool'),
        new BN(fixtureId).toBuffer('le', 8),
        Buffer.from([outcomeType]),
      ],
      this.config.predictionPoolProgramId
    );
    return pda;
  }

  /**
   * Notify winners (placeholder - implement based on your notification system)
   */
  private async notifyWinners(fixtureId: number) {
    console.log(`📢 Notifying winners for fixture ${fixtureId}...`);
    // In production:
    // - Query database for winning bets
    // - Send notifications (email, push, Discord, etc.)
    // - Update UI state
  }

  /**
   * Manually trigger settlement for a specific fixture
   */
  async triggerSettlement(fixtureId: number) {
    console.log(`🔧 Manual settlement trigger for fixture ${fixtureId}`);
    
    const finalScore = await this.txlineClient.getScoreSnapshot(fixtureId);
    await this.settlePool(fixtureId, finalScore);
  }
}

export default KeeperBot;
