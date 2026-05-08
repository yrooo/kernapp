use anchor_lang::prelude::*;

// Placeholder Program ID
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod kern {
    use super::*;

    pub fn initialize_campaign(ctx: Context<InitializeCampaign>, budget: u64, rate_per_1k: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.budget = budget;
        campaign.rate_per_1k = rate_per_1k;
        // In a real implementation, we'd transfer SOL from creator to the campaign PDA here
        Ok(())
    }

    pub fn execute_payout(ctx: Context<ExecutePayout>, _amount: u64) -> Result<()> {
        // This transaction requires the AI Oracle to sign off on the view count
        // and transfers SOL from the PDA to the clipper.
        Ok(())
    }

    pub fn dispute_payout(_ctx: Context<DisputePayout>) -> Result<()> {
        // Creator stakes 0.1 SOL to halt an optimistic payout
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCampaign<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + 32 + 8 + 8 // Discriminator + Pubkey + 2 u64s
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecutePayout<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    /// CHECK: The clipper wallet receiving the funds
    #[account(mut)]
    pub clipper: AccountInfo<'info>,
    pub oracle: Signer<'info>, // The AI Oracle must sign this tx
}

#[derive(Accounts)]
pub struct DisputePayout<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub budget: u64,
    pub rate_per_1k: u64,
}
