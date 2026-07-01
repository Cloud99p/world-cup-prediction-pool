/**
 * TxLINE Client - Official TxODDS Implementation
 * 
 * Based on: https://github.com/txodds/tx-on-chain
 * Docs: https://txline.txodds.com/documentation/quickstart
 */

import axios, { AxiosInstance } from 'axios';
import EventSource from 'eventsource';

export interface TxLINEConfig {
  baseUrl: string;
  jwt: string;
  apiToken: string;
}

export interface Fixture {
  FixtureId: number;
  CompetitionId: number;
  Participant1: string;
  Participant2: string;
  Participant1IsHome: boolean;
  StartTime: number;
  Status: string;
}

export interface OddsUpdate {
  FixtureId: number;
  MarketType: string;
  Odds: number[];
  Timestamp: number;
  Seq: number;
}

export interface ScoreUpdate {
  FixtureId: number;
  HomeScore: number;
  AwayScore: number;
  GameState: string;
  Timestamp: number;
  Seq: number;
}

export class TxLINEClient {
  private client: AxiosInstance;
  private config: TxLINEConfig;

  constructor(config: TxLINEConfig) {
    this.config = config;
    
    // Create axios instance with auth headers
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.jwt}`,
        'X-Api-Token': config.apiToken,
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

  // ==================== FIXTURES ====================

  /**
   * Get fixtures snapshot
   * GET /api/fixtures/snapshot
   */
  async getFixtures(competitionId?: number, startEpochDay?: number): Promise<Fixture[]> {
    const params: Record<string, any> = {};
    if (competitionId) params.competitionId = competitionId;
    if (startEpochDay) params.startEpochDay = startEpochDay;
    
    const response = await this.client.get('/api/fixtures/snapshot', { params });
    return response.data as Fixture[];
  }

  /**
   * Get fixture updates for a time period
   * GET /api/fixtures/updates/{epochDay}/{hourOfDay}
   */
  async getFixtureUpdates(epochDay: number, hourOfDay: number): Promise<Fixture[]> {
    const response = await this.client.get(`/api/fixtures/updates/${epochDay}/${hourOfDay}`);
    return response.data as Fixture[];
  }

  // ==================== ODDS ====================

  /**
   * Get odds snapshot for a fixture
   * GET /api/odds/snapshot/{fixtureId}
   */
  async getOddsSnapshot(fixtureId: number, asOf?: number): Promise<OddsUpdate[]> {
    const params: Record<string, any> = {};
    if (asOf) params.asOf = asOf;
    
    const response = await this.client.get(`/api/odds/snapshot/${fixtureId}`, { params });
    return response.data as OddsUpdate[];
  }

  /**
   * Get live odds updates for a fixture
   * GET /api/odds/updates/{fixtureId}
   */
  async getOddsUpdates(fixtureId: number): Promise<OddsUpdate[]> {
    const response = await this.client.get(`/api/odds/updates/${fixtureId}`);
    return response.data as OddsUpdate[];
  }

  /**
   * Get historical odds for a 5-minute interval
   * GET /api/odds/updates/{epochDay}/{hourOfDay}/{interval}
   */
  async getOddsUpdatesByInterval(
    epochDay: number,
    hourOfDay: number,
    interval: number,
    fixtureId?: number
  ): Promise<OddsUpdate[]> {
    const params: Record<string, any> = {};
    if (fixtureId) params.fixtureId = fixtureId;
    
    const response = await this.client.get(
      `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}`,
      { params }
    );
    return response.data as OddsUpdate[];
  }

  /**
   * Connect to odds SSE stream
   * GET /api/odds/stream
   */
  connectOddsStream(
    onOddsUpdate: (update: OddsUpdate) => void,
    onError?: (error: Error) => void,
    fixtureId?: number
  ): EventSource {
    const url = new URL(`${this.config.baseUrl}/api/odds/stream`);
    if (fixtureId) {
      url.searchParams.set('fixtureId', fixtureId.toString());
    }

    const eventSource = new EventSource(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.config.jwt}`,
        'X-Api-Token': this.config.apiToken,
        'Accept': 'text/event-stream',
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

  // ==================== SCORES ====================

  /**
   * Get scores snapshot for a fixture
   * GET /api/scores/snapshot/{fixtureId}
   */
  async getScoresSnapshot(fixtureId: number, asOf?: number): Promise<ScoreUpdate[]> {
    const params: Record<string, any> = {};
    if (asOf) params.asOf = asOf;
    
    const response = await this.client.get(`/api/scores/snapshot/${fixtureId}`, { params });
    return response.data as ScoreUpdate[];
  }

  /**
   * Get live scores updates for a fixture
   * GET /api/scores/updates/{fixtureId}
   */
  async getScoresUpdates(fixtureId: number): Promise<ScoreUpdate[]> {
    const response = await this.client.get(`/api/scores/updates/${fixtureId}`);
    return response.data as ScoreUpdate[];
  }

  /**
   * Get historical scores for a fixture (2 weeks - 6 hours ago)
   * GET /api/scores/historical/{fixtureId}
   */
  async getHistoricalScores(fixtureId: number): Promise<ScoreUpdate[]> {
    const response = await this.client.get(`/api/scores/historical/${fixtureId}`);
    return response.data as ScoreUpdate[];
  }

  /**
   * Get historical scores for a 5-minute interval
   * GET /api/scores/updates/{epochDay}/{hourOfDay}/{interval}
   */
  async getScoresUpdatesByInterval(
    epochDay: number,
    hourOfDay: number,
    interval: number,
    fixtureId?: number
  ): Promise<ScoreUpdate[]> {
    const params: Record<string, any> = {};
    if (fixtureId) params.fixtureId = fixtureId;
    
    const response = await this.client.get(
      `/api/scores/updates/${epochDay}/${hourOfDay}/${interval}`,
      { params }
    );
    return response.data as ScoreUpdate[];
  }

  /**
   * Connect to scores SSE stream
   * GET /api/scores/stream
   */
  connectScoresStream(
    onScoreUpdate: (update: ScoreUpdate) => void,
    onError?: (error: Error) => void,
    fixtureId?: number
  ): EventSource {
    const url = new URL(`${this.config.baseUrl}/api/scores/stream`);
    if (fixtureId) {
      url.searchParams.set('fixtureId', fixtureId.toString());
    }

    const eventSource = new EventSource(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.config.jwt}`,
        'X-Api-Token': this.config.apiToken,
        'Accept': 'text/event-stream',
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
   * GET /api/scores/stat-validation
   */
  async getStatValidation(
    fixtureId: number,
    seq: number,
    statKey: number,
    statKey2?: number,
    statKeys?: string
  ): Promise<any> {
    const params: Record<string, any> = { fixtureId, seq, statKey };
    if (statKey2) params.statKey2 = statKey2;
    if (statKeys) params.statKeys = statKeys;
    
    const response = await this.client.get('/api/scores/stat-validation', { params });
    return response.data;
  }
}

export default TxLINEClient;
