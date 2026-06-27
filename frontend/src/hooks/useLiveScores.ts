'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScoreUpdate, MatchFixture } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

interface UseLiveScoresProps {
  fixtureId?: number;
  enabled?: boolean;
  onScoreUpdate?: (update: ScoreUpdate) => void;
}

export function useLiveScores({ fixtureId, enabled = true, onScoreUpdate }: UseLiveScoresProps) {
  const [scores, setScores] = useState<Map<number, ScoreUpdate>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial scores via REST
  const fetchScores = useCallback(async () => {
    try {
      const url = fixtureId
        ? `${BACKEND_URL}/api/scores/${fixtureId}`
        : `${BACKEND_URL}/api/scores/live`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch scores');
      
      const data = await response.json();
      const updates = Array.isArray(data) ? data : [data];
      
      const newScores = new Map(scores);
      updates.forEach((update: ScoreUpdate) => {
        newScores.set(update.fixtureId, update);
      });
      
      setScores(newScores);
      updates.forEach((update: ScoreUpdate) => onScoreUpdate?.(update));
    } catch (err: any) {
      console.error('Score fetch error:', err.message);
    }
  }, [fixtureId, onScoreUpdate, scores]);

  // Start SSE stream
  const connectSSE = useCallback(() => {
    if (!enabled) return;

    try {
      const url = new URL(`${BACKEND_URL}/stream/scores`);
      if (fixtureId) {
        url.searchParams.set('fixtureId', fixtureId.toString());
      }

      const eventSource = new EventSource(url.toString());

      eventSource.onopen = () => {
        console.log('✅ SSE scores stream connected');
        setIsLive(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const update: ScoreUpdate = JSON.parse(event.data);
          console.log('📊 Live score update:', update);
          
          setScores(prev => {
            const newScores = new Map(prev);
            newScores.set(update.fixtureId, update);
            return newScores;
          });
          
          onScoreUpdate?.(update);
        } catch (err) {
          console.error('Failed to parse score update:', err);
        }
      };

      eventSource.onerror = () => {
        console.log('⚠️ SSE failed, falling back to REST polling...');
        setIsLive(false);
        setError('SSE connection failed, using polling');
        eventSource.close();
        startPolling();
      };

      eventSourceRef.current = eventSource;
    } catch (err: any) {
      console.error('SSE connection error:', err.message);
      startPolling();
    }
  }, [fixtureId, enabled, onScoreUpdate]);

  // Start REST polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('🔄 Starting REST polling (every 10 seconds)...');
    
    pollingIntervalRef.current = setInterval(() => {
      fetchScores();
    }, 10000); // Poll every 10 seconds

    // Fetch immediately
    fetchScores();
  }, [fetchScores]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Connect on mount or fixture change
  useEffect(() => {
    if (!enabled) return;

    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Try SSE first
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fixtureId, enabled, connectSSE]);

  // Get score for specific fixture
  const getScore = useCallback((fixtureId: number): ScoreUpdate | undefined => {
    return scores.get(fixtureId);
  }, [scores]);

  return {
    scores: Object.fromEntries(scores),
    getScore,
    isLive,
    error,
    refresh: fetchScores,
  };
}

export default useLiveScores;
