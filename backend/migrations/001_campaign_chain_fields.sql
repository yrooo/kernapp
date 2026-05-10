-- Sync the live Supabase campaigns table with the repo schema and chain integration fields.
-- Apply this once against the Supabase SQL editor or migration pipeline.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS chain_campaign_seed NUMERIC(20,0),
  ADD COLUMN IF NOT EXISTS chain_program_id TEXT,
  ADD COLUMN IF NOT EXISTS chain_tx_signature TEXT,
  ADD COLUMN IF NOT EXISTS chain_cluster TEXT DEFAULT 'devnet',
  ADD COLUMN IF NOT EXISTS chain_status TEXT DEFAULT 'pending';