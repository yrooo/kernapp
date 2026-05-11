import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from oracle import verify_clip_originality
from pydantic import BaseModel, Field
from scraper import scrape_video_metadata
from solana_chain import (
    ChainIntegrationError,
    build_unsigned_campaign_transaction,
    derive_campaign_pda,
    generate_campaign_seed,
    send_initialize_campaign,
    sol_to_lamports,
    submit_signed_transaction,
)
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
)
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000")
FRONTEND_PUBLIC_URL = os.environ.get("FRONTEND_PUBLIC_URL", "http://localhost:3000")
AI_SCORE_THRESHOLD = float(os.environ.get("AI_SCORE_THRESHOLD", "0.85"))
DEMO_AUTH_ENABLED = os.environ.get("DEMO_AUTH_ENABLED", "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are required")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
service_db: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_SERVICE_ROLE_KEY
    else None
)
ALLOWED_SOCIAL_KEYS = {"tiktok", "instagram", "youtube"}
OAUTH_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "youtube": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "client_id_env": "GOOGLE_CLIENT_ID",
        "client_secret_env": "GOOGLE_CLIENT_SECRET",
        "scopes": [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/youtube.readonly",
        ],
        "auth_params": {
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        },
    },
    "instagram": {
        "auth_url": "https://api.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "client_id_env": "INSTAGRAM_CLIENT_ID",
        "client_secret_env": "INSTAGRAM_CLIENT_SECRET",
        "scopes": ["user_profile", "user_media"],
    },
    "tiktok": {
        "auth_url": "https://www.tiktok.com/v2/auth/authorize/",
        "token_url": "https://open.tiktokapis.com/v2/oauth/token/",
        "client_id_env": "TIKTOK_CLIENT_KEY",
        "client_secret_env": "TIKTOK_CLIENT_SECRET",
        "scopes": ["user.info.basic", "video.list"],
        "client_id_param": "client_key",
        "client_secret_param": "client_secret",
    },
}


def _get_attr(source: Any, key: str):
    if isinstance(source, dict):
        return source.get(key)

    return getattr(source, key, None)


def clean_wallet_address(address: str) -> str:
    if not address:
        return address
    # Common prefixes from Supabase/Auth providers (e.g. "web3:solana:ADDRESS")
    prefixes = ["web3:solana:", "web3:ethereum:", "web3:base:", "web3:"]
    for prefix in prefixes:
        if address.lower().startswith(prefix):
            return address[len(prefix) :]
    return address


def extract_wallet_address_from_user(user: Any) -> Optional[str]:
    user_metadata = (
        _get_attr(user, "user_metadata") or _get_attr(user, "raw_user_meta_data") or {}
    )
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
            return clean_wallet_address(candidate)

    return None


def create_user_scoped_client(access_token: str) -> Client:
    user_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    user_client.postgrest.auth(access_token)
    return user_client


def get_user_db(user: Dict[str, Any]) -> Client:
    if user.get("auth_mode") == "supabase":
        token = user.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Missing access token")
        return create_user_scoped_client(token)

    if service_db is not None:
        return service_db

    raise HTTPException(
        status_code=500,
        detail="DEMO_AUTH_ENABLED requires SUPABASE_SERVICE_ROLE_KEY for profile writes",
    )


def get_oauth_config(provider: str) -> Dict[str, Any]:
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    provider_config = OAUTH_PROVIDERS[provider]
    client_id = os.environ.get(provider_config["client_id_env"])
    client_secret = os.environ.get(provider_config["client_secret_env"])
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail=f"Missing OAuth env for {provider}. Set {provider_config['client_id_env']} and {provider_config['client_secret_env']}",
        )

    config = dict(provider_config)
    config["client_id"] = client_id
    config["client_secret"] = client_secret
    config["redirect_uri"] = f"{BACKEND_PUBLIC_URL}/oauth/callback/{provider}"
    return config


def build_authorize_url(config: Dict[str, Any], state_id: str) -> str:
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": " ".join(config.get("scopes", [])),
        "state": state_id,
    }
    params.update(config.get("auth_params", {}))
    return f"{config['auth_url']}?{urllib.parse.urlencode(params)}"


