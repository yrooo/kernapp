This ERD is designed for **Supabase (PostgreSQL)**. It utilizes `JSONB` for flexible AI rules and metadata, and `UUIDs` for primary keys to align with Supabase Auth.

Since **Kern** is a "Financial Terminal," this structure prioritizes the relationship between the **Vault (Campaign)**, the **Evidence (Clips)**, and the **Ledger (Snapshots/Payouts)**.

```mermaid
erDiagram
    PROFILES ||--o{ CAMPAIGNS : creates
    PROFILES ||--o{ CLIPS : submits
    CAMPAIGNS ||--o{ CLIPS : contains
    CLIPS ||--o{ VIEW_SNAPSHOTS : tracks
    CLIPS ||--o{ PAYOUTS : triggers
    CLIPS ||--o| DISPUTES : generates

    PROFILES {
        uuid id PK
        string wallet_address UK
        string username
        string avatar_url
        jsonb social_links "TikTok, IG, YT handles"
        float reputation_score
        timestamp created_at
    }

    CAMPAIGNS {
        uuid id PK
        uuid creator_id FK
        string title
        string vault_pda UK "Solana Vault Address"
        string source_vod_url
        decimal reward_rate "Per 1k views"
        decimal total_budget "SOL/USDC locked"
        jsonb ai_rules "Hard rules: face_check, audio_match"
        text soft_rules "Creative guidelines"
        string status "draft | funding | active | completed"
        timestamp expires_at
        timestamp created_at
    }

    CLIPS {
        uuid id PK
        uuid campaign_id FK
        uuid clipper_id FK
        string video_url UK
        string platform "tiktok | reels | shorts"
        bigint initial_views "Views at submission"
        bigint current_views "Latest view count"
        string ai_status "pending | verified | rejected"
        float ai_score "Confidence 0.0 - 1.0"
        jsonb ai_metadata "Face/audio match results"
        string status "tracking | paid | disputed"
        timestamp created_at
    }

    VIEW_SNAPSHOTS {
        bigint id PK
        uuid clip_id FK
        bigint views_count
        bigint delta_views "New views since last check"
        timestamp captured_at
    }

    PAYOUTS {
        uuid id PK
        uuid clip_id FK
        string tx_hash UK "Solana Transaction ID"
        decimal amount_paid
        timestamp paid_at
    }

    DISPUTES {
        uuid id PK
        uuid clip_id FK
        string reason
        decimal creator_stake "SOL staked to dispute"
        string status "open | resolved"
        string verdict "valid | fraud"
        timestamp created_at
    }

```

### Key Technical Decisions in this Schema:

* **`PROFILES` Table:** I’ve kept this lean. In Supabase, you’ll likely link this to `auth.users` via a trigger. The `reputation_score` is what clippers use to "level up."
* **`CAMPAIGNS.ai_rules` (JSONB):** Instead of creating 20 columns for different AI checks, using JSONB allows you to add new checks (like "Sentiment Analysis" or "Background Music Check") without migrating your database.
* **`CLIPS.initial_views`:** This is crucial. When a clipper submits a link, your Python backend grabs the views *at that exact moment*. This ensures the creator only pays for **new** growth.
* **`VIEW_SNAPSHOTS`:** This is your "Chron Job" table. Every 24 hours, you insert a new row here. This allows you to build those beautiful "Growth Charts" for the Creator Dashboard.
* **`DISPUTES`:** I included a `creator_stake` column. As we discussed, this prevents creators from disputing clips just to avoid paying—they have to put skin in the game.

### Implementation Tip for Supabase:

Since you’re using **Solana**, you don't need to store private keys (obviously). However, you should use **Postgres RLS (Row Level Security)** to ensure that a clipper can't see the "AI Score" of another clipper, and only the creator can edit their own campaign rules.