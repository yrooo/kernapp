# Kern Backend

FastAPI backend for the Kern Clip-to-Earn platform.

## Features

- Campaign management (create, fund, payout)
- Clip submission and verification
- AI oracle for content verification
- Social account linking (YouTube, TikTok, Instagram)
- Solana blockchain integration
- Oracle-based settlement system

## Demo Mode

For hackathon and demo purposes, the backend supports a **Demo Mode** that bypasses real OAuth flows.

### Enable Demo Mode

Set in your `.env`:

```bash
DEMO_AUTH_ENABLED=true
```

### What Demo Mode Does

1. **Fake Social Linking**: Users can "link" social accounts without real OAuth
   - Generates realistic fake usernames like `@creator5F9k2A`
   - Creates fake user IDs
   - No need for Google/TikTok/Instagram API credentials
   - Instant linking (no redirect to OAuth providers)

2. **Simplified Authentication**: Allows wallet-only authentication without Supabase

### Demo Mode Social Linking

When a user clicks "Link YouTube/TikTok/Instagram":
- Backend creates a fake social account with realistic data
- Returns immediately without OAuth redirect
- Shows success message in UI
- Perfect for demos and testing

### Production Mode

Set `DEMO_AUTH_ENABLED=false` and configure:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (for YouTube)
- `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`
- `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` for OAuth state management

## Environment Variables

See `.env.example` for all required variables.

### Required for Production

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BACKEND_PUBLIC_URL=https://your-backend.com
FRONTEND_PUBLIC_URL=https://your-frontend.com
KERN_PROGRAM_ID=your-solana-program-id
KERN_TREASURY_PUBKEY=your-treasury-pubkey
```

## Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run the server
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Campaigns
- `POST /campaigns/prepare` - Prepare unsigned campaign transaction
- `POST /campaigns/submit` - Submit signed campaign transaction
- `GET /campaigns` - List all campaigns
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns/{id}/join` - Join a campaign

### Clips
- `POST /submit-clip` - Submit a clip for verification
- `GET /clips/{id}` - Get clip details

### Profile
- `GET /me` - Get current user profile
- `PATCH /me` - Update profile
- `GET /me/social-accounts` - Get linked social accounts
- `POST /me/link-social/start` - Start social account linking
- `DELETE /me/social-accounts/{provider}` - Unlink social account

### OAuth
- `GET /oauth/callback/{provider}` - OAuth callback (production mode only)

## Deployment

### Vercel
See `vercel.json` for configuration.

### Railway/Render (Recommended)
Better for FastAPI apps with persistent connections.

1. Connect GitHub repo
2. Set root directory to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables
