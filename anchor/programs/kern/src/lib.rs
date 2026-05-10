use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod kern {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        creator: Pubkey,
        seed: u64,
        budget_lamports: u64,
        rate_per_1k_lamports: u64,
        expiry_ts: i64,
    ) -> Result<()> {
        require!(budget_lamports > 0, ErrorCode::InvalidAmount);
        require!(rate_per_1k_lamports > 0, ErrorCode::InvalidAmount);

        let campaign = &mut ctx.accounts.campaign;
        let now = Clock::get()?.unix_timestamp;

        campaign.creator = creator;
        campaign.oracle_authority = ctx.accounts.oracle_authority.key();
        campaign.budget_lamports = budget_lamports;
        campaign.remaining_lamports = budget_lamports;
        campaign.rate_per_1k_lamports = rate_per_1k_lamports;
        campaign.expiry_ts = expiry_ts;
        campaign.seed = seed;
        campaign.bump = ctx.bumps.campaign;
        campaign.status = CampaignStatus::Active;
        campaign.created_at = now;

        let transfer_accounts = Transfer {
            from: ctx.accounts.oracle_authority.to_account_info(),
            to: campaign.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts),
            budget_lamports,
        )?;

        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator,
            oracle_authority: campaign.oracle_authority,
            budget_lamports,
            rate_per_1k_lamports,
            expiry_ts,
            seed,
        });

        Ok(())
    }

    pub fn fund_campaign(ctx: Context<FundCampaign>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, ErrorCode::InvalidAmount);

        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Active, ErrorCode::CampaignNotActive);

        let transfer_accounts = Transfer {
            from: ctx.accounts.oracle_authority.to_account_info(),
            to: campaign.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts),
            amount_lamports,
        )?;

        campaign.budget_lamports = campaign
            .budget_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::MathOverflow)?;
        campaign.remaining_lamports = campaign
            .remaining_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(CampaignFunded {
            campaign: campaign.key(),
            authority: ctx.accounts.oracle_authority.key(),
            amount_lamports,
            budget_lamports: campaign.budget_lamports,
            remaining_lamports: campaign.remaining_lamports,
        });

        Ok(())
    }

    pub fn execute_payout(ctx: Context<ExecutePayout>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, ErrorCode::InvalidAmount);

        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Active, ErrorCode::CampaignNotActive);

        let now = Clock::get()?.unix_timestamp;
        require!(now <= campaign.expiry_ts, ErrorCode::CampaignExpired);
        require!(campaign.remaining_lamports >= amount_lamports, ErrorCode::InsufficientEscrowBalance);

        let seed_bytes = campaign.seed.to_le_bytes();
        let signer_seeds: &[&[u8]] = &[
            b"campaign",
            campaign.creator.as_ref(),
            seed_bytes.as_ref(),
            &[campaign.bump],
        ];

        let payout_accounts = Transfer {
            from: campaign.to_account_info(),
            to: ctx.accounts.clipper.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                payout_accounts,
                &[signer_seeds],
            ),
            amount_lamports,
        )?;

        campaign.remaining_lamports = campaign
            .remaining_lamports
            .checked_sub(amount_lamports)
            .ok_or(ErrorCode::MathOverflow)?;

        if campaign.remaining_lamports == 0 {
            campaign.status = CampaignStatus::Completed;
        }

        emit!(PayoutExecuted {
            campaign: campaign.key(),
            clipper: ctx.accounts.clipper.key(),
            authority: ctx.accounts.oracle_authority.key(),
            amount_lamports,
            remaining_lamports: campaign.remaining_lamports,
        });

        Ok(())
    }

    pub fn pause_campaign(ctx: Context<PauseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Active, ErrorCode::CampaignNotActive);

        campaign.status = CampaignStatus::Paused;

        emit!(CampaignPaused {
            campaign: campaign.key(),
            authority: ctx.accounts.oracle_authority.key(),
        });

        Ok(())
    }

    pub fn resume_campaign(ctx: Context<ResumeCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(campaign.status == CampaignStatus::Paused, ErrorCode::CampaignNotPaused);

        let now = Clock::get()?.unix_timestamp;
        require!(now <= campaign.expiry_ts, ErrorCode::CampaignExpired);

        campaign.status = CampaignStatus::Active;

        emit!(CampaignResumed {
            campaign: campaign.key(),
            authority: ctx.accounts.oracle_authority.key(),
        });

        Ok(())
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require_keys_eq!(ctx.accounts.creator_receiving.key(), campaign.creator, ErrorCode::InvalidRecipient);

        let now = Clock::get()?.unix_timestamp;
        require!(
            campaign.remaining_lamports == 0 || now >= campaign.expiry_ts,
            ErrorCode::CampaignNotReadyToClose
        );

        campaign.remaining_lamports = 0;
        campaign.status = CampaignStatus::Closed;

        emit!(CampaignClosed {
            campaign: campaign.key(),
            creator: campaign.creator,
            authority: ctx.accounts.oracle_authority.key(),
            remaining_lamports: campaign.remaining_lamports,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(creator: Pubkey, seed: u64)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = oracle_authority,
        space = CampaignEscrow::SPACE,
        seeds = [b"campaign", creator.as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    #[account(mut)]
    pub oracle_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), &campaign.seed.to_le_bytes()],
        bump = campaign.bump,
        has_one = oracle_authority
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    #[account(mut)]
    pub oracle_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecutePayout<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), &campaign.seed.to_le_bytes()],
        bump = campaign.bump,
        has_one = oracle_authority
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    #[account(mut)]
    pub oracle_authority: Signer<'info>,
    /// CHECK: Lamports are transferred to this wallet address.
    #[account(mut)]
    pub clipper: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PauseCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), &campaign.seed.to_le_bytes()],
        bump = campaign.bump,
        has_one = oracle_authority
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResumeCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), &campaign.seed.to_le_bytes()],
        bump = campaign.bump,
        has_one = oracle_authority
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), &campaign.seed.to_le_bytes()],
        bump = campaign.bump,
        has_one = oracle_authority,
        close = creator_receiving
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    pub oracle_authority: Signer<'info>,
    /// CHECK: Receives the remaining lamports when the campaign closes.
    #[account(mut)]
    pub creator_receiving: UncheckedAccount<'info>,
}

