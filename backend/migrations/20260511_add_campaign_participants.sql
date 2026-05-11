-- Migration: Add campaign_participants table
CREATE TABLE IF NOT EXISTS campaign_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    clipper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (campaign_id, clipper_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campaign_participants_clipper ON campaign_participants(clipper_id);

-- RLS
ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_own" ON campaign_participants
    FOR SELECT USING (clipper_id = auth.uid());

CREATE POLICY "participants_insert_own" ON campaign_participants
    FOR INSERT WITH CHECK (clipper_id = auth.uid());

CREATE POLICY "participants_delete_own" ON campaign_participants
    FOR DELETE USING (clipper_id = auth.uid());