def exchange_token(config: Dict[str, Any], code: str) -> Dict[str, Any]:
    data = {
        config.get("client_id_param", "client_id"): config["client_id"],
        config.get("client_secret_param", "client_secret"): config["client_secret"],
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config["redirect_uri"],
    }
    data.update(config.get("token_params", {}))

    payload = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(
        config["token_url"],
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8")
        raise HTTPException(
            status_code=400, detail=f"Token exchange failed: {error_body}"
        ) from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400, detail="Token exchange returned invalid JSON"
        ) from exc


def extract_provider_user_id(token_payload: Dict[str, Any]) -> Optional[str]:
    for key in ("user_id", "open_id", "sub", "id"):
        value = token_payload.get(key)
        if value:
            return str(value)
    return None


def fetch_provider_profile(provider: str, access_token: str) -> Dict[str, Any]:
    try:
        if provider == "youtube":
            request = urllib.request.Request(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        elif provider == "instagram":
            params = urllib.parse.urlencode(
                {"fields": "id,username", "access_token": access_token}
            )
            request = urllib.request.Request(f"https://graph.instagram.com/me?{params}")
        elif provider == "tiktok":
            params = urllib.parse.urlencode(
                {"fields": "open_id,union_id,avatar_url,display_name,username"}
            )
            request = urllib.request.Request(
                f"https://open.tiktokapis.com/v2/user/info/?{params}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        else:
            return {}

        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
        return json.loads(body)
    except Exception as exc:
        print(f"[OAuth] Failed to fetch {provider} profile: {exc}")
        return {}


def extract_profile_user_id(
    provider: str, profile_info: Dict[str, Any]
) -> Optional[str]:
    if not profile_info:
        return None

    if provider == "youtube":
        return profile_info.get("sub")
    if provider == "instagram":
        return profile_info.get("id")
    if provider == "tiktok":
        user_info = profile_info.get("data", {}).get("user", {})
        return user_info.get("open_id") or user_info.get("union_id")
    return None


def extract_provider_username(
    provider: str, profile_info: Dict[str, Any]
) -> Optional[str]:
    if not profile_info:
        return None

    if provider == "youtube":
        return profile_info.get("name") or profile_info.get("email")
    if provider == "instagram":
        return profile_info.get("username")
    if provider == "tiktok":
        user_info = profile_info.get("data", {}).get("user", {})
        return user_info.get("display_name") or user_info.get("username")
    return None


app = FastAPI(
    title="Kern Oracle Backend", description="AI Oracle for Clip-to-Earn Verification"
)

# CORS Configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    FRONTEND_PUBLIC_URL,
]

# Add wildcard for Vercel preview deployments
if "vercel.app" in FRONTEND_PUBLIC_URL:
    allowed_origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now, can restrict later
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


class CampaignCreate(BaseModel):
    title: str
    reward_rate: float
    total_budget: float
    source_vod_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    social_targets: List[str] = Field(default_factory=list)
    ai_rules: Dict[str, Any] = Field(default_factory=dict)
    soft_rules: Optional[str] = None
    status: str = "active"


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


class CampaignPrepare(BaseModel):
    title: str
    reward_rate: float
    total_budget: float
    source_vod_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    social_targets: List[str] = Field(default_factory=list)
    ai_rules: Dict[str, Any] = Field(default_factory=dict)
    soft_rules: Optional[str] = None


class CampaignSubmit(BaseModel):
    signed_transaction: str  # base64-encoded signed transaction
    campaign_metadata: Dict[str, Any]  # campaign details to store


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    wallet_address: Optional[str] = Header(default=None, alias="x-wallet-address"),
):
    profile_wallet = wallet_address
    user_metadata: Dict[str, Any] = {}
    auth_mode = "demo"
    token: Optional[str] = None

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_response.user
        auth_mode = "supabase"
        user_metadata = user.user_metadata or {}
        profile_wallet = (
            profile_wallet
            or extract_wallet_address_from_user(user)
            or user_metadata.get("wallet_address")
        )
        user_id = user.id
    elif DEMO_AUTH_ENABLED:
        if not profile_wallet:
            raise HTTPException(status_code=400, detail="Wallet address required")
        user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, profile_wallet))
    else:
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    profile_wallet = clean_wallet_address(profile_wallet)

    if not profile_wallet:
        raise HTTPException(status_code=400, detail="Wallet address required")

    profile_payload = {
        "id": user_id,
        "wallet_address": profile_wallet,
        "username": user_metadata.get("username"),
        "avatar_url": user_metadata.get("avatar_url"),
        "social_links": user_metadata.get("social_links", {}),
    }
    if auth_mode == "supabase":
        create_user_scoped_client(token).table("profiles").upsert(
            profile_payload
        ).execute()
    elif service_db is not None:
        service_db.table("profiles").upsert(profile_payload).execute()
    else:
        raise HTTPException(
            status_code=500,
            detail="DEMO_AUTH_ENABLED requires SUPABASE_SERVICE_ROLE_KEY for profile writes",
        )

    return {
        "user_id": user_id,
        "wallet_address": profile_wallet,
        "auth_mode": auth_mode,
        "access_token": token,
    }


