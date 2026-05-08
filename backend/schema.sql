-- Kern Supabase Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campaigns Table: Stores the active Clip-to-Earn campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_wallet TEXT NOT NULL,
    budget NUMERIC NOT NULL,
    rate_per_1k NUMERIC NOT NULL,
    vault_pda TEXT UNIQUE NOT NULL
);

-- Clips Table: Stores individual submissions from Clippers
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    clipper_wallet TEXT NOT NULL,
    tiktok_url TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'DISPUTED', 'PAID', 'REJECTED')),
    views INTEGER DEFAULT 0,
    ai_confidence NUMERIC DEFAULT 0
);

-- Add some indexes for performance
CREATE INDEX idx_campaigns_creator ON campaigns(creator_wallet);
CREATE INDEX idx_clips_campaign ON clips(campaign_id);
CREATE INDEX idx_clips_clipper ON clips(clipper_wallet);
