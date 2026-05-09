import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client
from dotenv import load_dotenv

from oracle import verify_clip_originality
from scraper import scrape_video_metadata

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
AI_SCORE_THRESHOLD = float(os.environ.get("AI_SCORE_THRESHOLD", "0.85"))
DEMO_AUTH_ENABLED = os.environ.get("DEMO_AUTH_ENABLED", "true").lower() in {"1", "true", "yes", "on"}

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ALLOWED_SOCIAL_KEYS = {"tiktok", "instagram", "youtube"}


def _get_attr(source: Any, key: str):
    if isinstance(source, dict):
        return source.get(key)

    return getattr(source, key, None)


def extract_wallet_address_from_user(user: Any) -> Optional[str]:
    user_metadata = _get_attr(user, "user_metadata") or _get_attr(user, "raw_user_meta_data") or {}
    identities = _get_attr(user, "identities") or []
    identity_data = {}

    if identities:
      first_identity = identities[0]
      identity_data = _get_attr(first_identity, "identity_data") or {}

    candidates = [
        user_metadata.get("wallet_address"),
        user_metadata.get("address"),
        user_metadata.get("public_key"),
        user_metadata.get("publicKey"),
        user_metadata.get("pubkey"),
        user_metadata.get("sub"),
        identity_data.get("wallet_address"),
        identity_data.get("address"),
        identity_data.get("public_key"),
        identity_data.get("publicKey"),
        identity_data.get("pubkey"),
        identity_data.get("sub"),
    ]

    for candidate in candidates:
        if isinstance(candidate, str) and candidate:
            return candidate

    return None

app = FastAPI(title="Kern Oracle Backend", description="AI Oracle for Clip-to-Earn Verification")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CampaignCreate(BaseModel):
    title: str
    vault_pda: str
    reward_rate: float
    total_budget: float
    source_vod_url: Optional[str] = None
    social_targets: list[str] = Field(default_factory=list)
    ai_rules: Dict[str, Any] = Field(default_factory=dict)
    soft_rules: Optional[str] = None
    status: str = "draft"
    expires_at: Optional[datetime] = None

class ClipSubmission(BaseModel):
    campaign_id: str
    video_url: str
    platform: Optional[str] = None
    clipper_wallet: Optional[str] = None

class DisputeCreate(BaseModel):
    clip_id: str
    reason: Optional[str] = None
    creator_stake: float = 0

class DisputeResolve(BaseModel):
    verdict: str

class ProfileUpdate(BaseModel):
    wallet_address: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    social_links: Optional[Dict[str, Any]] = None

class SocialLinkRequest(BaseModel):
    provider: str
    redirect_url: Optional[str] = None

def get_current_user(
    authorization: Optional[str] = Header(default=None),
    wallet_address: Optional[str] = Header(default=None, alias="x-wallet-address"),
):
    profile_wallet = wallet_address
    user_metadata: Dict[str, Any] = {}
    auth_mode = "demo"

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_response.user
        auth_mode = "supabase"
        user_metadata = user.user_metadata or {}
        profile_wallet = profile_wallet or extract_wallet_address_from_user(user) or user_metadata.get("wallet_address")
        user_id = user.id
    elif DEMO_AUTH_ENABLED:
        if not profile_wallet:
            raise HTTPException(status_code=400, detail="Wallet address required")
        user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, profile_wallet))
    else:
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    if not profile_wallet:
        raise HTTPException(status_code=400, detail="Wallet address required")

    profile_payload = {
        "id": user_id,
        "wallet_address": profile_wallet,
        "username": user_metadata.get("username"),
        "avatar_url": user_metadata.get("avatar_url"),
        "social_links": user_metadata.get("social_links", {}),
    }
    db.table("profiles").upsert(profile_payload).execute()

    return {"user_id": user_id, "wallet_address": profile_wallet, "auth_mode": auth_mode}

