"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { PageHeader } from "@/components/page-header";
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton";
import { useSupabaseAuth } from "@/components/WalletProvider";
import { SocialLinkButtons } from "@/components/social-link-buttons";

export default function ProfilePage() {
  const { walletAddress } = useSupabaseAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <PageHeader
          title="Profile"
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
        />

        <main className="max-w-2xl mx-auto w-full">
          {/* Wallet Info */}
          <div className="rounded-[32px] border border-border bg-card p-6 mb-8">
            <h2 className="text-xl font-serif text-foreground">Wallet</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Connected wallet: <span className="font-mono font-medium text-foreground">{walletAddress}</span>
            </p>
          </div>

          {/* Social Accounts */}
          <div className="rounded-[32px] border border-border bg-card p-6">
            <h2 className="text-xl font-serif text-foreground">Connected Social Accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Link your TikTok, Instagram, or YouTube account to verify ownership for campaigns.
            </p>
            <div className="mt-6">
              <SocialLinkButtons />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
