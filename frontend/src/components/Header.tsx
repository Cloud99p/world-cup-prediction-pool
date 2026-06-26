'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Header() {
  return (
    <header className="bg-dark/80 backdrop-blur-md border-b border-primary/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚽</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">World Cup Pool</h1>
              <p className="text-gray-400 text-sm">Trustless Prediction Markets</p>
            </div>
          </div>

          {/* Wallet Button */}
          <div>
            <WalletMultiButton className="bg-primary hover:bg-primary/90 text-dark font-bold rounded-lg px-6 py-2 transition-all" />
          </div>
        </div>
      </div>
    </header>
  );
}
