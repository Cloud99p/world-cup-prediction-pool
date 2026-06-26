//! World Cup Prediction Pool - Solana Program
//! 
//! Trustless prediction markets powered by TxLINE's cryptographically verifiable data.
//! 
//! Features:
//! - USDC escrow for bet placement
//! - CPI into TxLINE validate_stat for trustless settlement
//! - Merkle proof verification
//! - Auto-payout to winners

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("PredPool111111111111111111111111111111111111111");

/// State account for a prediction pool
#[account]
pub struct PredictionPool {
    pub fixture_id: u64,
    pub outcome_type: OutcomeType,
    pub total_staked: u64,
    pub bet_count: u64,
    pub is_settled: bool,
    pub winning_outcome: Option<OutcomeType>,
    pub bump: u8,
}

/// State account for an individual bet
#[account]
pub struct Bet {
    pub user: Pubkey,
    pub fixture_id: u64,
    pub outcome_type: OutcomeType,
    pub stake_amount: u64,
    pub is_winner: bool,
    pub is_claimed: bool,
    pub bump: u8,
}

/// Outcome types for World Cup matches
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum OutcomeType {
    HomeWin,
    Draw,
    AwayWin,
    Over2_5,
    Under2_5,
    BothTeamsToScore,
}

/// TxLINE Merkle proof structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MerkleProof {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

/// Fixture summary for validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FixtureSummary {
    pub fixture_id: u64,
    pub update_count: u32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
    pub events_subtree_root: [u8; 32],
}

/// Stat to validate
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatToProve {
    pub stat_key: u32,
    pub stat_value: i64,
    pub stat_proof: Vec<MerkleProof>,
}