def process_clip_background(
    clip_id: str, video_url: str, source_vod_url: Optional[str]
):
    print(f"--- Starting background processing for clip {clip_id} ---")
    verification = verify_clip_originality(video_url, source_vod_url)
    ai_score = verification["ai_score"]
    ai_status = (
        verification["ai_status"] if ai_score >= AI_SCORE_THRESHOLD else "rejected"
    )
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
    user_db = get_user_db(user)
    response = (
        user_db.table("profiles")
        .select("*")
        .eq("id", user["user_id"])
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "success", "data": response.data}


@app.get("/me/social-accounts")
def get_social_accounts(user=Depends(get_current_user)):
    user_db = get_user_db(user)
    response = (
        user_db.table("social_accounts")
        .select(
            "provider, provider_user_id, provider_username, scope, expires_at, updated_at"
        )
        .eq("profile_id", user["user_id"])
        .execute()
    )
    return {"status": "success", "data": response.data or []}


@app.delete("/me/social-accounts/{provider}")
def delete_social_account(provider: str, user=Depends(get_current_user)):
    provider = provider.lower()
    if provider not in ALLOWED_SOCIAL_KEYS:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    user_db = get_user_db(user)
    user_db.table("social_accounts").delete().eq("profile_id", user["user_id"]).eq(
        "provider", provider
    ).execute()
    return {"status": "success"}


@app.patch("/me")
def update_me(payload: ProfileUpdate, user=Depends(get_current_user)):
    user_db = get_user_db(user)
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

    response = (
        user_db.table("profiles").update(updates).eq("id", user["user_id"]).execute()
    )
    try:
        if (
            auth_updates
            and user.get("auth_mode") == "supabase"
            and service_db is not None
        ):
            service_db.auth.admin.update_user_by_id(
                user["user_id"], {"user_metadata": auth_updates}
            )
    except Exception as exc:
        print(f"[Auth] Failed to sync user_metadata: {exc}")
    return {"status": "success", "data": response.data}


@app.post("/me/link-social")
def link_social(payload: SocialLinkRequest, user=Depends(get_current_user)):
    return link_social_start(payload, user)


@app.post("/me/link-social/start")
def link_social_start(payload: SocialLinkRequest, user=Depends(get_current_user)):
    provider = payload.provider.lower()
    if provider not in ALLOWED_SOCIAL_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Must be one of: {', '.join(sorted(ALLOWED_SOCIAL_KEYS))}",
        )

    # DEMO MODE: Fake social linking without OAuth
    if DEMO_AUTH_ENABLED:
        user_db = get_user_db(user)

        # Generate fake but realistic looking data
        fake_usernames = {
            "youtube": f"@creator{user['wallet_address'][:6]}",
            "tiktok": f"@tiktoker{user['wallet_address'][:6]}",
            "instagram": f"@insta{user['wallet_address'][:6]}",
        }

        fake_user_ids = {
            "youtube": f"UC{user['wallet_address'][:20]}",
            "tiktok": user["wallet_address"][:16],
            "instagram": user["wallet_address"][:12],
        }

        # Create fake social account
        account_payload = {
            "profile_id": user["user_id"],
            "provider": provider,
            "provider_user_id": fake_user_ids.get(
                provider, user["wallet_address"][:12]
            ),
            "provider_username": fake_usernames.get(
                provider, f"@user{user['wallet_address'][:6]}"
            ),
            "scope": "demo_scope",
            "access_token": "demo_token_" + str(uuid.uuid4()),
            "refresh_token": None,
            "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
        }

        user_db.table("social_accounts").upsert(
            account_payload, on_conflict="profile_id,provider"
        ).execute()

        # Return success without OAuth flow
        redirect_url = payload.redirect_url or FRONTEND_PUBLIC_URL
        return {
            "status": "success",
            "provider": provider,
            "auth_url": f"{redirect_url}?linked={provider}&demo=true",
            "demo_mode": True,
        }

    # PRODUCTION MODE: Real OAuth flow
    user_db = get_user_db(user)
    config = get_oauth_config(provider)
    state_id = str(uuid.uuid4())
    user_db.table("oauth_states").insert(
        {
            "id": state_id,
            "profile_id": user["user_id"],
            "provider": provider,
            "redirect_url": payload.redirect_url,
        }
    ).execute()

    auth_url = build_authorize_url(config, state_id)
    return {"status": "success", "provider": provider, "auth_url": auth_url}


