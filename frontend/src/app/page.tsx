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
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'previous'>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    fetchLeagues();
    fetchDates();
    fetchMatches();
  }, [activeTab, selectedLeague, selectedDate]);

  const fetchLeagues = async () => {
    try {
      const response = await fetch('/api/leagues');
      const data = await response.json();
      setLeagues(data.leagues || []);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  const fetchDates = async () => {
    try {
      const response = await fetch('/api/matches/dates');
      const data = await response.json();
      const dateArray = data.dates.map((d: any) => d.date);
      setDates(dateArray);
    } catch (error) {
      console.error('Error fetching dates:', error);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // Fetch live count separately (always)
      if (activeTab !== 'live') {
        const liveRes = await fetch('/api/matches/live');
        const liveData = await liveRes.json();
        setLiveCount(liveData.count || 0);
      }
      
      let url = '';
      const params = new URLSearchParams();
      
      if (activeTab === 'live') {
        url = '/api/matches/live';
      } else if (activeTab === 'previous') {
        url = '/api/matches/previous';
        if (selectedDate) params.append('date', selectedDate);
      } else if (selectedLeague !== 'all') {
        url = `/api/matches/league/${selectedLeague}`;
      } else {
        url = '/api/matches/upcoming';
        if (selectedDate) params.append('date', selectedDate);
      }
      
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(fullUrl);
      const data = await response.json();
      setMatches(data.matches || []);
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
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-2 mb-6 border border-gray-700 overflow-hidden">
          <div className="flex items-center space-x-2 overflow-x-auto">
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

            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg border border-gray-600 focus:outline-none focus:border-primary hover:border-gray-500 transition-colors"
              >
                <option value="">📅 All Dates</option>
                {dates.map((date) => (
                  <option key={date} value={date}>
                    📅 {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                  title="Clear date filter"
                >
                  ✕
                </button>
              )}
            </div>
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
