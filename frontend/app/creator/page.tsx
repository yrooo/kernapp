"use client";

import Link from "next/link";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Menu, CheckCircle2, Circle, ArrowRight, ArrowLeft } from "lucide-react";
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton";
import { useSupabaseAuth } from "@/components/WalletProvider";
import { apiUrl, authHeaders } from "@/lib/backend";

export default function CreatorDashboard() {
  const { session, walletAddress } = useSupabaseAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Wizard State
  const [step, setStep] = useState(1);
  
  // Form State
  const [title, setTitle] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  
  const [checks, setChecks] = useState({
    face: false,
    audio: false,
    subtitles: false,
    duration: false,
  });
  const [customReq, setCustomReq] = useState("");
  
  const [budget, setBudget] = useState("");
  const [rate, setRate] = useState("");
  const [expiry, setExpiry] = useState("");

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !walletAddress) return alert("Please sign in with Solana first.");

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(apiUrl("/campaigns"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(session?.access_token, walletAddress),
      },
      body: JSON.stringify({
        title,
        vault_pda: `vault-${walletAddress.slice(0, 8)}-${Date.now()}`,
        reward_rate: Number(rate),
        total_budget: Number(budget),
        source_vod_url: sourceUrl,
        social_targets: targets,
        ai_rules: {
          face_check: checks.face,
          audio_match: checks.audio,
          subtitles: checks.subtitles,
          duration: checks.duration,
        },
        soft_rules: customReq,
        status: "active",
        expires_at: expiry ? new Date(expiry).toISOString() : null,
      }),
    });

    const payload = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.detail || "Failed to create campaign.");
      return;
    }

    const created = Array.isArray(payload.data) ? payload.data[0] : payload.data?.[0] ?? payload.data;
    setCreatedCampaign({
      id: created?.id ?? payload?.data?.[0]?.id ?? "unknown",
      title: created?.title ?? title,
    });
  };

  const toggleTarget = (target: string) => {
    setTargets(prev => prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]);
  };
  
  const estimatedReach = (parseFloat(budget) > 0 && parseFloat(rate) > 0) 
    ? Math.floor((parseFloat(budget) / parseFloat(rate)) * 1000).toLocaleString()
    : "0";

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <header className="mb-12 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors text-foreground"
            >
              <Menu size={24} />
            </button>
            <span className="font-serif text-muted-foreground text-2xl hidden sm:inline">Creator</span>
          </div>
          <div className="flex items-center gap-6">
            <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
          </div>
        </header>

        <main className="max-w-3xl mx-auto w-full flex-1">
          <div className="flex justify-between items-center mb-12 relative">
            {/* Step Indicators */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10 transform -translate-y-1/2"></div>
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= s ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'} font-serif font-medium transition-all`}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateCampaign} className="bg-card border border-border p-8 md:p-12 rounded-[48px] shadow-sm">
            {error && (
              <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {createdCampaign && (
              <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground">
                <p className="font-medium">Campaign created</p>
                <p className="text-muted-foreground">
                  {createdCampaign.title} · <span className="font-mono">{createdCampaign.id}</span>
                </p>
                <Link href={`/discovery`} className="mt-2 inline-block text-primary hover:underline">
                  View in discovery
                </Link>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-serif mb-2 text-foreground">Step 1: The Thesis</h2>
                  <p className="text-muted-foreground font-light font-serif">Define the core identity of your campaign.</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Campaign Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-serif text-xl" 
                      placeholder="e.g., The Podcast Launch Program"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Social Targets</label>
                    <div className="flex flex-wrap gap-3">
                      {["TikTok", "YouTube Shorts", "Instagram Reels"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTarget(t)}
                          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${targets.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary/50'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Source Material (URL)</label>
                    <input 
                      type="url" 
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      placeholder="https://youtube.com/..."
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button type="button" onClick={() => setStep(2)} className="bg-foreground text-background px-8 py-3 rounded-full font-medium hover:scale-[1.02] transition-all flex items-center gap-2">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div>
                  <h2 className="text-3xl font-serif mb-2 text-foreground">Step 2: The Mandate</h2>
                  <p className="text-muted-foreground font-light font-serif">Establish AI-verified hard rules and human-reviewed creative guidelines.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-4">Hard Rules (AI-Verified)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'face', label: 'Face Recognition', desc: "Creator's face must be visible" },
                        { id: 'audio', label: 'Audio Match', desc: "Must use original source audio" },
                        { id: 'subtitles', label: 'Subtitles', desc: "AI checks for text overlays" },
                        { id: 'duration', label: 'Min. Duration', desc: "Must be at least 15 seconds" },
                      ].map((check) => (
                        <div 
                          key={check.id}
                          onClick={() => setChecks(prev => ({...prev, [check.id]: !prev[check.id as keyof typeof checks]}))}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${checks[check.id as keyof typeof checks] ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                        >
                          <div className="mt-0.5">
                            {checks[check.id as keyof typeof checks] ? <CheckCircle2 className="text-primary" size={20} /> : <Circle className="text-muted-foreground" size={20} />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{check.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{check.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Soft Style (Human-Verified Guidelines)</label>
                    <textarea 
                      value={customReq}
                      onChange={(e) => setCustomReq(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px] resize-y" 
                      placeholder="e.g., Don't use swearing, Must use my brand colors..."
                    />
                    <p className="text-xs text-muted-foreground mt-2 italic">Custom requirements may require manual review/dispute resolution. Standardized checks are paid instantly by AI.</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground px-4 py-3 font-medium transition-all flex items-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="bg-foreground text-background px-8 py-3 rounded-full font-medium hover:scale-[1.02] transition-all flex items-center gap-2">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-serif mb-2 text-foreground">Step 3: The Treasury</h2>
                  <p className="text-muted-foreground font-light font-serif">Fund the vault and set your reward rate.</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Campaign Budget (SOL)</label>
                      <input 
                        type="number" 
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full bg-background border-b-2 border-border px-2 py-2 text-foreground focus:border-primary outline-none transition-all font-serif text-5xl" 
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-serif font-light text-muted-foreground mb-2">Reward Rate (SOL / 1k views)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full bg-background border-b-2 border-border px-2 py-2 text-foreground focus:border-primary outline-none transition-all font-serif text-5xl" 
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-serif font-light text-muted-foreground mb-2">The "Cliff" (Expiry Date)</label>
                    <input 
                      type="date" 
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-sans" 
                      required
                    />
                  </div>
                  
                  {/* The Live Math & Trust Signal */}
                  <div className="bg-secondary/30 border border-border rounded-3xl p-6">
                    <h3 className="font-serif text-lg mb-2">Estimated Reach</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      With <strong className="text-foreground">{budget || "0"} SOL</strong> and a <strong className="text-foreground">{rate || "0"} SOL/1k</strong> rate, you are funding approximately:
                    </p>
                    <div className="text-4xl font-serif text-primary mb-4">{estimatedReach} views</div>
                    
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Clipper Visibility:</strong> Based on your rules, 452 verified clippers in our network are eligible for this campaign. Average payout time: 48.2 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground px-4 py-3 font-medium transition-all flex items-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? "Launching..." : "Deposit & Launch Vault"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
