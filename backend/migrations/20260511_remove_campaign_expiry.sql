-- Remove the expires_at column from the campaigns table since campaigns are now perpetual until closed
ALTER TABLE campaigns DROP COLUMN IF EXISTS expires_at;
