# Changelog

## Unreleased

### Added
- Anchor workspace scaffolding for the `kern` program with a PDA-based SOL escrow contract.
- Backend Solana helper utilities for PDA derivation, lamport conversion, and devnet transaction submission.
- Campaign chain bookkeeping fields and a local SQL migration for the Supabase `campaigns` table.
- Creator dashboard display of the real vault PDA, chain tx signature, chain status, and cluster.

### Changed
- Campaign creation now derives the on-chain vault PDA and stores real Solana metadata instead of a fabricated placeholder.
- Settlement processing now uses the campaign's on-chain seed and program id to submit devnet payout transactions instead of returning mock tx hashes.
- Removed the minimum payout floor in settlement so any positive earned payout can be processed.

### Notes
- The live Supabase database still needs the migration in `backend/migrations/001_campaign_chain_fields.sql` applied manually.
- The Anchor program has been scaffolded for devnet, but you still need the Rust and Anchor toolchain installed locally to build and deploy it.

For setup on Windows, use WSL2 Ubuntu first. The current Anchor docs still treat Windows as WSL-first for Solana development.

Install WSL2 Ubuntu from an elevated PowerShell window with wsl --install -d Ubuntu, then reopen Ubuntu.
Install the toolchain in Ubuntu. Fastest path: curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash. If you want Rust only, use curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y, then source $HOME/.cargo/env.
Verify the install with rustc --version, solana --version, and anchor --version. If Anchor is missing, install AVM with cargo install --git https://github.com/solana-foundation/anchor avm --force, then run avm install latest and avm use latest.
Set up a devnet wallet with solana config set --url devnet, solana-keygen new, solana airdrop 2, and solana balance.
Replace the placeholder program id before deploy. The current scaffold still uses a placeholder id in lib.rs and Anchor.toml. After generating the real id, put the same value into KERN_PROGRAM_ID and those files, or use anchor keys sync to keep them aligned.
Deploy with cd anchor, then anchor build and anchor deploy --provider.cluster devnet. Point KERN_SOLANA_KEYPAIR_PATH at the funded authority wallet, because the backend signer pays for campaign initialization on devnet.
Apply the SQL in 001_campaign_chain_fields.sql to your Supabase project, then start the app. For a smoke test, create a campaign in the creator page, confirm the returned vault PDA and transaction signature, and verify them with solana confirm <signature> --url devnet and solana account <vault_pda> --url devnet.
To test payouts, run the settlement cron and use a verified clip with any positive earned payout.
If you want, I can next turn this into a short devnet checklist file or help you replace the placeholder Anchor program id with the real deployed one.