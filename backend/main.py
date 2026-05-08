from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from scraper import scrape_tiktok_metadata
from oracle import verify_clip_originality
import os
import uuid
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware

# Supabase Setup (using mocks if env vars are missing for local testing)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://mock.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "mock-key")
# db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Kern Oracle Backend", description="AI Oracle for Clip-to-Earn Verification")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClipSubmission(BaseModel):
    campaign_id: str
    clipper_wallet: str
    tiktok_url: str

def process_clip_background(submission: ClipSubmission, clip_id: str):
    print(f"--- Starting background processing for clip {clip_id} ---")
    
    # 1. Scrape metadata
    metadata = scrape_tiktok_metadata(submission.tiktok_url)
    
    # 2. AI Verification
    verification = verify_clip_originality(submission.tiktok_url, "mock_creator_wallet")
    
    print(f"[Oracle Result] Status: {verification['status']} | Confidence: {verification['ai_confidence']}% | Views: {metadata['views']}")
    
    # 3. Save to Database
    # In production:
    # db.table('clips').update({
    #     'status': verification['status'],
    #     'views': metadata['views'],
    #     'ai_confidence': verification['ai_confidence']
    # }).eq('id', clip_id).execute()
    print("--- Processing Complete ---")

@app.get("/")
def read_root():
    return {"status": "Kern AI Oracle is running"}

@app.post("/submit-clip")
async def submit_clip(submission: ClipSubmission, background_tasks: BackgroundTasks):
    clip_id = str(uuid.uuid4())
    
    # In production, insert 'PENDING' row into DB here:
    # db.table('clips').insert({...}).execute()
    
    # Process the heavy AI tasks in the background
    background_tasks.add_task(process_clip_background, submission, clip_id)
    
    return {
        "status": "success",
        "data": {
            "clip_id": clip_id,
            "campaign_id": submission.campaign_id,
            "message": "Clip received. The Optimistic Oracle is analyzing the content."
        }
    }
