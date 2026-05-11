use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("2onzhLcvsyuSp5jdTpP13DLUxTRpx3LNyCmcwhrQPnrU");

#[program]
pub mod kern {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        seed: u64,
        budget_lamports: u64,
        rate_per_1k_lamports: u64,
    ) -> Result<()> {
        require!(budget_lamports > 0, ErrorCode::InvalidAmount);
        require!(rate_per_1k_lamports > 0, ErrorCode::InvalidAmount);

        let campaign = &mut ctx.accounts.campaign;
        let creator = ctx.accounts.creator.key();
        let now = Clock::get()?.unix_timestamp;

        let setup_fee = budget_lamports.checked_mul(2).unwrap() / 100;
        let vault_deposit = budget_lamports.checked_sub(setup_fee).unwrap();

        campaign.creator = creator;
        campaign.oracle_authority = ctx.accounts.oracle_authority.key();
        campaign.budget_lamports = vault_deposit;
        campaign.remaining_lamports = vault_deposit;
        campaign.rate_per_1k_lamports = rate_per_1k_lamports;
        campaign.seed = seed;
        campaign.bump = ctx.bumps.campaign;
        campaign.status = CampaignStatus::Active;
        campaign.created_at = now;

        // Transfer vault deposit to PDA from Creator
        let transfer_accounts = Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: campaign.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts),
            vault_deposit,
        )?;

        // Transfer 2% setup fee to treasury from Creator
        if setup_fee > 0 {
            let fee_accounts = Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.platform_treasury.to_account_info(),
            };
            system_program::transfer(
                CpiContext::new(ctx.accounts.system_program.to_account_info(), fee_accounts),
                setup_fee,
            )?;
        }

        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator,
            oracle_authority: campaign.oracle_authority,
            budget_lamports: vault_deposit,
            rate_per_1k_lamports,
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
        require!(campaign.remaining_lamports >= amount_lamports, ErrorCode::InsufficientEscrowBalance);

        // 3% success fee
        let performance_fee = amount_lamports.checked_mul(3).unwrap() / 100;
        let gas_fee = 5000; // 5000 lamports standard tx fee
        let total_deduction = performance_fee.checked_add(gas_fee).unwrap();
        
        // Ensure payout is large enough to cover fees
        require!(amount_lamports > total_deduction, ErrorCode::InvalidAmount);
        let clipper_payout = amount_lamports.checked_sub(total_deduction).unwrap();

        let seed_bytes = campaign.seed.to_le_bytes();
        let signer_seeds: &[&[u8]] = &[
            b"campaign",
            campaign.creator.as_ref(),
            seed_bytes.as_ref(),
            &[campaign.bump],
        ];

        // 1. Pay clipper
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: campaign.to_account_info(),
                    to: ctx.accounts.clipper.to_account_info(),
                },
                &[signer_seeds],
            ),
            clipper_payout,
        )?;

        // 2. Pay treasury (3% performance fee)
        if performance_fee > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: campaign.to_account_info(),
                        to: ctx.accounts.platform_treasury.to_account_info(),
                    },
                    &[signer_seeds],
                ),
                performance_fee,
            )?;
        }

        // 3. Reimburse oracle authority for gas
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: campaign.to_account_info(),
                    to: ctx.accounts.oracle_authority.to_account_info(),
                },
                &[signer_seeds],
            ),
            gas_fee,
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

        let remaining = campaign.remaining_lamports;
        
        if remaining > 0 {
            // 5% early exit penalty to treasury
            let penalty = remaining.checked_mul(5).unwrap() / 100;
            let refund = remaining.checked_sub(penalty).unwrap();

            let seed_bytes = campaign.seed.to_le_bytes();
            let signer_seeds: &[&[u8]] = &[
                b"campaign",
                campaign.creator.as_ref(),
                seed_bytes.as_ref(),
                &[campaign.bump],
            ];

            if penalty > 0 {
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        Transfer {
                            from: campaign.to_account_info(),
                            to: ctx.accounts.platform_treasury.to_account_info(),
                        },
                        &[signer_seeds],
                    ),
                    penalty,
                )?;
            }

            if refund > 0 {
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        Transfer {
                            from: campaign.to_account_info(),
                            to: ctx.accounts.creator_receiving.to_account_info(),
                        },
                        &[signer_seeds],
                    ),
                    refund,
                )?;
            }
        }

        campaign.remaining_lamports = 0;
        campaign.status = CampaignStatus::Closed;

        emit!(CampaignClosed {
            campaign: campaign.key(),
            creator: campaign.creator,
            authority: ctx.accounts.oracle_authority.key(),
            remaining_lamports: 0,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = CampaignEscrow::SPACE,
        seeds = [b"campaign", creator.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub campaign: Account<'info, CampaignEscrow>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: The authority that will manage this campaign
    pub oracle_authority: UncheckedAccount<'info>,
    /// CHECK: The platform treasury that receives the 2% setup fee
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,
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
    /// CHECK: The platform treasury receives the 3% performance fee
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,
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
    /// CHECK: Safe because we just send lamports here when closing
    #[account(mut)]
    pub creator_receiving: UncheckedAccount<'info>,
    /// CHECK: The platform treasury receives the 5% refund penalty
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,
    pub oracle_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct CampaignEscrow {
    pub creator: Pubkey,
    pub oracle_authority: Pubkey,
    pub budget_lamports: u64,
    pub remaining_lamports: u64,
    pub rate_per_1k_lamports: u64,
    pub seed: u64,
    pub bump: u8,
    pub status: CampaignStatus,
    pub created_at: i64,
}

impl CampaignEscrow {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8;
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
    #[msg("Creator recipient does not match the campaign creator.")]
    InvalidRecipient,
    #[msg("Insufficient balance in the escrow account.")]
    InsufficientEscrowBalance,
}
