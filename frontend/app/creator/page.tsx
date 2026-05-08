"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";

export default function CreatorDashboard() {
  const { publicKey } = useWallet();
  const [budget, setBudget] = useState("");
  const [rate, setRate] = useState("");

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return alert("Please connect your wallet first.");
    
    // Placeholder for calling Solana Anchor Program to initialize_campaign
    console.log("Creating campaign with:", { budget, rate, creator: publicKey.toString() });
    alert("Campaign created on Devnet! (Mock)");
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <header className="mb-12 flex justify-between items-center max-w-5xl mx-auto">
        <h1 className="text-4xl font-serif font-medium tracking-tight">Kern.</h1>
        <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-full !transition-all" />
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <section className="bg-card border border-border p-8 rounded-[48px] shadow-sm">
          <h2 className="text-3xl font-serif mb-6 text-foreground">New Campaign</h2>
          <form onSubmit={handleCreateCampaign} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Total Budget (SOL)</label>
              <input 
                type="number" 
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="e.g. 10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Rate per 1k Views (SOL)</label>
              <input 
                type="number" 
                step="0.001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="e.g. 0.05"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full h-14 bg-primary text-primary-foreground font-medium rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Initialize Vault
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-3xl font-serif mb-6 text-foreground">Active Campaigns</h2>
          {!publicKey ? (
            <p className="text-muted-foreground">Connect wallet to view campaigns.</p>
          ) : (
            <div className="space-y-4">
              {/* Mock active campaign */}
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-lg">Campaign #1</h3>
                    <p className="text-sm text-muted-foreground">Vault: 8.5 / 10 SOL remaining</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Active
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Rate: 0.05 SOL / 1k views
                </div>

                {/* Pending Clips (Optimistic Oracle Challenge Window) */}
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Pending Clips (24h Challenge Window)</h4>
                  <div className="bg-background rounded-xl p-4 flex justify-between items-center border border-border">
                    <div>
                      <p className="text-sm text-foreground font-medium truncate w-40 md:w-56">tiktok.com/@clip/video/1</p>
                      <p className="text-xs text-muted-foreground mt-1">AI Verified • 15,000 views</p>
                    </div>
                    <button 
                      onClick={() => alert("Phantom: Approve transaction to stake 0.1 SOL and halt payout.")} 
                      className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-full text-xs font-medium transition-colors border border-red-500/20"
                    >
                      Dispute (0.1 SOL)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
