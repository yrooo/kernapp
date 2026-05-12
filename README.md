# Kern: The Gold Standard of Content Distribution

**Kern** is a decentralized "Clip-to-Earn" management protocol that automates the relationship between content creators and their distribution networks. By using AI as a trustless oracle and Solana as a secure settlement layer, Kern removes the need for manual review and guarantees fairness for both creators and clippers.

## 🌟 Overview

In the modern creator economy, scaling reach across TikTok, Reels, and Shorts is a massive bottleneck. Creators lack the time to manage hundreds of clippers, and clippers fear not being paid for their viral performance.

**Kern solves this by providing:**
- **Automated Verification**: AI agents verify content originality (face/audio matching) and engagement metrics.
- **On-Chain Escrow**: Creators deposit funds into secure Solana Program Derived Addresses (PDAs).
- **Trustless Payouts**: Once verified by the AI Oracle, funds are released instantly and mathematically to the clipper.

## 🏗️ Architecture

The platform is split into two main components:

### [Frontend](./frontend)
- **Next.js & Tailwind CSS**: A premium, "Financial Terminal" style dashboard.
- **Phantom Wallet Integration**: Secure on-chain transaction signing.
- **Supabase**: Real-time tracking and user authentication.

### [Backend](./backend)
- **FastAPI (Python)**: High-performance logic layer.
- **AI Oracle**: Integration with Gemini, Whisper, and InsightFace for content validation.
- **Solana Integration**: Handles campaign creation, vault management, and automated settlements.

## 💰 Business Model

Kern operates on a transactional **Service Fee** model:
1. **Setup Fee (2%)**: Paid by Creators to cover AI indexing and platform setup.
2. **Performance Fee (3-5%)**: Deducted from successful clipper payouts for platform usage.
3. **Early Exit Fee (5-7%)**: A penalty for creators terminating campaigns early, protecting clippers from malicious fund withdrawals.

## 🎯 For Judges: Access Instructions

Simply **connect your Phantom wallet to Solana Devnet** and you're ready to go. The platform will guide you through:
- Creating or exploring campaigns
- Submitting clips for verification
- Viewing real-time AI validation and on-chain settlements

No additional setup required—all smart contracts and backend services are live on devnet.

## 🚀 Getting Started

### Quick Start
1. **Setup Backend**: Follow the instructions in the [Backend README](./backend/README.md).
2. **Setup Frontend**: Follow the instructions in the [Frontend README](./frontend/README.md).

### Deployment
- **Frontend**: Optimized for [Vercel](https://vercel.com).
- **Backend**: Suitable for Vercel (serverless)
- **Database**: Designed for [Supabase](https://supabase.com).

---

Built for the **Frontier Hackathon**. Kern is turning content distribution into a scalable, trustless financial terminal for the creator economy.
