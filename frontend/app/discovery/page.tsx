"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Sidebar } from "@/components/sidebar";
import { apiUrl } from "@/lib/backend";
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton";

type Campaign = {
  id: string;
  creator_id: string;
  title: string;
  vault_pda: string;
  source_vod_url?: string | null;
  thumbnail_url?: string | null;
  reward_rate: number;
  total_budget: number;
  social_targets?: string[] | null;
  status: string;
  ai_rules?: Record<string, unknown> | null;
  soft_rules?: string | null;
  created_at?: string | null;
};

export default function DiscoveryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const getEstimatedReach = (campaign: Campaign) => {
    const budget = Number(campaign.total_budget || 0);
    const rate = Number(campaign.reward_rate || 0);
    return rate > 0 ? Math.floor((budget / rate) * 1000).toLocaleString() : "0";
  };

  const formatDate = (value?: string | null) => {
    return value ? new Date(value).toLocaleDateString() : "N/A";
  };

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      setLoading(true);
      try {
        const response = await fetch(apiUrl("/campaigns?status=active"));
        const payload = await response.json();
        if (active) {
          setCampaigns(payload?.data ?? []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCampaigns();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <PageHeader
          title="Discovery"
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
        />

        <main className="max-w-7xl mx-auto w-full">
          <div className="flex items-end justify-between gap-4 mb-8">
            <h2 className="text-3xl font-serif text-foreground">Discover Campaigns</h2>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading active campaigns...</p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-[32px] border border-border bg-card p-8 text-muted-foreground">
              No active campaigns yet. Create one to start the flow.
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isSidebarOpen ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6 transition-all duration-300`}>
              {campaigns.map((campaign) => {
                const estimatedReach = getEstimatedReach(campaign);

                return (
                  <Link
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    className="bg-card border border-border rounded-[24px] overflow-hidden group hover:border-primary/30 transition-all shadow-sm block cursor-pointer text-left"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {campaign.thumbnail_url ? (
                        <img
                          src={campaign.thumbnail_url}
                          alt={campaign.title}
                          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/40 to-background group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                      <div className="absolute inset-0 p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                            <CheckCircle2 size={12} className="text-primary" />
                            {campaign.status}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                            <Users size={12} className="text-primary" />
                            {estimatedReach} est. reach
                          </div>
                        </div>

                        <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Vault</p>
                          <p className="font-mono text-xs text-foreground break-all">{campaign.vault_pda}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <CheckCircle2 size={12} className="text-primary" />
                        <span className="truncate">{campaign.creator_id}</span>
                      </div>

                      <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors leading-tight">{campaign.title}</h3>

                      {campaign.social_targets && campaign.social_targets.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {campaign.social_targets.map((target) => (
                            <span key={target} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {target}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-border p-3">
                          <p className="text-muted-foreground text-xs">Reward rate</p>
                          <p className="font-medium text-foreground">{campaign.reward_rate} SOL / 1k</p>
                        </div>
                        <div className="rounded-2xl border border-border p-3">
                          <p className="text-muted-foreground text-xs">Budget</p>
                          <p className="font-medium text-foreground">{campaign.total_budget} SOL</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Details →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
