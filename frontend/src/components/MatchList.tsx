'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import apiClient from '@/lib/api';
import { PredictionPool } from '@/types';
import MatchCard from './MatchCard';

export default function MatchList() {
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  const { data: pools, isLoading, error } = useQuery('pools', () => apiClient.getPools());

  const filteredPools = pools?.filter(pool => {
    if (filter === 'live') return !pool.isSettled;
    if (filter === 'upcoming') return true;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">World Cup Matches</h2>
        
        {/* Filters */}
        <div className="flex space-x-2">
          {(['all', 'live', 'upcoming'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-dark'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading matches...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
          <p className="text-red-400">Failed to load matches. Please try again.</p>
        </div>
      )}

      {/* Match Cards */}
      {!isLoading && !error && filteredPools && filteredPools.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredPools.map((pool) => (
            <MatchCard key={pool.fixtureId} pool={pool} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPools && filteredPools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No matches found</p>
        </div>
      )}
    </div>
  );
}