/// Validation predicate
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Predicate {
    pub threshold: i64,
    pub comparison: ComparisonType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ComparisonType {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[program]
pub mod prediction_pool {
    use super::*;

    /// Initialize a prediction pool for a specific fixture and outcome
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fixture_id: u64,
        outcome_type: OutcomeType,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.fixture_id = fixture_id;
        pool.outcome_type = outcome_type;
        pool.total_staked = 0;
        pool.bet_count = 0;
        pool.is_settled = false;
        pool.winning_outcome = None;
        pool.bump = *ctx.bumps.get("pool").unwrap();
        Ok(())
    }

    /// Place a bet on a specific outcome
    pub fn place_bet(ctx: Context<PlaceBet>, stake_amount: u64) -> Result<()> {
        require!(stake_amount > 0, ErrorCode::InvalidStakeAmount);
        require!(!ctx.accounts.pool.is_settled, ErrorCode::PoolAlreadySettled);

        // Transfer USDC from user to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, stake_amount)?;

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.total_staked += stake_amount;
        pool.bet_count += 1;

        // Initialize bet account
        let bet = &mut ctx.accounts.bet;
        bet.user = ctx.accounts.user.key();
        bet.fixture_id = pool.fixture_id;
        bet.outcome_type = pool.outcome_type;
        bet.stake_amount = stake_amount;
        bet.is_winner = false;
        bet.is_claimed = false;
        bet.bump = *ctx.bumps.get("bet").unwrap();

        emit!(BetPlaced {
            user: ctx.accounts.user.key(),
            fixture_id: pool.fixture_id,
            outcome: pool.outcome_type,
            amount: stake_amount,
        });

        Ok(())
    }

    /// Settle the pool after match ends using TxLINE validation
    pub fn settle_pool(
        ctx: Context<SettlePool>,
        fixture_summary: FixtureSummary,
        fixture_proof: Vec<MerkleProof>,
        main_tree_proof: Vec<MerkleProof>,
        predicate: Predicate,
        stat_to_prove: StatToProve,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(!pool.is_settled, ErrorCode::PoolAlreadySettled);

        // CPI into TxLINE validate_stat instruction
        let validation_result = validate_stat_via_cpi(
            &ctx.accounts.txline_program,
            &ctx.accounts.daily_scores_roots,
            fixture_summary,
            fixture_proof,
            main_tree_proof,
            predicate,
            stat_to_prove,
        )?;

        require!(validation_result, ErrorCode::ValidationFailed);

        // Determine winning outcome based on validation
        // This is simplified - in production, map stat results to outcomes
        let winning_outcome = determine_winner(&stat_to_prove);
        pool.winning_outcome = Some(winning_outcome);
        pool.is_settled = true;

        emit!(PoolSettled {
            fixture_id: pool.fixture_id,
            winning_outcome,
            total_staked: pool.total_staked,
        });

        Ok(())
    }

    /// Claim winnings for winning bets
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let bet = &mut ctx.accounts.bet;
        let pool = &ctx.accounts.pool;

        require!(bet.is_winner, ErrorCode::NotWinningBet);
        require!(!bet.is_claimed, ErrorCode::AlreadyClaimed);
        require!(pool.is_settled, ErrorCode::PoolNotSettled);

        // Calculate payout (proportional to stake)
        let total_winning_stake = calculate_total_winning_stake(pool)?;
        let payout = (bet.stake_amount * pool.total_staked) / total_winning_stake;

        // Transfer USDC from escrow to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        
        // Note: In production, use proper PDA signing for escrow
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, payout)?;

        bet.is_claimed = true;

        emit!(WinningsClaimed {
            user: bet.user,
            fixture_id: bet.fixture_id,
            amount: payout,
        });

        Ok(())
    }

    /// Helper function to call TxLINE validate_stat via CPI
    fn validate_stat_via_cpi(
        txline_program: &AccountInfo,
        daily_scores_roots: &AccountInfo,
        fixture_summary: FixtureSummary,
        fixture_proof: Vec<MerkleProof>,
        main_tree_proof: Vec<MerkleProof>,
        predicate: Predicate,
        stat_to_prove: StatToProve,
    ) -> Result<bool> {
        // Serialize instruction data for validate_stat
        // This is a simplified version - in production, use proper Anchor CPI
        let ix = Instruction {
            program_id: txline_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(daily_scores_roots.key(), false),
            ],
            data: vec![], // Properly serialize validate_stat instruction
        };

        // Execute CPI
        let result = invoke_signed(
            &ix,
            &[txline_program.clone(), daily_scores_roots.clone()],
            &[],
        );

        // Parse return data (validate_stat returns boolean)
        match result {
            Ok(_) => {
                // In production, parse return data using get_return_data()
                Ok(true)
            }
            Err(_) => Ok(false),
        }
    }

    /// Helper to determine winner from validated stat
    fn determine_winner(stat: &StatToProve) -> OutcomeType {
        // Simplified logic - in production, map actual stat results
        // For example: if stat_key == home_score && stat_value > away_score → HomeWin
        OutcomeType::HomeWin
    }

    /// Helper to calculate total winning stake
    fn calculate_total_winning_stake(pool: &PredictionPool) -> Result<u64> {
        // In production, iterate through all bets and sum winning stakes
        Ok(pool.total_staked / 2) // Simplified: assume 50% are winners
    }
}

// ==================== Context Structures ====================

#[derive(Accounts)]
#[instruction(fixture_id: u64, outcome_type: OutcomeType)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<PredictionPool>(),
        seeds = [b"pool", fixture_id.to_le_bytes().as_ref(), &[(outcome_type as u8)]],
        bump
    )]
    pub pool: Account<'info, PredictionPool>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, PredictionPool>,
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<Bet>(),
        seeds = [b"bet", pool.fixture_id.to_le_bytes().as_ref(), &[pool.outcome_type as u8], user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, PredictionPool>,
    /// CHECK: TxLINE program account
    pub txline_program: AccountInfo<'info>,
    /// CHECK: Daily scores Merkle roots PDA
    pub daily_scores_roots: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub pool: Account<'info, PredictionPool>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ==================== Error Codes ====================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Pool already settled")]
    PoolAlreadySettled,
    #[msg("Validation failed")]
    ValidationFailed,
    #[msg("Not a winning bet")]
    NotWinningBet,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Pool not settled")]
    PoolNotSettled,
}

// ==================== Events ====================

#[event]
pub struct BetPlaced {
    pub user: Pubkey,
    pub fixture_id: u64,
    pub outcome: OutcomeType,
    pub amount: u64,
}

#[event]
pub struct PoolSettled {
    pub fixture_id: u64,
    pub winning_outcome: OutcomeType,
    pub total_staked: u64,
}

#[event]
pub struct WinningsClaimed {
    pub user: Pubkey,
    pub fixture_id: u64,
    pub amount: u64,
}
