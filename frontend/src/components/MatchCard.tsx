'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBetStore } from '@/store/betStore';
import { PredictionPool } from '@/types';

interface MatchCardProps {
  pool: PredictionPool;
}

export default function MatchCard({ pool }: MatchCardProps) {
  const { connected } = useWallet();
  const { setSelectedOutcome, hasSelection, clearBetSlip } = useBetStore();
  const [selectedOutcome, setSelectedOutcomeState] = useState<string | null>(null);

  const handleOutcomeClick = (outcomeType: string, odds: number) => {
    if (hasSelection) {
      clearBetSlip();
    }
    setSelectedOutcome(pool.fixtureId, outcomeType as any, odds);
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
            World Cup
          </span>
          <span className="text-gray-400 text-sm">
            {formatDate(pool.startTime)}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h3 className="text-xl font-bold text-white">{pool.homeTeam}</h3>
          <span className="text-gray-400 text-sm">Home</span>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">VS</div>
        </div>
        
        <div className="text-center flex-1">
          <h3 className="text-xl font-bold text-white">{pool.awayTeam}</h3>
          <span className="text-gray-400 text-sm">Away</span>
        </div>
      </div>

      {/* Outcomes */}
      <div className="grid grid-cols-3 gap-3">
        {pool.outcomes.map((outcome) => (
          <button
            key={outcome.type}
            onClick={() => handleOutcomeClick(outcome.type, outcome.odds)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedOutcome === outcome.type
                ? 'border-primary bg-primary/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">{outcome.type.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div className="text-xl font-bold text-white">{outcome.odds.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatStaked(outcome.totalStaked)} staked
            </div>
          </button>
        ))}
      </div>

      {/* Total Pool Info */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Pool</span>
          <span className="text-white font-medium">
            {formatStaked(pool.totalStaked)} ({pool.betCount} bets)
          </span>
        </div>
      </div>
    </div>
  );
}
