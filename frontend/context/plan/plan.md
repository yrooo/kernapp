# Kern Implementation Plan (Hackathon Timeline)

This document outlines the phased development plan for the Kern hackathon prototype. The goal is to build a functional, end-to-end "Clip-to-Earn" flow that demonstrates the Optimistic Oracle and Solana settlement.

## Phase 1: Foundation & Smart Contracts (Day 1)
**Goal:** Establish the on-chain vault and basic project architecture.

*   [*] **1.1 Next.js Setup:** 
    *   Initialize standard folder structure (`app`, `components/ui`, `context`).
    *   Integrate Solana Wallet Adapter (Phantom support).
    *   Set up Supabase client.
*   [x] **1.2 Solana Program (Anchor):**
    *   Write the `initialize_campaign` instruction (locks Creator's SOL in a PDA).
    *   Write the `execute_payout` instruction (requires signature from the AI Oracle keypair).
    *   Write the `dispute_payout` instruction (allows Creator to lock the transaction by staking a fee).
*   [x] **1.3 Python Backend Scaffolding:**
    *   Set up FastAPI.
    *   Create endpoints for clip submission (`/submit-clip`).

## Phase 2: Core Platform & Database (Day 1 - 2)
**Goal:** Allow users to create campaigns and submit clips.

*   [x] **2.1 Database Schema (Supabase):**
    *   `campaigns` (id, creator_wallet, budget, rate_per_1k, vault_pda).
    *   `clips` (id, campaign_id, clipper_wallet, tiktok_url, status, views, ai_confidence).
*   [x] **2.2 Creator Dashboard (Frontend):**
    *   UI to create a new campaign (input budget and rate).
    *   Integration with Phantom to deposit SOL to the Vault PDA.
    *   Dashboard to view active campaigns and pending clips.
*   [x] **2.3 Clipper Dashboard (Frontend):**
    *   UI to browse active campaigns.
    *   Form to submit a TikTok URL for a specific campaign.
    *   Dashboard to view your submitted clips and their status.

## Phase 3: AI Oracle Validation (Day 2)
**Goal:** Build the off-chain intelligence to verify content and views.

*   [x] **3.1 TikTok Scraper:**
    *   Build a Python script to extract the video file and metadata (views, timestamp) from a given TikTok URL.
*   [x] **3.2 AI Verification:**
    *   Integrate `InsightFace` to compare the video's faces against the Creator's reference image.
    *   Generate an `ai_confidence` score.
*   [x] **3.3 The Oracle Agent:**
    *   If `ai_confidence > 90%`, log the clip as `VERIFIED` in Supabase.
    *   Update the database with the current view count.

## Phase 4: Settlement & The Optimistic Oracle (Day 2 - 3)
**Goal:** Close the loop with automated payouts and dispute handling.

*   [x] **4.1 The 24-Hour Challenge Window:**
    *   Backend cron job checks for clips that have been `VERIFIED` for > 24 hours.
*   [x] **4.2 Automated Payout:**
    *   If no dispute is filed within 24 hours, the Python backend signs the transaction using the Oracle Keypair.
    *   Transaction calls `execute_payout` on Solana, moving funds from the Vault PDA to the Clipper.
*   [x] **4.3 Dispute Mechanic (UI & Contract):**
    *   Add a "Dispute" button on the Creator Dashboard for pending clips.
    *   Clicking it prompts a Solana transaction to stake 0.1 SOL and marks the clip as `DISPUTED` in the database.

## Phase 5: Polish & Pitch Prep (Day 3)
**Goal:** Make it look like a "Financial Terminal" and ensure a smooth demo.

*   [ ] **5.1 UI/UX Polish:**
    *   Implement minimalist, high-contrast Serif design (e.g., *Cormorant Garamond*).
    *   Ensure loading states for blockchain transactions are clear.
*   [ ] **5.2 Demo Data Seeding:**
    *   Create mock campaigns and "pre-verified" clips to show during the pitch without waiting for real-time scraping.
*   [ ] **5.3 End-to-End Testing:**
    *   Run through the entire flow: Create Campaign -> Submit Clip -> AI Verify -> Wait -> Auto-Payout.

---
**Next Step:** I recommend starting with Phase 1.1 and 1.2 to get the core Solana program and Next.js foundation up and running. Let me know when you're ready!
