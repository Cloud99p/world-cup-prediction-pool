import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Bet {
  betId: string;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  outcomeType: 'HomeWin' | 'Draw' | 'AwayWin';
  stake: number;
  odds: number;
  potentialPayout: number;
  status: 'pending' | 'won' | 'lost' | 'claimed';
  timestamp: number;
}

interface MyBetsProps {
  onClaim?: (betId: string) => void;
}

export const MyBets: React.FC<MyBetsProps> = ({ onClaim }) => {
  const { publicKey, connected } = useWallet();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setBets([]);
      setLoading(false);
      return;
    }

    // In production: fetch from backend API
    // fetch(`${BACKEND_URL}/api/bets/${publicKey.toBase58()}`)
    const mockBets: Bet[] = [
      {
        betId: 'bet_1',
        fixtureId: 17952170,
        homeTeam: 'Brazil',
        awayTeam: 'Germany',
        outcomeType: 'HomeWin',
        stake: 100,
        odds: 2.1,
        potentialPayout: 210,
        status: 'pending',
        timestamp: Date.now() - 3600000,
      },
    ];

    setBets(mockBets);
    setLoading(false);
  }, [publicKey, connected]);

  const getStatusColor = (status: Bet['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'won':
        return 'bg-green-500/20 text-green-400';
      case 'lost':
        return 'bg-red-500/20 text-red-400';
      case 'claimed':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (!connected) {
    return (
      <div className="p-8 text-center text-gray-400">
        Connect wallet to view your bets
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-gray-400">Loading your bets...</div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">My Bets</h2>
      
      {bets.length === 0 ? (
        <div className="text-gray-400">No bets yet</div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div key={bet.betId} className="p-4 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-white font-semibold mb-2">
                    {bet.homeTeam} vs {bet.awayTeam}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-300">
                      Pick: <span className="text-white font-medium">{bet.outcomeType}</span>
                    </div>
                    <div className="text-gray-300">
                      Stake: <span className="text-white font-medium">{bet.stake} USDC</span>
                    </div>
                    <div className="text-gray-300">
                      Odds: <span className="text-white font-medium">{bet.odds}</span>
                    </div>
                    <div className="text-gray-300">
                      Potential: <span className="text-green-400 font-medium">{bet.potentialPayout} USDC</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bet.status)}`}>
                    {bet.status.toUpperCase()}
                  </span>
                  
                  {bet.status === 'won' && onClaim && (
                    <button
                      onClick={() => onClaim(bet.betId)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                {new Date(bet.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