@app.get("/oauth/callback/{provider}")
def oauth_callback(
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    if error:
        raise HTTPException(status_code=400, detail=error_description or error)

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    if service_db is None:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_SERVICE_ROLE_KEY required for OAuth callback",
        )

    provider = provider.lower()
    if provider not in ALLOWED_SOCIAL_KEYS:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    config = get_oauth_config(provider)
    state_response = (
        service_db.table("oauth_states").select("*").eq("id", state).single().execute()
    )
    if not state_response.data:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    token_payload = exchange_token(config, code)
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=400, detail="OAuth token response missing access_token"
        )

    profile_info = fetch_provider_profile(provider, access_token)
    provider_user_id = extract_provider_user_id(
        token_payload
    ) or extract_profile_user_id(provider, profile_info)
    provider_username = extract_provider_username(provider, profile_info)

    expires_at = None
    expires_in = token_payload.get("expires_in") or token_payload.get(
        "expires_in_seconds"
    )
    if expires_in:
        try:
            expires_seconds = int(expires_in)
            expires_at = (
                datetime.utcnow() + timedelta(seconds=expires_seconds)
            ).isoformat()
        except (TypeError, ValueError):
            expires_at = None

    account_payload = {
        "profile_id": state_response.data["profile_id"],
        "provider": provider,
        "provider_user_id": provider_user_id,
        "provider_username": provider_username,
        "access_token": access_token,
        "refresh_token": token_payload.get("refresh_token"),
        "expires_at": expires_at,
        "scope": token_payload.get("scope"),
        "metadata": profile_info,
        "updated_at": datetime.utcnow().isoformat(),
    }

    service_db.table("social_accounts").upsert(
        account_payload, on_conflict="profile_id,provider"
    ).execute()
    service_db.table("oauth_states").delete().eq("id", state).execute()

    redirect_url = state_response.data.get("redirect_url") or FRONTEND_PUBLIC_URL
    return RedirectResponse(f"{redirect_url}?linked={provider}")


@app.get("/me/payouts")
def get_my_payouts(user=Depends(get_current_user)):
    clip_response = (
        db.table("clips").select("id").eq("clipper_id", user["user_id"]).execute()
    )
    clip_ids = [clip["id"] for clip in (clip_response.data or [])]

    if not clip_ids:
        return {"status": "success", "data": {"payouts": [], "total_paid": 0}}

    payouts_response = (
        db.table("payouts")
        .select("*")
        .in_("clip_id", clip_ids)
        .order("paid_at", desc=True)
        .execute()
    )
    payouts = payouts_response.data or []
    total_paid = sum(float(payout.get("amount_paid", 0) or 0) for payout in payouts)

    return {
        "status": "success",
        "data": {
            "payouts": payouts,
            "total_paid": total_paid,
        },
    }


