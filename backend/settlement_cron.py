import time
import random
from datetime import datetime, timedelta

def get_verified_clips_ready_for_payout():
    """
    Mock function to query Supabase for clips that:
    1. Have status = 'VERIFIED'
    2. Have an updated_at timestamp > 24 hours ago
    """
    print("[Cron] Checking for clips VERIFIED > 24 hours ago...")
    # Mocking a clip that is past the 24h challenge window
    return [
        {
            "id": "mock-clip-123",
            "campaign_id": "mock-campaign-xyz",
            "clipper_wallet": "mock-clipper-wallet",
            "views": 15000,
            "status": "VERIFIED",
            "updated_at": (datetime.now() - timedelta(hours=25)).isoformat()
        }
    ]

def execute_solana_payout(clip):
    """
    Mock function to represent the Python Backend signing the 
    'execute_payout' instruction on Solana.
    """
    print(f"[Oracle Keypair] Signing transaction for clip {clip['id']}...")
    time.sleep(2) # Simulate Solana RPC call
    print(f"✅ Transaction confirmed! Transferred SOL to {clip['clipper_wallet']} for {clip['views']} views.")
    return True

def run_settlement_cron():
    while True:
        clips = get_verified_clips_ready_for_payout()
        
        if not clips:
            print("[Cron] No clips ready for settlement.")
            
        for clip in clips:
            print(f"--- Processing Settlement for {clip['id']} ---")
            success = execute_solana_payout(clip)
            if success:
                # In production:
                # db.table('clips').update({'status': 'PAID'}).eq('id', clip['id']).execute()
                print(f"[Supabase] Updated clip {clip['id']} status to PAID.")
            print("-----------------------------------------")
        
        # Run every hour in production, but every 60 seconds for hackathon demo purposes
        print("[Cron] Sleeping for 60 seconds...")
        time.sleep(60)

if __name__ == "__main__":
    print("Starting Kern Settlement Cron Job...")
    run_settlement_cron()
