'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import MatchList from '@/components/MatchList';
import BetSlip from '@/components/BetSlip';
import Header from '@/components/Header';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-dark">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Match List - Main Content */}
          <div className="lg:col-span-2">
            <MatchList />
          </div>

          {/* Bet Slip - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <BetSlip />
              
              {!connected && (
                <div className="mt-4 p-4 bg-secondary/20 rounded-lg text-center">
                  <p className="text-white mb-2">Connect wallet to place bets</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