@app.post("/campaigns/prepare")
def prepare_campaign(payload: CampaignPrepare, user=Depends(get_current_user)):
    """
    Prepare an unsigned transaction for campaign creation.
    Creator will sign this with their wallet and submit it back.
    """
    creator_wallet = user["wallet_address"]

    if payload.reward_rate <= 0 or payload.total_budget <= 0:
        raise HTTPException(
            status_code=400, detail="Budget and reward rate must be greater than zero"
        )

    campaign_seed = generate_campaign_seed()
    budget_lamports = sol_to_lamports(payload.total_budget)
    rate_lamports = sol_to_lamports(payload.reward_rate)

    try:
        serialized_tx, campaign_pda, bump, program_id = (
            build_unsigned_campaign_transaction(
                creator_wallet=creator_wallet,
                seed=campaign_seed,
                budget_lamports=budget_lamports,
                rate_per_1k_lamports=rate_lamports,
            )
        )
    except ChainIntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "status": "success",
        "data": {
            "signed_transaction": serialized_tx,
            "campaign_pda": campaign_pda,
            "bump": bump,
            "program_id": program_id,
            "campaign_seed": campaign_seed,
        },
    }


@app.post("/campaigns/submit")
def submit_campaign(payload: CampaignSubmit, user=Depends(get_current_user)):
    """
    Submit a signed transaction for campaign creation.
    """
    user_db = get_user_db(user)
    creator_wallet = user["wallet_address"]

    try:
        signature = submit_signed_transaction(payload.signed_transaction)
    except ChainIntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Extract metadata from the submitted data
    metadata = payload.campaign_metadata
    campaign = {
        "creator_id": user["user_id"],
        "title": metadata.get("title"),
        "vault_pda": metadata.get("vault_pda"),
        "chain_campaign_seed": metadata.get("campaign_seed"),
        "chain_program_id": metadata.get("program_id"),
        "chain_tx_signature": signature,
        "chain_cluster": metadata.get("cluster", "devnet"),
        "chain_status": "active",
        "source_vod_url": metadata.get("source_vod_url"),
        "thumbnail_url": metadata.get("thumbnail_url"),
        "reward_rate": metadata.get("reward_rate"),
        "total_budget": metadata.get("total_budget"),
        "social_targets": metadata.get("social_targets", []),
        "ai_rules": metadata.get("ai_rules", {}),
        "soft_rules": metadata.get("soft_rules"),
        "status": "active",
    }
    response = user_db.table("campaigns").insert(campaign).execute()
    return {"status": "success", "data": response.data}


@app.post("/campaigns")
def create_campaign(payload: CampaignCreate, user=Depends(get_current_user)):
    user_db = get_user_db(user)
    creator_wallet = user["wallet_address"]

    if payload.reward_rate <= 0 or payload.total_budget <= 0:
        raise HTTPException(
            status_code=400, detail="Budget and reward rate must be greater than zero"
        )

    campaign_seed = generate_campaign_seed()
    budget_lamports = sol_to_lamports(payload.total_budget)
    rate_lamports = sol_to_lamports(payload.reward_rate)

    try:
        chain_tx = send_initialize_campaign(
            creator_wallet=creator_wallet,
            seed=campaign_seed,
            budget_lamports=budget_lamports,
            rate_per_1k_lamports=rate_lamports,
        )
    except ChainIntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    campaign = {
        "creator_id": user["user_id"],
        "title": payload.title,
        "vault_pda": chain_tx.campaign_pda,
        "chain_campaign_seed": campaign_seed,
        "chain_program_id": chain_tx.program_id,
        "chain_tx_signature": chain_tx.signature,
        "chain_cluster": chain_tx.cluster,
        "chain_status": "active",
        "source_vod_url": payload.source_vod_url,
        "thumbnail_url": payload.thumbnail_url,
        "reward_rate": payload.reward_rate,
        "total_budget": payload.total_budget,
        "social_targets": payload.social_targets,
        "ai_rules": payload.ai_rules,
        "soft_rules": payload.soft_rules,
        "status": "active",
    }
    response = user_db.table("campaigns").insert(campaign).execute()
    return {"status": "success", "data": response.data}


@app.get("/campaigns")
def list_campaigns(status: Optional[str] = None):
    query = db.table("campaigns").select("*")
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return {"status": "success", "data": response.data}


