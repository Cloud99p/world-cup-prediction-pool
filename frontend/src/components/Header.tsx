'use client';

import { useWallet } from '@/contexts/WalletContext';

export default function Header() {
  const { connected, publicKey, connecting, balance, connect, disconnect } = useWallet();

  return (
    <header className="bg-secondary border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚽</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">World Cup Pool</h1>
              <p className="text-gray-400 text-xs">Prediction Markets</p>
            </div>
          </div>

          {/* Wallet Button */}
          {!connected ? (
            <button
              onClick={connect}
              disabled={connecting}
              className="px-6 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              {/* Balance */}
              <div className="text-right">
                <div className="text-white font-semibold">{balance.toFixed(3)} SOL</div>
                <div className="text-gray-400 text-xs">
                  {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </div>
              </div>
              
              {/* Disconnect */}
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
