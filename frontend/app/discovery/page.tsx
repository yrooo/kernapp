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
  expires_at?: string | null;
  ai_rules?: Record<string, unknown> | null;
  soft_rules?: string | null;
  created_at?: string | null;
};

export default function DiscoveryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const getEstimatedReach = (campaign: Campaign) => {
    const budget = Number(campaign.total_budget || 0);
    const rate = Number(campaign.reward_rate || 0);
    return rate > 0 ? Math.floor((budget / rate) * 1000).toLocaleString() : "0";
  };

  const formatDate = (value?: string | null) => {
    return value ? new Date(value).toLocaleDateString() : "N/A";
  };

  const formatRuleLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatRuleValue = (value: unknown) => {
    if (typeof value === "boolean") {
      return value ? "Required" : "Optional";
    }
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }
    return String(value);
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
            {/* <Link href="/creator" className="text-sm font-medium text-primary hover:underline">
              Create a campaign
            </Link> */}
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
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setActiveCampaign(campaign)}
                    className="bg-card border border-border rounded-[24px] overflow-hidden group hover:border-primary/30 transition-all shadow-sm block cursor-pointer text-left"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {campaign.thumbnail_url ? (
                        <img
                          src={campaign.thumbnail_url}
                          alt={campaign.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/40 to-background" />
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

                        <div className="space-y-2">
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

                      <h3 className="font-serif text-lg text-foreground leading-tight">{campaign.title}</h3>

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

                      <p className="text-xs text-muted-foreground pt-2">
                        Expires {formatDate(campaign.expires_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {activeCampaign && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setActiveCampaign(null)}
          >
            <div
              className="w-full max-w-5xl rounded-[32px] border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Campaign</p>
                  <h3 className="mt-2 font-serif text-2xl text-foreground">{activeCampaign.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCampaign(null)}
                  className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close campaign details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="rounded-[24px] border border-border overflow-hidden">
                    {activeCampaign.thumbnail_url ? (
                      <img
                        src={activeCampaign.thumbnail_url}
                        alt={activeCampaign.title}
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="h-56 w-full bg-gradient-to-br from-primary/20 via-secondary/40 to-background" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                      <CheckCircle2 size={12} className="text-primary" />
                      {activeCampaign.status}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                      <Users size={12} className="text-primary" />
                      {getEstimatedReach(activeCampaign)} est. reach
                    </span>
                  </div>

                  <div className="rounded-[24px] border border-border bg-muted/20 p-5 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Creator</p>
                      <p className="text-sm font-medium text-foreground break-all">{activeCampaign.creator_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vault</p>
                      <p className="text-xs font-mono text-foreground break-all">{activeCampaign.vault_pda}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Expires</p>
                        <p className="text-foreground">{formatDate(activeCampaign.expires_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reward rate</p>
                        <p className="text-foreground">{activeCampaign.reward_rate} SOL / 1k</p>
                      </div>
                    </div>
                    {activeCampaign.created_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-foreground">{formatDate(activeCampaign.created_at)}</p>
                      </div>
                    )}
                  </div>

                  {activeCampaign.source_vod_url && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Source Material</p>
                      <a
                        href={activeCampaign.source_vod_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground hover:border-primary/50 transition-colors break-all"
                      >
                        {activeCampaign.source_vod_url}
                      </a>
                    </div>
                  )}

                  {activeCampaign.social_targets && activeCampaign.social_targets.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Platforms</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeCampaign.social_targets.map((target) => (
                          <span
                            key={target}
                            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {target}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI Rules</p>
                    <div className="mt-3 grid gap-2">
                      {activeCampaign.ai_rules && Object.keys(activeCampaign.ai_rules).length > 0 ? (
                        Object.entries(activeCampaign.ai_rules).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-2 text-sm">
                            <span className="text-muted-foreground">{formatRuleLabel(key)}</span>
                            <span className="font-medium text-foreground">{formatRuleValue(value)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No AI rules defined.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Soft Rules</p>
                    <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                      {activeCampaign.soft_rules ? activeCampaign.soft_rules : "No soft rules provided."}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">Total budget</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{activeCampaign.total_budget} SOL</p>
                    <div className="mt-4 h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-full rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="mt-2 text-lg font-medium text-foreground capitalize">{activeCampaign.status}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Last updated recently</p>
                  </div>

                  <Link
                    href={`/clipper?campaign_id=${activeCampaign.id}`}
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Join campaign
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
