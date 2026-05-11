"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Sidebar } from "@/components/sidebar";
import { apiUrl } from "@/lib/backend";
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton";
import { supabase } from "@/lib/supabase";

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

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const getEstimatedReach = (c: Campaign) => {
    const budget = Number(c.total_budget || 0);
    const rate = Number(c.reward_rate || 0);
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

  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in to join campaigns.");
        return;
      }

      // 2. Check social accounts
      const socialResponse = await fetch(apiUrl("/me/social-accounts"), {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const socialPayload = await socialResponse.json();
      const connectedProviders = (socialPayload.data || []).map((acc: any) => acc.provider);

      const missingSocials = (campaign.social_targets || []).filter(
        target => !connectedProviders.includes(target.toLowerCase())
      );

      if (missingSocials.length > 0) {
        alert(`To join this campaign, you must first connect your ${missingSocials.join(", ")} account(s) in your profile.`);
        router.push("/profile?alert=connect_socials");
        return;
      }

      // 3. Join campaign
      const joinResponse = await fetch(apiUrl(`/campaigns/${campaign.id}/join`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (joinResponse.ok) {
        alert("Successfully joined the campaign!");
        router.push("/discovery"); // or stay here and update UI
      } else {
        const error = await joinResponse.json();
        alert(`Failed to join: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while joining the campaign.");
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    async function loadCampaign() {
      setLoading(true);
      try {
        const response = await fetch(apiUrl(`/campaigns/${id}`));
        const payload = await response.json();
        setCampaign(payload?.data ?? null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-sans flex overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
          <PageHeader
            title="Campaign Details"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
          />
          <main className="max-w-5xl mx-auto w-full py-12 text-center">
            <p className="text-muted-foreground">Loading campaign details...</p>
          </main>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background font-sans flex overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
          <PageHeader
            title="Campaign Details"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
          />
          <main className="max-w-5xl mx-auto w-full py-12 text-center">
            <h2 className="text-2xl font-serif text-foreground mb-4">Campaign Not Found</h2>
            <Link href="/discovery" className="text-primary hover:underline inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Discovery
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <PageHeader
          title="Campaign Details"
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
        />

        <main className="max-w-5xl mx-auto w-full pb-20">
          <div className="mb-8">
            <Link href="/discovery" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 mb-6">
              <ArrowLeft size={16} /> Back to Discovery
            </Link>
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Campaign</p>
                <h2 className="mt-2 font-serif text-4xl text-foreground">{campaign.title}</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <div className="rounded-[32px] border border-border overflow-hidden bg-card shadow-sm">
                {campaign.thumbnail_url ? (
                  <img
                    src={campaign.thumbnail_url}
                    alt={campaign.title}
                    className="h-96 w-full object-cover"
                  />
                ) : (
                  <div className="h-96 w-full bg-gradient-to-br from-primary/20 via-secondary/40 to-background" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-medium text-foreground">
                  <CheckCircle2 size={14} className="text-primary" />
                  {campaign.status}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-medium text-foreground">
                  <Users size={14} className="text-primary" />
                  {getEstimatedReach(campaign)} est. reach
                </span>
              </div>

              <div className="rounded-[32px] border border-border bg-card p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Creator</p>
                    <p className="text-sm font-medium text-foreground break-all">{campaign.creator_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Vault</p>
                    <p className="text-xs font-mono text-foreground break-all">{campaign.vault_pda}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expires</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(campaign.expires_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reward Rate</p>
                    <p className="text-sm font-medium text-foreground">{campaign.reward_rate} SOL / 1k</p>
                  </div>
                  {campaign.created_at && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                      <p className="text-sm font-medium text-foreground">{formatDate(campaign.created_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {campaign.source_vod_url && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Source Material</p>
                  <a
                    href={campaign.source_vod_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[24px] border border-border bg-card px-6 py-4 text-sm text-foreground hover:border-primary/50 transition-colors break-all shadow-sm"
                  >
                    {campaign.source_vod_url}
                  </a>
                </div>
              )}

              {campaign.social_targets && campaign.social_targets.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.social_targets.map((target) => (
                      <span
                        key={target}
                        className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary border border-primary/20"
                      >
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI Rules</p>
                <div className="grid gap-3">
                  {campaign.ai_rules && Object.keys(campaign.ai_rules).length > 0 ? (
                    Object.entries(campaign.ai_rules).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-[24px] border border-border bg-card px-6 py-3 text-sm shadow-sm">
                        <span className="text-muted-foreground">{formatRuleLabel(key)}</span>
                        <span className="font-medium text-foreground">{formatRuleValue(value)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic px-2">No AI rules defined.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Soft Rules</p>
                <div className="rounded-[24px] border border-border bg-card px-6 py-4 text-sm text-foreground shadow-sm leading-relaxed">
                  {campaign.soft_rules ? campaign.soft_rules : "No soft rules provided."}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-8 space-y-6">
                <div className="rounded-[32px] border border-border bg-card p-8 shadow-sm">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Total budget</p>
                  <p className="mt-3 text-4xl font-semibold text-foreground">{campaign.total_budget} SOL</p>
                  <div className="mt-6 h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-full rounded-full bg-primary" />
                  </div>
                </div>

                <div className="rounded-[32px] border border-border bg-card p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Status</p>
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <p className="text-xl font-medium text-foreground capitalize">{campaign.status}</p>
                  <p className="mt-4 text-xs text-muted-foreground">Active and accepting submissions</p>
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-5 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? "Joining..." : "Join campaign"}
                </button>
                
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    By joining, you agree to the campaign's AI and soft rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
