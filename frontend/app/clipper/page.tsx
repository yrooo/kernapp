"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Menu } from "lucide-react";

export default function ClipperDashboard() {
  const { publicKey } = useWallet();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmitClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return alert("Please connect your wallet first.");

    setStatus("submitting");

    try {
      // Mock API call to Python backend
      const res = await fetch("http://localhost:8000/submit-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: "mock-campaign-uuid",
          clipper_wallet: publicKey.toString(),
          tiktok_url: tiktokUrl
        })
      });

      if (res.ok) {
        setStatus("success");
        setTiktokUrl("");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit clip. Make sure the backend is running.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <header className="mb-12 flex justify-between items-center max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors text-foreground"
            >
              <Menu size={24} />
            </button>
            <span className="font-serif text-muted-foreground text-2xl hidden sm:inline">Clipper</span>
          </div>
          <div className="flex items-center gap-6">
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-full !transition-all" />
          </div>
        </header>

        <main className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="bg-card border border-border p-8 rounded-[48px] shadow-sm">
            <h2 className="text-3xl font-serif mb-6 text-foreground">Submit Clip</h2>
            <form onSubmit={handleSubmitClip} className="space-y-6">
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
                disabled={status === "submitting"}
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
              {status === "success" && (
                <p className="text-sm text-center text-muted-foreground mt-2">
                  The AI Oracle is verifying your clip. Payout will execute after the 24h challenge window.
                </p>
              )}
            </form>
          </section>

          <section>
            <h2 className="text-3xl font-serif mb-6 text-foreground">Your Submissions</h2>
            {!publicKey ? (
              <p className="text-muted-foreground">Connect wallet to view your submissions.</p>
            ) : (
              <div className="space-y-4">
                {/* Mock submission */}
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-lg truncate w-48 text-foreground">tiktok.com/@creator/video/123</h3>
                      <p className="text-sm text-muted-foreground">Submitted 2 hours ago</p>
                    </div>
                    <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-medium border border-yellow-500/20">
                      PENDING ORACLE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Views detected:</span>
                    <span className="font-medium text-foreground">--</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div >
    </div >
  );
}
