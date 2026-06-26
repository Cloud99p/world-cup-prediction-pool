// ==================== Pool Types ====================

export interface PredictionPool {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  totalStaked: number;
  betCount: number;
  isSettled: boolean;
  outcomes: Outcome[];
}

export interface Outcome {
  type: OutcomeType;
  odds: number;
  totalStaked: number;
}

export type OutcomeType = 
  | 'HomeWin'
  | 'Draw'
  | 'AwayWin'
  | 'Over2_5'
  | 'Under2_5'
  | 'BothTeamsToScore';

// ==================== Bet Types ====================

export interface Bet {
  publicKey: string;
  user: string;
  fixtureId: number;
  outcomeType: OutcomeType;
  stakeAmount: number;
  isWinner: boolean;
  isClaimed: boolean;
  potentialPayout?: number;
}

// ==================== Match Types ====================

export interface Match {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameState: MatchState;
  startTime: string;
  league: string;
}

export type MatchState = 
  | 'NS'  // Not Started
  | '1H'  // First Half
  | 'HT'  // Half Time
  | '2H'  // Second Half
  | 'FT'  // Full Time
  | 'ENDED';

// ==================== Odds Types ====================

export interface OddsUpdate {
  fixtureId: number;
  marketType: string;
  odds: number[];
  timestamp: number;
  seq: number;
}

// ==================== Score Types ====================

export interface ScoreUpdate {
  fixtureId: number;
  homeScore: number;
  awayScore: number;
  gameState: MatchState;
  timestamp: number;
  seq: number;
  events?: MatchEvent[];
}

export interface MatchEvent {
  type: 'goal' | 'card' | 'substitution';
  team: 'home' | 'away';
  player: string;
  minute: number;
  details?: string;
}

// ==================== Transaction Types ====================

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export interface PlaceBetParams {
  fixtureId: number;
  outcomeType: OutcomeType;
  stakeAmount: number; // in USDC (6 decimals)
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PoolsResponse {
  pools: PredictionPool[];
  total: number;
}

export interface PoolDetailsResponse {
  pool: PredictionPool;
  userBets?: Bet[];
}

// ==================== UI State Types ====================

export interface BetSlip {
  fixtureId: number;
  outcomeType: OutcomeType;
  odds: number;
  stakeAmount: number;
}

export interface FilterState {
  league?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: 'upcoming' | 'live' | 'ended';
}
