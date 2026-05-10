import os
import time
from decimal import Decimal
from datetime import datetime

from supabase import Client, create_client

from scraper import scrape_video_metadata
from solana_chain import ChainIntegrationError, lamports_to_sol, send_execute_payout, sol_to_lamports

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_interval_seconds() -> int:
    mode = os.environ.get("KERN_CRON_MODE", "demo").lower()
    if mode == "prod":
        return 60 * 60 * 24
    return 60

def get_tracking_clips():
    response = (
        db.table("clips")
        .select("*")
        .eq("ai_status", "verified")
        .eq("status", "tracking")
        .execute()
    )
    return response.data or []

def get_campaign_reward_rate(campaign_id: str) -> float:
    response = db.table("campaigns").select("reward_rate").eq("id", campaign_id).single().execute()
    return float(response.data["reward_rate"]) if response.data else 0.0


def get_campaign_chain_context(campaign_id: str):
    response = (
        db.table("campaigns")
        .select("creator_id, vault_pda, chain_campaign_seed, chain_program_id, chain_cluster, chain_status")
        .eq("id", campaign_id)
        .single()
        .execute()
    )
    return response.data or {}

def get_clipper_wallet(clipper_id: str) -> str:
    response = db.table("profiles").select("wallet_address").eq("id", clipper_id).single().execute()
    if not response.data or not response.data.get("wallet_address"):
        return "unknown-wallet"
    return response.data["wallet_address"]


def get_creator_wallet(creator_id: str) -> str:
    response = db.table("profiles").select("wallet_address").eq("id", creator_id).single().execute()
    if not response.data or not response.data.get("wallet_address"):
        return "unknown-wallet"
    return response.data["wallet_address"]

def get_last_snapshot_views(clip_id: str) -> int:
    response = (
        db.table("view_snapshots")
        .select("views_count")
        .eq("clip_id", clip_id)
        .order("captured_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return int(response.data[0]["views_count"])
    return -1

def execute_solana_payout(campaign: dict, clipper_wallet: str, amount_lamports: int) -> str:
    chain_seed = campaign.get("chain_campaign_seed")
    creator_id = campaign.get("creator_id")
    if chain_seed is None or not creator_id:
        raise ChainIntegrationError("Campaign is missing chain escrow metadata")

    creator_wallet = get_creator_wallet(creator_id)
    if creator_wallet == "unknown-wallet":
        raise ChainIntegrationError("Campaign creator wallet is missing")

    print(f"[Oracle Keypair] Signing transaction for campaign {campaign.get('id')}...")
    tx_hash = send_execute_payout(
        creator_wallet=creator_wallet,
        seed=int(chain_seed),
        clipper_wallet=clipper_wallet,
        amount_lamports=amount_lamports,
        program_id=campaign.get("chain_program_id"),
    )
    print(f"✅ Devnet transaction confirmed! Transferred {lamports_to_sol(amount_lamports)} SOL to {clipper_wallet}. Tx: {tx_hash}")
    return tx_hash

def run_settlement_cron():
    interval_seconds = get_interval_seconds()
    print(f"[Cron] Mode interval: {interval_seconds} seconds")

    while True:
        clips = get_tracking_clips()
        if not clips:
            print("[Cron] No clips ready for settlement.")

        for clip in clips:
            clip_id = clip["id"]
            print(f"--- Processing Settlement for {clip_id} ---")
            metadata = scrape_video_metadata(clip["video_url"])
            current_views = int(metadata["views"])

            last_views = get_last_snapshot_views(clip_id)
            if last_views < 0:
                last_views = int(clip.get("initial_views", 0))

            delta_views = max(current_views - last_views, 0)
            db.table("view_snapshots").insert(
                {
                    "clip_id": clip_id,
                    "views_count": current_views,
                    "delta_views": delta_views,
                    "captured_at": datetime.utcnow().isoformat(),
                }
            ).execute()

            db.table("clips").update({"current_views": current_views}).eq("id", clip_id).execute()

            reward_rate = Decimal(str(get_campaign_reward_rate(clip["campaign_id"])))
            payout_lamports = sol_to_lamports((Decimal(delta_views) * reward_rate) / Decimal("1000"))
            if payout_lamports > 0:
                clipper_wallet = get_clipper_wallet(clip["clipper_id"])
                campaign_context = get_campaign_chain_context(clip["campaign_id"])
                try:
                    tx_hash = execute_solana_payout(campaign_context, clipper_wallet, payout_lamports)
                    db.table("payouts").insert(
                        {
                            "clip_id": clip_id,
                            "tx_hash": tx_hash,
                            "amount_paid": float(lamports_to_sol(payout_lamports)),
                        }
                    ).execute()
                    db.table("clips").update({"status": "paid"}).eq("id", clip_id).execute()
                    print(f"[Supabase] Updated clip {clip_id} status to paid.")
                except ChainIntegrationError as exc:
                    print(f"[Cron] Devnet payout failed for clip {clip_id}: {exc}")
            else:
                print(f"[Cron] No payout earned yet: {payout_lamports} lamports")
            print("-----------------------------------------")

        print(f"[Cron] Sleeping for {interval_seconds} seconds...")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    print("Starting Kern Settlement Cron Job...")
    run_settlement_cron()
