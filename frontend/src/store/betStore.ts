import { create } from 'zustand';
import { OutcomeType } from '@/types';

interface BetSlip {
  fixtureId: number | null;
  outcomeType: OutcomeType | null;
  odds: number | null;
  stakeAmount: number;
}

interface BetStore {
  betSlip: BetSlip;
  setSelectedOutcome: (fixtureId: number, outcomeType: OutcomeType, odds: number) => void;
  setStakeAmount: (amount: number) => void;
  clearBetSlip: () => void;
  hasSelection: boolean;
}

export const useBetStore = create<BetStore>((set) => ({
  betSlip: {
    fixtureId: null,
    outcomeType: null,
    odds: null,
    stakeAmount: 0,
  },
  setSelectedOutcome: (fixtureId, outcomeType, odds) => 
    set((state) => ({
      betSlip: {
        ...state.betSlip,
        fixtureId,
        outcomeType,
        odds,
      },
    })),
  setStakeAmount: (amount) =>
    set((state) => ({
      betSlip: {
        ...state.betSlip,
        stakeAmount: amount,
      },
    })),
  clearBetSlip: () =>
    set({
      betSlip: {
        fixtureId: null,
        outcomeType: null,
        odds: null,
        stakeAmount: 0,
      },
    }),
  hasSelection: (state) => state.betSlip.fixtureId !== null && state.betSlip.outcomeType !== null,
}));
