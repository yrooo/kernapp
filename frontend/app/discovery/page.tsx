"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function DiscoveryPage() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <header className="mb-12 flex justify-between items-center max-w-5xl mx-auto">
        <h1 onClick={() => window.location.href = "/"} className="text-4xl font-serif font-medium tracking-tight cursor-pointer">Kern. <span className="text-muted-foreground text-2xl">/ Discovery</span></h1>
        <div className="flex items-center gap-6">
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-full !transition-all" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-serif mb-8 text-foreground">Discover Campaigns</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mock Campaign Cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border p-6 rounded-[32px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium text-lg text-foreground">Creator Campaign #{i}</h3>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">Active</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Create clips for our latest product launch. We are looking for engaging, fast-paced content!
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reward Rate:</span>
                    <span className="font-medium text-foreground">0.05 SOL / 1k views</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vault Remaining:</span>
                    <span className="font-medium text-foreground">8.5 / 10 SOL</span>
                  </div>
                </div>
              </div>
              <Link href="/clipper" className="w-full inline-flex h-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors">
                Submit Clip
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
