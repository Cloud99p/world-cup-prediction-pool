import React, { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

interface ScoreUpdate {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameState: string;
  minute?: number;
  timestamp: number;
}

interface LiveScoresProps {
  fixtureIds?: number[];
}

export const LiveScores: React.FC<LiveScoresProps> = ({ fixtureIds }) => {
  const { connection } = useConnection();
  const [scores, setScores] = useState<ScoreUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In production: connect to SSE stream from backend
    // For now, mock data
    const mockScores: ScoreUpdate[] = [
      {
        fixtureId: 17952170,
        homeTeam: 'Brazil',
        awayTeam: 'Germany',
        homeScore: 2,
        awayScore: 1,
        gameState: '2H',
        minute: 67,
        timestamp: Date.now(),
      },
    ];

    setScores(mockScores);
    setLoading(false);

    // TODO: Connect to SSE stream
    // const eventSource = new EventSource(`${BACKEND_URL}/stream/scores`);
    // eventSource.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   setScores(prev => prev.map(s => s.fixtureId === update.fixtureId ? update : s));
    // };

    return () => {
      // eventSource.close();
    };
  }, [connection]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-400">Loading scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 rounded-lg text-red-400">
        Error loading scores: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Live Scores</h2>
      
      {scores.length === 0 ? (
        <div className="text-gray-400">No live matches</div>
      ) : (
        <div className="space-y-3">
          {scores.map((score) => (
            <div key={score.fixtureId} className="p-4 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-white font-semibold">{score.homeTeam}</div>
                  <div className="text-white font-semibold">{score.awayTeam}</div>
                </div>
                
                <div className="text-center px-8">
                  <div className="text-3xl font-bold text-white">
                    {score.homeScore} - {score.awayScore}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {score.gameState}
                    {score.minute && ` ${score.minute}'`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
