# Kern Frontend

The premium "Clip-to-Earn" dashboard for Creators and Clippers. Built with Next.js, Tailwind CSS, and Solana integration.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js (v18+)
- [Phantom Wallet](https://phantom.app/) browser extension

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

### Configuration

Edit `.env.local` and provide your Supabase and Backend URLs:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Running Locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## 🏗️ Architecture

- **App Router**: Modern Next.js routing with layouts and loading states.
- **Solana Integration**: Uses `@solana/web3.js` for transaction signing and wallet connection.
- **Supabase Auth**: Wallet-based authentication coupled with Supabase for persistent profiles.
- **Design System**: Custom "Financial Terminal" aesthetic using Tailwind CSS and Serif typography.
- **Real-time Updates**: Polling and Supabase subscriptions for live clip tracking.

## 📁 Project Structure

- `/app`: Main application routes (Discovery, Creator, Campaign Details).
- `/components`: Reusable UI components (Sidebar, PageHeader, VaultProgressBar).
- `/lib`: Helper utilities for backend API calls and Solana logic.
- `/hooks`: Custom React hooks for auth and wallet management.

## 🚢 Deployment

The easiest way to deploy is using **Vercel**:

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Set the environment variables.
4. Deploy!
