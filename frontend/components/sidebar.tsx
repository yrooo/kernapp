import Link from "next/link"
import { Compass, PlusCircle, LayoutGrid } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { apiUrl } from "@/lib/backend"
import {
  getJoinedCampaignsWithCache,
  invalidateJoinedCampaignsCache,
} from "@/lib/campaign-cache"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

type Campaign = {
  id: string
  title: string
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJoinedCampaigns() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setUserId(null)
        return
      }

      setUserId(session.user.id)
      setLoading(true)
      try {
        const cached = await getJoinedCampaignsWithCache(
          session.user.id,
          async () => {
            const response = await fetch(apiUrl("/me/joined-campaigns"), {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
            const payload = await response.json()
            return payload.data || []
          }
        )
        setJoinedCampaigns(cached)
      } catch (error) {
        console.error("Failed to fetch joined campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJoinedCampaigns()

    // Listen for cache invalidation (when user joins a campaign)
    const handleCacheInvalidate = () => {
      if (userId) {
        invalidateJoinedCampaignsCache(userId)
        fetchJoinedCampaigns()
      }
    }

    window.addEventListener("campaignCacheInvalidated", handleCacheInvalidate)

    // Set up auth listener to refresh when user changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        fetchJoinedCampaigns()
      }
    })

    return () => {
      window.removeEventListener(
        "campaignCacheInvalidated",
        handleCacheInvalidate
      )
      subscription.unsubscribe()
    }
  }, [userId])

  return (
    <>
      {/* Sidebar Overlay (Mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col overflow-hidden border-r border-border bg-card transition-all duration-300 ease-in-out ${isOpen ? "w-72" : "w-0"} fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto`}
      >
        <div className="flex h-full w-72 flex-col">
          {" "}
          {/* Fixed width wrapper to prevent content squishing during animation */}
          <div className="flex items-center justify-between p-8">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-tight text-foreground"
            >
              Kern.
            </Link>
          </div>
          <nav className="flex-1 space-y-2 px-4">
            <Link
              href="/discovery"
              className="flex items-center gap-3 rounded-2xl bg-secondary/50 px-4 py-3 font-medium text-foreground transition-colors"
            >
              <Compass size={20} className="text-primary" />
              Discovery
            </Link>
            {userId && (
              <Link
                href="/creator"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 font-medium text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-foreground"
              >
                <PlusCircle size={20} />
                Creator
              </Link>
            )}

            {/* Your Campaigns Section */}
            <div className="px-4 pt-8 pb-2">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Joined Campaigns
              </p>
            </div>

            <div className="max-h-[300px] space-y-1 overflow-y-auto px-2">
              {loading ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">
                  Loading...
                </p>
              ) : joinedCampaigns.length > 0 ? (
                joinedCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    className="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary/20 hover:text-foreground"
                  >
                    <LayoutGrid
                      size={16}
                      className="transition-colors group-hover:text-primary"
                    />
                    <span className="truncate">{campaign.title}</span>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-2 text-xs text-muted-foreground italic">
                  No campaigns joined yet.
                </p>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
