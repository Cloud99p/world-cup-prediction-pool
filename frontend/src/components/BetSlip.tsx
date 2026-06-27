'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBetStore } from '@/store/betStore';
import { placeBet } from '@/lib/transactions';
import { toast } from 'react-hot-toast';

export default function BetSlip() {
  const { connected, publicKey } = useWallet();
  const { betSlip, setStakeAmount, clearBetSlip, hasSelection } = useBetStore();
  const [loading, setLoading] = useState(false);

  const calculatePayout = () => {
    if (!betSlip.odds || !betSlip.stakeAmount) return 0;
    return betSlip.stakeAmount * betSlip.odds;
  };

  const handlePlaceBet = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!betSlip.fixtureId || !betSlip.outcomeType || !betSlip.stakeAmount) {
      toast.error('Please select an outcome and enter stake');
      return;
    }

    setLoading(true);
    try {
      const result = await placeBet({
        fixtureId: betSlip.fixtureId,
        outcomeType: betSlip.outcomeType,
        stakeAmount: betSlip.stakeAmount,
      });

      if (result.success) {
        toast.success('Bet placed successfully!');
        clearBetSlip();
      } else {
        toast.error(result.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Bet error:', error);
      toast.error('Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const formatStaked = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USDC',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!hasSelection) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Bet Slip</h3>
        <p className="text-gray-400 text-sm">
          Select an outcome from a match to place your bet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Bet Slip</h3>

      {/* Match Info */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Match</div>
        <div className="text-white font-medium">
          {betSlip.fixtureId} (Football)
        </div>
      </div>

      {/* Outcome */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Selection</div>
        <div className="text-white font-medium">
          {betSlip.outcomeType?.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <div className="text-primary font-bold">
          Odds: {betSlip.odds?.toFixed(2)}
        </div>
      </div>

      {/* Stake Input */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">Stake (USDC)</div>
        <div className="relative">
          <input
            type="number"
            value={betSlip.stakeAmount || ''}
            onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            min="1"
            step="1"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            USDC
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex space-x-2 mt-2">
          {[10, 50, 100, 500].map((amount) => (
            <button
              key={amount}
              onClick={() => setStakeAmount(amount)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Potential Payout */}
      <div className="mb-6 p-4 bg-primary/10 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Potential Payout</span>
          <span className="text-primary font-bold text-lg">
            {formatStaked(calculatePayout())}
          </span>
        </div>
      </div>

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={loading || betSlip.stakeAmount <= 0}
        className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-dark font-bold rounded-lg px-6 py-3 transition-all"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark"></div>
            <span>Processing...</span>
          </div>
        ) : (
          'Place Bet'
        )}
      </button>

      {/* Clear Button */}
      <button
        onClick={clearBetSlip}
        className="w-full mt-3 text-gray-400 hover:text-white text-sm transition-colors"
      >
        Clear Selection
      </button>
    </div>
  );
}
