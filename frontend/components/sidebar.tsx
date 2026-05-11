import Link from "next/link";
import { Compass, PlusCircle, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/backend";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type Campaign = {
  id: string;
  title: string;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchJoinedCampaigns() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setLoading(true);
      try {
        const response = await fetch(apiUrl("/me/joined-campaigns"), {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const payload = await response.json();
        setJoinedCampaigns(payload.data || []);
      } catch (error) {
        console.error("Failed to fetch joined campaigns:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchJoinedCampaigns();

    // Set up auth listener to refresh when user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchJoinedCampaigns();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {/* Sidebar Overlay (Mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isOpen ? "w-72" : "w-0"}
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
        `}
      >
        <div className="w-72 flex flex-col h-full"> {/* Fixed width wrapper to prevent content squishing during animation */}
          <div className="flex items-center justify-between p-8">
            <Link href="/" className="text-2xl font-serif font-bold tracking-tight text-foreground">Kern.</Link>
          </div>

          <nav className="px-4 space-y-2 flex-1">
            <Link
              href="/discovery"
              className="flex items-center gap-3 px-4 py-3 bg-secondary/50 text-foreground rounded-2xl font-medium transition-colors"
            >
              <Compass size={20} className="text-primary" />
              Discovery
            </Link>
            <Link
              href="/creator"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary/30 hover:text-foreground rounded-2xl font-medium transition-colors"
            >
              <PlusCircle size={20} />
              Create Campaign
            </Link>

            {/* Your Campaigns Section */}
            <div className="pt-8 pb-2 px-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your Campaigns</p>
            </div>
            
            <div className="space-y-1 max-h-[300px] overflow-y-auto px-2">
              {loading ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">Loading...</p>
              ) : joinedCampaigns.length > 0 ? (
                joinedCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-secondary/20 hover:text-foreground rounded-xl transition-all group"
                  >
                    <LayoutGrid size={16} className="group-hover:text-primary transition-colors" />
                    <span className="truncate">{campaign.title}</span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-2 text-xs text-muted-foreground italic">No campaigns joined yet.</p>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