#[account]
pub struct CampaignEscrow {
    pub creator: Pubkey,
    pub oracle_authority: Pubkey,
    pub budget_lamports: u64,
    pub remaining_lamports: u64,
    pub rate_per_1k_lamports: u64,
    pub expiry_ts: i64,
    pub seed: u64,
    pub bump: u8,
    pub status: CampaignStatus,
    pub created_at: i64,
}

impl CampaignEscrow {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Active,
    Paused,
    Completed,
    Closed,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub oracle_authority: Pubkey,
    pub budget_lamports: u64,
    pub rate_per_1k_lamports: u64,
    pub expiry_ts: i64,
    pub seed: u64,
}

#[event]
pub struct CampaignFunded {
    pub campaign: Pubkey,
    pub authority: Pubkey,
    pub amount_lamports: u64,
    pub budget_lamports: u64,
    pub remaining_lamports: u64,
}

#[event]
pub struct PayoutExecuted {
    pub campaign: Pubkey,
    pub clipper: Pubkey,
    pub authority: Pubkey,
    pub amount_lamports: u64,
    pub remaining_lamports: u64,
}

#[event]
pub struct CampaignPaused {
    pub campaign: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct CampaignResumed {
    pub campaign: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct CampaignClosed {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub authority: Pubkey,
    pub remaining_lamports: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Math overflow or underflow occurred.")]
    MathOverflow,
    #[msg("Campaign is not active.")]
    CampaignNotActive,
    #[msg("Campaign is not paused.")]
    CampaignNotPaused,
    #[msg("Campaign has expired.")]
    CampaignExpired,
    #[msg("Escrow does not have enough lamports.")]
    InsufficientEscrowBalance,
    #[msg("Creator recipient does not match the campaign creator.")]
    InvalidRecipient,
    #[msg("Campaign cannot be closed yet.")]
    CampaignNotReadyToClose,
}
