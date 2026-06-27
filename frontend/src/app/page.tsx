'use client';

import { useWallet } from '@/contexts/WalletContext';
import Header from '@/components/Header';
import MatchList from '@/components/MatchList';

export default function Home() {
  const { connected, publicKey, balance } = useWallet();

  return (
    <div className="min-h-screen bg-dark">
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

        {/* Wallet Status */}
        {!connected ? (
          <div className="p-8 bg-secondary/20 rounded-lg text-center">
            <p className="text-white text-lg mb-4">Connect your wallet to start betting</p>
            <p className="text-gray-400 text-sm">
              Supports Phantom, Solflare, and other Solana wallets
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="p-6 bg-secondary/20 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Your Balance</div>
              <div className="text-2xl font-bold text-white">{balance.toFixed(3)} SOL</div>
            </div>
            
            <div className="p-6 bg-secondary/20 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Wallet Address</div>
              <div className="text-sm text-white font-mono">
                {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
              </div>
            </div>
            
            <div className="p-6 bg-secondary/20 rounded-lg">
              <div className="text-gray-400 text-sm mb-1">Network</div>
              <div className="text-xl font-bold text-green-400">Devnet</div>
            </div>
          </div>
        )}

        {/* Match List */}
        <MatchList />
      </main>
    </div>
  );
}
