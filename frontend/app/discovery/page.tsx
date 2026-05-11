"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Users, CheckCircle2, X } from "lucide-react"
import { SiYoutube, SiTiktok, SiInstagram } from "react-icons/si"
import { PageHeader } from "@/components/page-header"
import { Sidebar } from "@/components/sidebar"
import { apiUrl } from "@/lib/backend"
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton"
import { Reveal, StaggerChildren, StaggerItem } from "@/components/ui/reveal"
import {
  getCampaignsWithCache,
  invalidateCampaignCaches,
} from "@/lib/campaign-cache"

const SOCIAL_ICONS: Record<string, any> = {
  youtube: SiYoutube,
  tiktok: SiTiktok,
  instagram: SiInstagram,
}

type Campaign = {
  id: string
  creator_id: string
  title: string
  vault_pda: string
  source_vod_url?: string | null
  thumbnail_url?: string | null
  reward_rate: number
  total_budget: number
  social_targets?: string[] | null
  status: string
  ai_rules?: Record<string, unknown> | null
  soft_rules?: string | null
  created_at?: string | null
}

export default function DiscoveryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)

  const getEstimatedReach = (campaign: Campaign) => {
    const budget = Number(campaign.total_budget || 0)
    const rate = Number(campaign.reward_rate || 0)
    return rate > 0 ? Math.floor((budget / rate) * 1000).toLocaleString() : "0"
  }

  const formatDate = (value?: string | null) => {
    return value ? new Date(value).toLocaleDateString() : "N/A"
  }

  useEffect(() => {
    let active = true

    async function loadCampaigns() {
      setLoading(true)
      try {
        const cached = await getCampaignsWithCache(async () => {
          const response = await fetch(apiUrl("/campaigns?status=active"))
          const payload = await response.json()
          return payload?.data ?? []
        })
        if (active) {
          setCampaigns(cached)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCampaigns()

    // Listen for cache invalidation events (when user joins a campaign)
    const handleCacheInvalidate = () => {
      loadCampaigns()
    }

    window.addEventListener("campaignCacheInvalidated", handleCacheInvalidate)

    return () => {
      active = false
      window.removeEventListener(
        "campaignCacheInvalidated",
        handleCacheInvalidate
      )
    }
  }, [])

  return (
    <div className="flex min-h-screen overflow-hidden bg-background font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex h-screen flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-8 py-4">
          <PageHeader
            title="Discovery"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={
              <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
            }
          />
        </div>

        <main className="mx-auto w-full max-w-7xl px-8 py-12">
          <Reveal className="mb-12 flex items-end justify-between gap-4">
            <h2 className="font-serif text-4xl font-medium text-foreground">
              Discover Campaigns
            </h2>
          </Reveal>

          {loading ? (
            <p className="text-muted-foreground">Loading active campaigns...</p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-[32px] border border-border bg-card p-8 text-muted-foreground">
              No active campaigns yet. Create one to start the flow.
            </div>
          ) : (
            <StaggerChildren
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 transition-all duration-300`}
            >
              {campaigns.map((campaign) => {
                const estimatedReach = getEstimatedReach(campaign)

                return (
                  <StaggerItem key={campaign.id}>
                    <Link
                      href={`/campaign/${campaign.id}`}
                      className="group block cursor-pointer overflow-hidden rounded-[32px] border border-border bg-card text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {campaign.thumbnail_url ? (
                          <img
                            src={campaign.thumbnail_url}
                            alt={campaign.title}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/20 to-background transition-transform duration-700 " />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-between p-6">
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-bold tracking-wider text-foreground uppercase backdrop-blur-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {campaign.status}
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-bold tracking-wider text-foreground uppercase backdrop-blur-md">
                              <Users size={12} className="text-primary" />
                              {estimatedReach} Reach
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 p-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          <CheckCircle2 size={12} className="text-primary" />
                          <span className="truncate">{campaign.creator_id}</span>
                        </div>

                        <h3 className="font-serif text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                          {campaign.title}
                        </h3>

                        {campaign.social_targets &&
                          campaign.social_targets.length > 0 && (
                            <div className="flex flex-wrap gap-2.5">
                              {campaign.social_targets.map((target) => {
                                const Icon = SOCIAL_ICONS[target.toLowerCase()]
                                return (
                                  <span
                                    key={target}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                                  >
                                    {Icon && <Icon size={12} />}
                                    {target}
                                  </span>
                                )
                              })}
                            </div>
                          )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                              Reward
                            </p>
                            <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                              {campaign.reward_rate} SOL/1k
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                              Budget
                            </p>
                            <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                              {campaign.total_budget} SOL
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs font-bold text-primary opacity-0 transition-all duration-300 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0">
                            Join Campaign →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                )
              })}
            </StaggerChildren>
          )}
        </main>
      </div>
    </div>
  )
}
