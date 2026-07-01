'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MatchList from '@/components/MatchList';
import { useWallet } from '@/contexts/WalletContext';
import { MatchFixture } from '@/types';

export default function Home() {
  const { connected, publicKey, balance } = useWallet();
  const [matches, setMatches] = useState<MatchFixture[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'previous'>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    fetchLeagues();
    fetchMatches();
  }, [activeTab, selectedLeague]);

  const fetchLeagues = async () => {
    try {
      const response = await fetch('/api/leagues');
      const data = await response.json();
      setLeagues(data.leagues || []);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      let url = '';
      
      if (activeTab === 'live') {
        url = '/api/matches/live';
      } else if (activeTab === 'previous') {
        url = '/api/matches/previous';
      } else if (selectedLeague !== 'all') {
        url = `/api/matches/league/${selectedLeague}`;
      } else {
        url = '/api/matches/upcoming';
      }

      const response = await fetch(url);
      const data = await response.json();
      setMatches(data.matches || []);
      setLiveCount(data.count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const getTabLabel = () => {
    if (activeTab === 'live') {
      return `🔴 Live Matches (${liveCount})`;
    } else if (activeTab === 'previous') {
      return `📋 Previous Matches`;
    }
    return '📅 Upcoming Matches';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome to Prediction Pool
          </h2>
          <p className="text-gray-400">
            Place predictions on football matches and win big!
          </p>
        </div>

        {/* Navigation Tabs - Bet9ja Style */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex items-center space-x-3 overflow-x-auto">
            {/* Live Tab */}
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'live'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🔴 Live ({liveCount})
            </button>

            {/* League Filter */}
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg border border-gray-600 focus:outline-none focus:border-primary hover:border-gray-500 transition-colors"
            >
              <option value="all">📋 All Leagues</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  🏆 {league.name} ({league.count})
                </option>
              ))}
            </select>

            {/* All Matches Tab */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'all' && selectedLeague === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📅 Upcoming
            </button>

            {/* Previous Matches Tab */}
            <button
              onClick={() => setActiveTab('previous')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'previous'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📋 Previous
            </button>
          </div>
        </div>

        {/* Wallet Status */}
        {!connected ? (
          <div className="p-8 bg-secondary/20 rounded-lg text-center mb-6">
            <p className="text-white text-lg mb-4">Connect your wallet to start betting</p>
            <p className="text-gray-400 text-sm">
              Supports Phantom, Solflare, and other Solana wallets
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Stats Cards */}
            <div className="p-4 bg-secondary/20 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Your Balance</div>
              <div className="text-2xl font-bold text-white">{balance.toFixed(3)} SOL</div>
            </div>
            
            <div className="p-4 bg-secondary/20 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Wallet Address</div>
              <div className="text-sm text-white font-mono">
                {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
              </div>
            </div>
            
            <div className="p-4 bg-secondary/20 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Network</div>
              <div className="text-xl font-bold text-green-400">Devnet</div>
            </div>
          </div>
        )}

        {/* Match List */}
        <MatchList matches={matches} loading={loading} onRefresh={fetchMatches} />
      </main>
    </div>
  );
}