@app.post("/campaigns/{campaign_id}/join")
def join_campaign(campaign_id: str, user=Depends(get_current_user)):
    user_db = get_user_db(user)

    # Check if campaign exists
    campaign_response = (
        user_db.table("campaigns").select("id").eq("id", campaign_id).single().execute()
    )
    if not campaign_response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    participant_payload = {"campaign_id": campaign_id, "clipper_id": user["user_id"]}

    try:
        response = (
            user_db.table("campaign_participants")
            .upsert(participant_payload, on_conflict="campaign_id,clipper_id")
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to join campaign: {str(exc)}"
        )


@app.get("/me/joined-campaigns")
def get_joined_campaigns(user=Depends(get_current_user)):
    user_db = get_user_db(user)

    # Get campaign IDs from participants table
    participants_response = (
        user_db.table("campaign_participants")
        .select("campaign_id")
        .eq("clipper_id", user["user_id"])
        .execute()
    )
    campaign_ids = [p["campaign_id"] for p in (participants_response.data or [])]

    if not campaign_ids:
        return {"status": "success", "data": []}

    # Get full campaign details
    campaigns_response = (
        user_db.table("campaigns").select("*").in_("id", campaign_ids).execute()
    )
    return {"status": "success", "data": campaigns_response.data or []}


@app.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id: str):
    response = (
        db.table("campaigns").select("*").eq("id", campaign_id).single().execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "success", "data": response.data}


@app.get("/clips/{clip_id}")
def get_clip(clip_id: str, user=Depends(get_current_user)):
    user_db = get_user_db(user)
    clip_response = (
        user_db.table("clips").select("*").eq("id", clip_id).single().execute()
    )
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = clip_response.data
    if clip.get("clipper_id") != user["user_id"]:
        campaign_response = (
            user_db.table("campaigns")
            .select("creator_id")
            .eq("id", clip["campaign_id"])
            .single()
            .execute()
        )
        if (
            not campaign_response.data
            or campaign_response.data["creator_id"] != user["user_id"]
        ):
            raise HTTPException(
                status_code=403, detail="Not authorized to view this clip"
            )

    snapshots_response = (
        user_db.table("view_snapshots")
        .select("*")
        .eq("clip_id", clip_id)
        .order("captured_at", desc=True)
        .limit(5)
        .execute()
    )
    payouts_response = (
        user_db.table("payouts").select("*").eq("clip_id", clip_id).execute()
    )
    dispute_response = (
        user_db.table("disputes").select("*").eq("clip_id", clip_id).execute()
    )

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
def submit_clip(
    submission: ClipSubmission,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    user_db = get_user_db(user)
    campaign_response = (
        user_db.table("campaigns")
        .select("id, source_vod_url")
        .eq("id", submission.campaign_id)
        .single()
        .execute()
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
    clip_response = user_db.table("clips").insert(clip_payload).execute()
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
    clip_response = (
        db.table("clips")
        .select("id, campaign_id")
        .eq("id", payload.clip_id)
        .single()
        .execute()
    )
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    campaign_response = (
        db.table("campaigns")
        .select("id, creator_id")
        .eq("id", clip_response.data["campaign_id"])
        .single()
        .execute()
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
def resolve_dispute(
    clip_id: str, payload: DisputeResolve, user=Depends(get_current_user)
):
    dispute_response = (
        db.table("disputes").select("clip_id").eq("clip_id", clip_id).single().execute()
    )
    if not dispute_response.data:
        raise HTTPException(status_code=404, detail="Dispute not found")

    clip_response = (
        db.table("clips").select("campaign_id").eq("id", clip_id).single().execute()
    )
    if not clip_response.data:
        raise HTTPException(status_code=404, detail="Clip not found")

    campaign_response = (
        db.table("campaigns")
        .select("creator_id")
        .eq("id", clip_response.data["campaign_id"])
        .single()
        .execute()
    )
    if campaign_response.data["creator_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can resolve")

    verdict = payload.verdict
    if verdict not in {"valid", "fraud"}:
        raise HTTPException(
            status_code=400, detail="Verdict must be 'valid' or 'fraud'"
        )

    db.table("disputes").update({"status": "resolved", "verdict": verdict}).eq(
        "clip_id", clip_id
    ).execute()
    next_status = "tracking" if verdict == "valid" else "disputed"
    db.table("clips").update({"status": next_status}).eq("id", clip_id).execute()

    return {"status": "success", "message": "Dispute resolved"}
