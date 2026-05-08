import os
import time
from datetime import datetime

from supabase import Client, create_client

from scraper import scrape_video_metadata

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MIN_PAYOUT_AMOUNT = float(os.environ.get("MIN_PAYOUT_AMOUNT", "0.01"))

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

def get_clipper_wallet(clipper_id: str) -> str:
    response = db.table("profiles").select("wallet_address").eq("id", clipper_id).single().execute()
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

def execute_solana_payout(clip_id: str, clipper_wallet: str, amount: float) -> str:
    print(f"[Oracle Keypair] Signing transaction for clip {clip_id}...")
    time.sleep(1)
    print(f"✅ Transaction confirmed! Transferred {amount} SOL to {clipper_wallet}.")
    return f"mock-tx-{clip_id}-{int(time.time())}"

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

            reward_rate = get_campaign_reward_rate(clip["campaign_id"])
            payout_amount = round((delta_views / 1000.0) * reward_rate, 6)
            if payout_amount >= MIN_PAYOUT_AMOUNT:
                clipper_wallet = get_clipper_wallet(clip["clipper_id"])
                tx_hash = execute_solana_payout(clip_id, clipper_wallet, payout_amount)
                db.table("payouts").insert(
                    {
                        "clip_id": clip_id,
                        "tx_hash": tx_hash,
                        "amount_paid": payout_amount,
                    }
                ).execute()
                db.table("clips").update({"status": "paid"}).eq("id", clip_id).execute()
                print(f"[Supabase] Updated clip {clip_id} status to paid.")
            else:
                print(f"[Cron] Payout below threshold: {payout_amount}")
            print("-----------------------------------------")

        print(f"[Cron] Sleeping for {interval_seconds} seconds...")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    print("Starting Kern Settlement Cron Job...")
    run_settlement_cron()
