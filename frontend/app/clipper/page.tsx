"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { PageHeader } from "@/components/page-header";
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton";
import { useSupabaseAuth } from "@/components/WalletProvider";
import { apiUrl, authHeaders } from "@/lib/backend";

type Campaign = {
  id: string;
  title: string;
  reward_rate: number;
  total_budget: number;
  status: string;
  source_vod_url?: string | null;
};

type ClipState = {
  clip?: {
    id: string;
    ai_status: string;
    ai_score: number;
    current_views: number;
    status: string;
    platform: string;
    video_url: string;
  };
  recent_snapshots: Array<{ id: string; views_count: number; delta_views: number; captured_at: string }>;
  payouts: Array<{ id: string; amount_paid: number; tx_hash: string; paid_at: string }>;
  dispute?: { status: string; verdict?: string | null; reason?: string | null } | null;
};

export default function ClipperDashboard() {
  const { session, walletAddress } = useSupabaseAuth();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedClipId, setSelectedClipId] = useState<string>("");
  const [clipState, setClipState] = useState<ClipState | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [pollingError, setPollingError] = useState<string>("");

  useEffect(() => {
    const campaignIdFromQuery = searchParams.get("campaign_id");
    if (campaignIdFromQuery) {
      setSelectedCampaignId(campaignIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      setLoadingCampaigns(true);
      try {
        const response = await fetch(apiUrl("/campaigns?status=active"), {
          headers: authHeaders(session?.access_token, walletAddress),
        });
        const payload = await response.json();
        if (!active) return;
        const loadedCampaigns = payload?.data ?? [];
        setCampaigns(loadedCampaigns);
        if (!selectedCampaignId && loadedCampaigns.length > 0) {
          setSelectedCampaignId(loadedCampaigns[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoadingCampaigns(false);
        }
      }
    }

    loadCampaigns();
    return () => {
      active = false;
    };
  }, [session, walletAddress, selectedCampaignId]);

  useEffect(() => {
    if (!selectedClipId || !session || !walletAddress) return;

    let stopped = false;

    async function pollClip() {
      try {
        const response = await fetch(apiUrl(`/clips/${selectedClipId}`), {
          headers: authHeaders(session?.access_token, walletAddress),
        });
        const payload = await response.json();
        if (!stopped && response.ok) {
          setClipState(payload.data);
          setPollingError("");
        }
      } catch (error) {
        if (!stopped) {
          setPollingError("Lost connection to the backend while polling the clip.");
        }
      }
    }

    pollClip();
    const interval = window.setInterval(pollClip, 2000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [session, walletAddress, selectedClipId]);

  const handleSubmitClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !walletAddress) return alert("Please sign in with Solana first.");
    if (!selectedCampaignId) return alert("Select a campaign first.");

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch(apiUrl("/submit-clip"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.access_token, walletAddress),
        },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          video_url: tiktokUrl,
          platform: "tiktok",
        })
      });

      const payload = await res.json();

      if (res.ok) {
        setStatus("success");
        setSelectedClipId(payload?.data?.clip_id || "");
        setMessage(payload?.data?.message || "Clip submitted.");
        setTiktokUrl("");
      } else {
        setStatus("error");
        setMessage(payload?.detail || "Failed to submit clip.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit clip. Make sure the backend is running.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <PageHeader
          title="Clipper"
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          containerClassName="max-w-5xl"
          actions={<SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />}
        />

        <main className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="bg-card border border-border p-8 rounded-[48px] shadow-sm">
            <h2 className="text-3xl font-serif mb-6 text-foreground">Submit Clip</h2>
            <form onSubmit={handleSubmitClip} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  required
                >
                  <option value="">Select an active campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title} · {campaign.reward_rate} SOL / 1k
                    </option>
                  ))}
                </select>
                {loadingCampaigns && <p className="mt-2 text-xs text-muted-foreground">Loading active campaigns...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">TikTok Video URL</label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="https://www.tiktok.com/@creator/video/123..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting" || campaigns.length === 0}
                className="w-full h-14 bg-primary text-primary-foreground font-medium rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"></span>
                    Analyzing...
                  </>
                ) : status === "success" ? (
                  "Submitted Successfully!"
                ) : (
                  "Submit for Verification"
                )}
              </button>
              {message && (
                <p className="text-sm text-center text-muted-foreground mt-2">
                  {message}
                </p>
              )}
            </form>
          </section>

          <section>
            <h2 className="text-3xl font-serif mb-6 text-foreground">Your Submission Status</h2>
            {!session ? (
              <p className="text-muted-foreground">Sign in with Solana to view your submissions.</p>
            ) : !selectedClipId ? (
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                <p className="text-muted-foreground">Submit a clip to start polling verification and settlement state.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-medium text-lg truncate text-foreground">{clipState?.clip?.video_url || tiktokUrl || "Pending clip"}</h3>
                      <p className="text-sm text-muted-foreground">Clip ID: <span className="font-mono">{selectedClipId}</span></p>
                    </div>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20 uppercase">
                      {clipState?.clip?.ai_status || status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl border border-border p-4">
                      <p className="text-muted-foreground">Current views</p>
                      <p className="text-2xl font-serif text-foreground">{clipState?.clip?.current_views ?? "--"}</p>
                    </div>
                    <div className="rounded-2xl border border-border p-4">
                      <p className="text-muted-foreground">AI score</p>
                      <p className="text-2xl font-serif text-foreground">{clipState?.clip?.ai_score ?? "--"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tracking status</p>
                      <p className="font-medium text-foreground">{clipState?.clip?.status || "tracking"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Platform</p>
                      <p className="font-medium text-foreground">{clipState?.clip?.platform || "tiktok"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Recent snapshots</p>
                    {(clipState?.recent_snapshots || []).slice(0, 3).map((snapshot) => (
                      <div key={snapshot.id} className="flex justify-between rounded-2xl border border-border px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{new Date(snapshot.captured_at).toLocaleString()}</span>
                        <span className="text-foreground">{snapshot.views_count} views · +{snapshot.delta_views}</span>
                      </div>
                    ))}
                    {(clipState?.recent_snapshots || []).length === 0 && <p className="text-sm text-muted-foreground">No snapshots yet.</p>}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Payouts</p>
                    {(clipState?.payouts || []).map((payout) => (
                      <div key={payout.id} className="flex justify-between rounded-2xl border border-border px-4 py-3 text-sm">
                        <span className="text-muted-foreground">{new Date(payout.paid_at).toLocaleString()}</span>
                        <span className="text-foreground">{payout.amount_paid} SOL</span>
                      </div>
                    ))}
                    {(clipState?.payouts || []).length === 0 && <p className="text-sm text-muted-foreground">No payouts yet.</p>}
                  </div>

                  {clipState?.dispute && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                      Dispute status: {clipState.dispute.status}{clipState.dispute.verdict ? ` · ${clipState.dispute.verdict}` : ""}
                    </div>
                  )}

                  {pollingError && <p className="text-sm text-destructive">{pollingError}</p>}
                </div>
              </div>
            )}
          </section>
        </main>
      </div >
    </div >
  );
}
