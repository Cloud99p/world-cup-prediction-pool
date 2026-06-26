import axios, { AxiosInstance } from 'axios';
import { PredictionPool, ScoreUpdate, OddsUpdate, ApiResponse, PoolsResponse } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get all prediction pools
   */
  async getPools(): Promise<PredictionPool[]> {
    const response = await this.client.get<PoolsResponse>('/api/pools');
    return response.data.pools;
  }

  /**
   * Get pool details for a specific fixture
   */
  async getPoolDetails(fixtureId: number): Promise<PredictionPool> {
    const response = await this.client.get<PredictionPool>(`/api/pools/${fixtureId}`);
    return response.data;
  }

  /**
   * Get live odds for a fixture
   */
  async getLiveOdds(fixtureId: number): Promise<OddsUpdate[]> {
    const response = await this.client.get<OddsUpdate[]>(`/api/odds/${fixtureId}`);
    return response.data;
  }

  /**
   * Get current score for a fixture
   */
  async getScore(fixtureId: number): Promise<ScoreUpdate> {
    const response = await this.client.get<ScoreUpdate>(`/api/scores/${fixtureId}`);
    return response.data;
  }

  /**
   * Connect to SSE stream for live scores
   */
  connectScoresStream(
    fixtureId: number,
    onScoreUpdate: (update: ScoreUpdate) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const url = `${BACKEND_URL}/stream/scores?fixtureId=${fixtureId}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onScoreUpdate(data);
      } catch (err) {
        console.error('Failed to parse score update:', err);
      }
    };

    if (onError) {
      eventSource.onerror = () => {
        onError(new Error('Score stream connection failed'));
      };
    }

    return eventSource;
  }

  /**
   * Disconnect SSE stream
   */
  disconnectStream(stream: EventSource): void {
    stream.close();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
