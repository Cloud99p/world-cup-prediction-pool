'use client';

import { useEffect, useRef, useCallback } from 'react';

interface OddsUpdate {
  type: 'odds_update';
  fixtureId: number;
  marketType: string;
  odds: number[];
  timestamp: number;
}

interface ScoreUpdate {
  type: 'score_update';
  fixtureId: number;
  homeScore: number;
  awayScore: number;
  gameState: string;
  timestamp: number;
}

interface UseLiveStreamOptions {
  onOddsUpdate?: (update: OddsUpdate) => void;
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook for real-time odds and scores updates via SSE
 * Bet9ja-style live updates
 */
export function useLiveStream(options: UseLiveStreamOptions = {}) {
  const { onOddsUpdate, onScoreUpdate, onError, enabled = true } = options;
  const oddsSourceRef = useRef<EventSource | null>(null);
  const scoresSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    console.log('📡 Connecting to live streams...');

    // Connect to odds stream
    try {
      const oddsSource = new EventSource('/api/odds/stream');
      
      oddsSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'odds_update' && onOddsUpdate) {
            onOddsUpdate(data as OddsUpdate);
          } else if (data.type === 'heartbeat') {
            // Ignore heartbeats (just keeps connection alive)
          } else if (data.type === 'connected') {
            console.log('✅', data.message);
          } else if (data.type === 'error' && onError) {
            onError(new Error(data.message));
          }
        } catch (err) {
          console.error('Failed to parse odds update:', err);
        }
      };

      oddsSource.onerror = (err) => {
        console.log('⚠️ Odds stream error (will reconnect)');
        // Don't trigger error - let it reconnect automatically
      };

      oddsSourceRef.current = oddsSource;
      console.log('✅ Connected to odds stream');
    } catch (error) {
      console.error('Failed to connect to odds stream:', error);
    }

    // Connect to scores stream
    try {
      const scoresSource = new EventSource('/api/scores/stream');
      
      scoresSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'score_update' && onScoreUpdate) {
            onScoreUpdate(data as ScoreUpdate);
          } else if (data.type === 'heartbeat') {
            // Ignore heartbeats (just keeps connection alive)
          } else if (data.type === 'connected') {
            console.log('✅', data.message);
          } else if (data.type === 'error' && onError) {
            onError(new Error(data.message));
          }
        } catch (err) {
          console.error('Failed to parse score update:', err);
        }
      };

      scoresSource.onerror = (err) => {
        console.log('⚠️ Scores stream error (will reconnect)');
        // Don't trigger error - let it reconnect automatically
      };

      scoresSourceRef.current = scoresSource;
      console.log('✅ Connected to scores stream');
    } catch (error) {
      console.error('Failed to connect to scores stream:', error);
    }
  }, [enabled, onOddsUpdate, onScoreUpdate, onError]);

  const disconnect = useCallback(() => {
    if (oddsSourceRef.current) {
      oddsSourceRef.current.close();
      oddsSourceRef.current = null;
      console.log('🔌 Disconnected from odds stream');
    }

    if (scoresSourceRef.current) {
      scoresSourceRef.current.close();
      scoresSourceRef.current = null;
      console.log('🔌 Disconnected from scores stream');
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: oddsSourceRef.current !== null || scoresSourceRef.current !== null,
  };
}