def process_clip_background(clip_id: str, video_url: str, source_vod_url: Optional[str]):
    print(f"--- Starting background processing for clip {clip_id} ---")
    verification = verify_clip_originality(video_url, source_vod_url)
    ai_score = verification["ai_score"]
    ai_status = verification["ai_status"] if ai_score >= AI_SCORE_THRESHOLD else "rejected"
    status = "tracking" if ai_status == "verified" else "disputed"

    db.table("clips").update(
        {
            "ai_status": ai_status,
            "ai_score": ai_score,
            "ai_metadata": verification["ai_metadata"],
            "status": status,
        }
    ).eq("id", clip_id).execute()

    print("--- Processing Complete ---")

@app.get("/")
def read_root():
    return {"status": "Kern AI Oracle is running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kern-backend"}

@app.get("/me")
def get_me(user=Depends(get_current_user)):
    response = db.table("profiles").select("*").eq("id", user["user_id"]).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "success", "data": response.data}

@app.patch("/me")
def update_me(payload: ProfileUpdate, user=Depends(get_current_user)):
    updates: Dict[str, Any] = {}
    auth_updates: Dict[str, Any] = {}
    if payload.wallet_address is not None:
        updates["wallet_address"] = payload.wallet_address
        auth_updates["wallet_address"] = payload.wallet_address
    if payload.username is not None:
        updates["username"] = payload.username
        auth_updates["username"] = payload.username
    if payload.avatar_url is not None:
        updates["avatar_url"] = payload.avatar_url
        auth_updates["avatar_url"] = payload.avatar_url
    if payload.social_links is not None:
        invalid_keys = set(payload.social_links.keys()) - ALLOWED_SOCIAL_KEYS
        if invalid_keys:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid social_links keys: {', '.join(sorted(invalid_keys))}",
            )
        updates["social_links"] = payload.social_links
        auth_updates["social_links"] = payload.social_links

    if not updates:
        raise HTTPException(status_code=400, detail="No profile updates provided")

    response = db.table("profiles").update(updates).eq("id", user["user_id"]).execute()
    try:
        if auth_updates and user.get("auth_mode") == "supabase":
            db.auth.admin.update_user_by_id(user["user_id"], {"user_metadata": auth_updates})
    except Exception as exc:
        print(f"[Auth] Failed to sync user_metadata: {exc}")
    return {"status": "success", "data": response.data}

@app.post("/me/link-social")
def link_social(payload: SocialLinkRequest, user=Depends(get_current_user)):
    provider = payload.provider.lower()
    if provider not in ALLOWED_SOCIAL_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Must be one of: {', '.join(sorted(ALLOWED_SOCIAL_KEYS))}",
        )

    return {
        "status": "pending",
        "provider": provider,
        "message": "Auth0 social linking stub. Replace with real auth flow.",
        "redirect_url": payload.redirect_url,
    }

@app.get("/me/payouts")
def get_my_payouts(user=Depends(get_current_user)):
    clip_response = db.table("clips").select("id").eq("clipper_id", user["user_id"]).execute()
    clip_ids = [clip["id"] for clip in (clip_response.data or [])]

    if not clip_ids:
        return {"status": "success", "data": {"payouts": [], "total_paid": 0}}

    payouts_response = db.table("payouts").select("*").in_("clip_id", clip_ids).order("paid_at", desc=True).execute()
    payouts = payouts_response.data or []
    total_paid = sum(float(payout.get("amount_paid", 0) or 0) for payout in payouts)

    return {
        "status": "success",
        "data": {
            "payouts": payouts,
            "total_paid": total_paid,
        },
    }

@app.post("/campaigns")
def create_campaign(payload: CampaignCreate, user=Depends(get_current_user)):
    campaign = {
        "creator_id": user["user_id"],
        "title": payload.title,
        "vault_pda": payload.vault_pda,
        "source_vod_url": payload.source_vod_url,
        "reward_rate": payload.reward_rate,
        "total_budget": payload.total_budget,
        "social_targets": payload.social_targets,
        "ai_rules": payload.ai_rules,
        "soft_rules": payload.soft_rules,
        "status": payload.status,
        "expires_at": payload.expires_at.isoformat() if payload.expires_at else None,
    }
    response = db.table("campaigns").insert(campaign).execute()
    return {"status": "success", "data": response.data}

@app.get("/campaigns")
def list_campaigns(status: Optional[str] = None):
    query = db.table("campaigns").select("*")
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return {"status": "success", "data": response.data}

@app.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: str):
    response = db.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "success", "data": response.data}

