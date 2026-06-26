/**
 * TxLINE Client - Real-time sports data integration
 * 
 * Features:
 * - SSE stream for live odds and scores
 * - Merkle proof fetching for on-chain validation
 * - Authentication and token management
 */

import axios, { AxiosInstance } from 'axios';
import EventSource from 'eventsource';

export interface TxLINEConfig {
  baseUrl: string;
  jwt?: string;
  apiToken?: string;
}

export interface OddsUpdate {
  fixtureId: number;
  marketType: string;
  odds: number[];
  timestamp: number;
  seq: number;
}

export interface ScoreUpdate {
  fixtureId: number;
  homeScore: number;
  awayScore: number;
  gameState: string;
  timestamp: number;
  seq: number;
}

export interface MerkleProof {
  hash: string;
  isRightSibling: boolean;
}

export interface StatValidation {
  summary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    eventStatsSubTreeRoot: string;
  };
  subTreeProof: MerkleProof[];
  mainTreeProof: MerkleProof[];
  statToProve: {
    statKey: number;
    statValue: number;
  };
  statProof: MerkleProof[];
  eventStatRoot: string;
}

export class TxLINEClient {
  private client: AxiosInstance;
  private config: TxLINEConfig;

  constructor(config: TxLINEConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.jwt && { Authorization: `Bearer ${config.jwt}` }),
        ...(config.apiToken && { 'X-Api-Token': config.apiToken }),
      },
    });
  }

  /**
   * Update authentication tokens
   */
  setAuth(jwt: string, apiToken: string) {
    this.config.jwt = jwt;
    this.config.apiToken = apiToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    this.client.defaults.headers.common['X-Api-Token'] = apiToken;
  }

  /**
   * Get guest JWT token
   */
  async getGuestToken(): Promise<string> {
    const response = await this.client.post('/auth/guest/start');
    return response.data.token;
  }

  /**
   * Activate API token after on-chain subscription
   */
  async activateToken(txSig: string, walletSignature: string, leagues: number[] = []): Promise<string> {
    const response = await this.client.post('/api/token/activate', {
      txSig,
      walletSignature,
      leagues,
    });
    return response.data.token || response.data;
  }

  /**
   * Connect to odds SSE stream
   */
  connectOddsStream(
    onOddsUpdate: (update: OddsUpdate) => void,
    onError?: (error: Error) => void,
    fixtureId?: number
  ): EventSource {
    const url = new URL(`${this.config.baseUrl}/api/odds/stream`);
    if (fixtureId) {
      url.searchParams.set('fixture_id', fixtureId.toString());
    }

    const eventSource = new EventSource(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.jwt}`,
        'X-Api-Token': this.config.apiToken!,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onOddsUpdate(data as OddsUpdate);
      } catch (err) {
        console.error('Failed to parse odds update:', err);
      }
    };

    if (onError) {
      eventSource.onerror = () => {
        onError(new Error('Odds stream connection failed'));
      };
    }

    return eventSource;
  }

  /**
   * Connect to scores SSE stream
   * Falls back to REST polling if SSE fails
   */
  connectScoresStream(
    onScoreUpdate: (update: ScoreUpdate) => void,
    onError?: (error: Error) => void,
    fixtureId?: number
  ): EventSource {
    const url = new URL(`${this.config.baseUrl}/api/scores/stream`);
    if (fixtureId) {
      url.searchParams.set('fixture_id', fixtureId.toString());
    }

    const eventSource = new EventSource(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.jwt}`,
        'X-Api-Token': this.config.apiToken!,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    eventSource.onopen = () => {
      console.log('✅ SSE scores stream connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onScoreUpdate(data as ScoreUpdate);
      } catch (err) {
        console.error('Failed to parse score update:', err);
      }
    };

    if (onError) {
      eventSource.onerror = (err) => {
        console.log('⚠️ SSE failed, falling back to REST polling...');
        onError?.(new Error('Scores stream connection failed'));
      };
    }

    return eventSource;
  }

  /**
   * Get Merkle proof for stat validation
   */
  async getStatValidation(
    fixtureId: number,
    seq: number,
    statKey: number
  ): Promise<StatValidation> {
    const response = await this.client.get('/api/scores/stat-validation', {
      params: { fixtureId, seq, statKey },
    });
    return response.data as StatValidation;
  }

  /**
   * Get score snapshot for a fixture
   */
  async getScoreSnapshot(fixtureId: number, asOf?: number): Promise<ScoreUpdate> {
    const params: any = {};
    if (asOf) {
      params.asOf = asOf;
    }
    const response = await this.client.get(`/api/scores/snapshot/${fixtureId}`, { params });
    return response.data as ScoreUpdate;
  }

  /**
   * Get historical scores for a fixture
   */
  async getHistoricalScores(fixtureId: number): Promise<ScoreUpdate[]> {
    const response = await this.client.get(`/api/scores/historical/${fixtureId}`);
    return response.data as ScoreUpdate[];
  }

  /**
   * Get currently live odds for a fixture
   */
  async getLiveOdds(fixtureId: number): Promise<OddsUpdate[]> {
    const response = await this.client.get(`/api/odds/live/${fixtureId}`);
    return response.data as OddsUpdate[];
  }

  /**
   * Disconnect SSE streams
   */
  disconnect(stream: EventSource) {
    stream.close();
  }
}

export default TxLINEClient;
