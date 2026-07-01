'use client';

import { useState, useEffect } from 'react';
import { useBetStore } from '@/store/betStore';
import { MatchFixture, ScoreUpdate } from '@/types';
import { useLiveScores } from '@/hooks/useLiveScores';

interface MatchCardProps {
  match: MatchFixture;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { setSelectedOutcome, hasSelection, clearBetSlip } = useBetStore();
  const [selectedOutcome, setSelectedOutcomeState] = useState<string | null>(null);
  
  // Live score updates
  const { getScore, isLive } = useLiveScores({ 
    fixtureId: match.fixtureId,
    enabled: match.status === 'live',
  });
  
  const liveScore = getScore(match.fixtureId);

  const handleOutcomeClick = (outcomeType: string, odds: number) => {
    if (hasSelection) {
      clearBetSlip();
    }
    setSelectedOutcome(match.fixtureId, outcomeType as any, odds);
    setSelectedOutcomeState(outcomeType);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStaked = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USDC',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-primary/50 transition-all">
      {/* Match Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
            Football
          </span>
          {match.status === 'live' ? (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="text-gray-400 text-sm">
              {new Date(match.startTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Teams & Live Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h3 className="text-xl font-bold text-white">{match.homeTeam}</h3>
          <span className="text-gray-400 text-sm">Home</span>
        </div>
        
        <div className="text-center px-4">
          {match.status === 'live' || liveScore ? (
            <div className="text-4xl font-bold text-primary">
              {liveScore?.homeScore ?? 0} - {liveScore?.awayScore ?? 0}
            </div>
          ) : (
            <div className="text-3xl font-bold text-primary">VS</div>
          )}
          {isLive && (
            <div className="text-xs text-green-400 mt-1 animate-pulse">● LIVE</div>
          )}
        </div>
        
        <div className="text-center flex-1">
          <h3 className="text-xl font-bold text-white">{match.awayTeam}</h3>
          <span className="text-gray-400 text-sm">Away</span>
        </div>
      </div>

      {/* Outcomes with Live Odds */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: 'Home Win', odds: match.odds?.HomeWin || 0 },
          { type: 'Draw', odds: match.odds?.Draw || 0 },
          { type: 'Away Win', odds: match.odds?.AwayWin || 0 },
        ].map((outcome) => {
          const hasOdds = outcome.odds > 0;
          return (
            <button
              key={outcome.type}
              onClick={() => hasOdds && handleOutcomeClick(outcome.type, outcome.odds)}
              disabled={!hasOdds}
              className={`p-4 rounded-lg border-2 transition-all ${
                !hasOdds
                  ? 'border-gray-700 opacity-50 cursor-not-allowed'
                  : selectedOutcome === outcome.type
                  ? 'border-primary bg-primary/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="text-sm text-gray-400 mb-1">{outcome.type}</div>
              <div className="text-xl font-bold text-white">
                {hasOdds ? outcome.odds.toFixed(2) : '--'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {hasOdds ? 'Live odds' : 'No odds'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