@app.get("/clips/{clip_id}")
def get_clip(clip_id: str, user=Depends(get_current_user)):
    clip_response = db.table("clips").select("*").eq("id", clip_id).single().execute()
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = clip_response.data
    if clip.get("clipper_id") != user["user_id"]:
        campaign_response = db.table("campaigns").select("creator_id").eq("id", clip["campaign_id"]).single().execute()
        if not campaign_response.data or campaign_response.data["creator_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this clip")

    snapshots_response = (
        db.table("view_snapshots")
        .select("*")
        .eq("clip_id", clip_id)
        .order("captured_at", desc=True)
        .limit(5)
        .execute()
    )
    payouts_response = db.table("payouts").select("*").eq("clip_id", clip_id).execute()
    dispute_response = db.table("disputes").select("*").eq("clip_id", clip_id).execute()

    return {
        "status": "success",
        "data": {
            "clip": clip,
            "recent_snapshots": snapshots_response.data or [],
            "payouts": payouts_response.data or [],
            "dispute": (dispute_response.data or [None])[0],
        },
    }

@app.post("/submit-clip")
def submit_clip(submission: ClipSubmission, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    campaign_response = (
        db.table("campaigns").select("id, source_vod_url").eq("id", submission.campaign_id).single().execute()
    )
    if not campaign_response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    metadata = scrape_video_metadata(submission.video_url)
    platform = submission.platform or metadata["platform"]

    clip_payload = {
        "campaign_id": submission.campaign_id,
        "clipper_id": user["user_id"],
        "video_url": submission.video_url,
        "platform": platform,
        "initial_views": metadata["views"],
        "current_views": metadata["views"],
        "ai_status": "pending",
        "status": "tracking",
    }
    clip_response = db.table("clips").insert(clip_payload).execute()
    clip_id = clip_response.data[0]["id"] if clip_response.data else str(uuid.uuid4())

    background_tasks.add_task(
        process_clip_background,
        clip_id,
        submission.video_url,
        campaign_response.data.get("source_vod_url"),
    )

    return {
        "status": "success",
        "data": {
            "clip_id": clip_id,
            "campaign_id": submission.campaign_id,
            "message": "Clip received. The Optimistic Oracle is analyzing the content.",
        },
    }

@app.post("/disputes")
def create_dispute(payload: DisputeCreate, user=Depends(get_current_user)):
    clip_response = db.table("clips").select("id, campaign_id").eq("id", payload.clip_id).single().execute()
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    campaign_response = (
        db.table("campaigns").select("id, creator_id").eq("id", clip_response.data["campaign_id"]).single().execute()
    )
    if campaign_response.data["creator_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can dispute")

    dispute_payload = {
        "clip_id": payload.clip_id,
        "reason": payload.reason,
        "creator_stake": payload.creator_stake,
        "status": "open",
    }
    db.table("disputes").insert(dispute_payload).execute()
    db.table("clips").update({"status": "disputed"}).eq("id", payload.clip_id).execute()

    return {"status": "success", "message": "Dispute opened"}

@app.post("/disputes/{clip_id}/resolve")
def resolve_dispute(clip_id: str, payload: DisputeResolve, user=Depends(get_current_user)):
    dispute_response = db.table("disputes").select("clip_id").eq("clip_id", clip_id).single().execute()
    if not dispute_response.data:
        raise HTTPException(status_code=404, detail="Dispute not found")

    clip_response = db.table("clips").select("campaign_id").eq("id", clip_id).single().execute()
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    campaign_response = (
        db.table("campaigns").select("creator_id").eq("id", clip_response.data["campaign_id"]).single().execute()
    )
    if campaign_response.data["creator_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can resolve")

    verdict = payload.verdict
    if verdict not in {"valid", "fraud"}:
        raise HTTPException(status_code=400, detail="Verdict must be 'valid' or 'fraud'")

    db.table("disputes").update({"status": "resolved", "verdict": verdict}).eq("clip_id", clip_id).execute()
    next_status = "tracking" if verdict == "valid" else "disputed"
    db.table("clips").update({"status": next_status}).eq("id", clip_id).execute()

    return {"status": "success", "message": "Dispute resolved"}
