"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Users, CheckCircle2, ArrowLeft, Shield, Sparkles, FileText, Layout, RefreshCw, Clock, XCircle } from "lucide-react"
import { SiYoutube, SiTiktok, SiInstagram } from "react-icons/si"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Sidebar } from "@/components/sidebar"
import { apiUrl, authHeaders } from "@/lib/backend"
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton"
import { useSupabaseAuth } from "@/components/WalletProvider"
import { supabase } from "@/lib/supabase"
import { VaultProgressBar } from "@/components/vault-progress-bar"
import { invalidateCampaignCaches } from "@/lib/campaign-cache"
import { Reveal, StaggerChildren, StaggerItem } from "@/components/ui/reveal"

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

export default function CampaignDetailPage() {
  const { id } = useParams()
  const { walletAddress } = useSupabaseAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  const getEstimatedReach = (c: Campaign) => {
    const budget = Number(c.total_budget || 0)
    const rate = Number(c.reward_rate || 0)
    return rate > 0 ? Math.floor((budget / rate) * 1000).toLocaleString() : "0"
  }

  const formatDate = (value?: string | null) => {
    return value ? new Date(value).toLocaleDateString() : "N/A"
  }

  const formatRuleLabel = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const formatRuleValue = (value: unknown) => {
    if (typeof value === "boolean") {
      return value ? "Required" : "Optional"
    }
    if (value === null || value === undefined || value === "") {
      return "N/A"
    }
    return String(value)
  }

  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [submissionUrl, setSubmissionUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle")
  const [submissionMessage, setSubmissionMessage] = useState("")

  const [myClips, setMyClips] = useState<any[]>([])
  const [withdrawingClipId, setWithdrawingClipId] = useState<string | null>(null)

  const router = useRouter()

  const handleJoin = async () => {
    if (!campaign) {
      toast.error("Campaign data is not available.")
      return
    }
    setIsJoining(true)
    try {
      // 1. Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Please sign in to join campaigns.")
        return
      }

      // 2. Check social accounts
      const socialResponse = await fetch(apiUrl("/me/social-accounts"), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const socialPayload = await socialResponse.json()
      const connectedProviders = (socialPayload.data || []).map((acc: any) =>
        acc.provider.toLowerCase()
      )

      // Convert social_targets to lowercase for comparison
      const normalizedTargets = (campaign.social_targets || []).map((t) =>
        t.toLowerCase()
      )
      const missingSocials = normalizedTargets.filter(
        (target) => !connectedProviders.includes(target)
      )

      if (missingSocials.length > 0) {
        toast.warning(
          `To join this campaign, you must first connect your ${missingSocials.join(", ")} account(s) in your profile.`
        )
        router.push("/profile?alert=connect_socials")
        return
      }

      // 3. Join campaign
      const joinResponse = await fetch(
        apiUrl(`/campaigns/${campaign.id}/join`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (joinResponse.ok) {
        // Invalidate campaign caches so sidebar and discovery page refresh
        invalidateCampaignCaches()
        // Dispatch event to notify other components
        window.dispatchEvent(new Event("campaignCacheInvalidated"))
        toast.success("Successfully joined the campaign!")
        setHasJoined(true)
        setShowSubmissionForm(true)
      } else {
        const error = await joinResponse.json()
        toast.error(`Failed to join: ${error.detail || "Unknown error"}`)
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred while joining the campaign.")
    } finally {
      setIsJoining(false)
    }
  }

  useEffect(() => {
    if (!id) return

    async function loadCampaign() {
      setLoading(true)
      try {
        const response = await fetch(apiUrl(`/campaigns/${id}`))
        const payload = await response.json()
        setCampaign(payload?.data ?? null)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadCampaign()
  }, [id])

  useEffect(() => {
    let active = true
    async function checkJoinStatus() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !id) return

      try {
        const response = await fetch(apiUrl("/me/joined-campaigns"), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const payload = await response.json()
        if (active) {
          const joinedList = payload.data || []
          const joined = joinedList.some((c: any) => c.id === id)
          setHasJoined(joined)
        }
      } catch (error) {
        console.error("Error checking join status:", error)
      }
    }

    async function fetchMyClips() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !id) return

      try {
        const response = await fetch(apiUrl(`/campaigns/${id}/my-clips`), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const payload = await response.json()
        if (active) {
          setMyClips(payload.data || [])
        }
      } catch (error) {
        console.error("Error fetching my clips:", error)
      }
    }

    checkJoinStatus()
    fetchMyClips()

    // Auto-poll clips every 10 seconds to catch status changes
    const interval = setInterval(fetchMyClips, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [id])

  const handleWithdraw = async (clipId: string) => {
    setWithdrawingClipId(clipId)
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const res = await fetch(apiUrl(`/clips/${clipId}/withdraw`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session?.access_token, walletAddress),
        }
      })
      const payload = await res.json()
      if (res.ok) {
        toast.success(payload.message || "Withdrawal successful! Funds transferred.")
        // Update local state to show paid
        setMyClips(prev => prev.map(c => c.id === clipId ? { ...c, status: "paid" } : c))
      } else {
        toast.error(payload.detail || "Withdrawal failed")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred during withdrawal")
    } finally {
      setWithdrawingClipId(null)
    }
  }

  const handleSubmitClip = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !walletAddress) {
      toast.error("Please sign in with Solana first.")
      return
    }

    setIsSubmitting(true)
    setSubmissionStatus("idle")
    setSubmissionMessage("")

    try {
      const res = await fetch(apiUrl("/submit-clip"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.access_token, walletAddress),
        },
        body: JSON.stringify({
          campaign_id: id,
          video_url: submissionUrl,
          platform: "tiktok",
        })
      })

      const payload = await res.json()

      if (res.ok) {
        setSubmissionStatus("success")
        setSubmissionMessage(payload?.data?.message || "Clip submitted successfully!")
        setSubmissionUrl("")
        
        // Refresh clips
        const freshClipsRes = await fetch(apiUrl(`/campaigns/${id}/my-clips`), {
          headers: authHeaders(session.access_token, walletAddress)
        })
        const freshClips = await freshClipsRes.json()
        setMyClips(freshClips.data || [])
        
        setTimeout(() => setShowSubmissionForm(false), 3000)
      } else {
        setSubmissionStatus("error")
        setSubmissionMessage(payload?.detail || "Failed to submit clip.")
      }
    } catch (error) {
      console.error(error)
      setSubmissionStatus("error")
      setSubmissionMessage("Failed to submit clip. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen overflow-hidden bg-background font-sans">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex h-screen flex-1 flex-col overflow-y-auto p-8">
          <PageHeader
            title="Campaign Details"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={
              <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
            }
          />
          <main className="mx-auto w-full max-w-5xl py-12 text-center">
            <p className="text-muted-foreground">Loading campaign details...</p>
          </main>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen overflow-hidden bg-background font-sans">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex h-screen flex-1 flex-col overflow-y-auto p-8">
          <PageHeader
            title="Campaign Details"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={
              <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
            }
          />
          <main className="mx-auto w-full max-w-5xl py-12 text-center">
            <h2 className="mb-4 font-serif text-2xl text-foreground">
              Campaign Not Found
            </h2>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft size={16} /> Back to Discovery
            </Link>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-background font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex h-screen flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-8 py-4">
          <PageHeader
            title="Campaign Details"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={
              <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
            }
          />
        </div>

        <main className="mx-auto w-full max-w-6xl px-8 py-12 pb-24">
          <Reveal className="mb-10">
            <Link
              href="/discovery"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft size={16} /> Back to Discovery
            </Link>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                  Active Campaign
                </p>
                <h2 className="mt-3 font-serif text-5xl font-medium text-foreground md:text-6xl">
                  {campaign.title}
                </h2>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-10">
              <Reveal className="overflow-hidden rounded-[40px] border border-border bg-card shadow-xl">
                {campaign.thumbnail_url ? (
                  <img
                    src={campaign.thumbnail_url}
                    alt={campaign.title}
                    className="h-[450px] w-full object-cover"
                  />
                ) : (
                  <div className="h-[450px] w-full bg-gradient-to-br from-primary/10 via-secondary/20 to-background" />
                )}
              </Reveal>

              <Reveal className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-bold tracking-wider text-foreground uppercase">
                  <CheckCircle2 size={14} className="text-primary" />
                  {campaign.status}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-bold tracking-wider text-foreground uppercase">
                  <Users size={14} className="text-primary" />
                  {getEstimatedReach(campaign)} est. reach
                </span>
              </Reveal>

              <Reveal className="space-y-8 rounded-[40px] border border-border bg-card p-10 shadow-sm">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                      Creator Identity
                    </p>
                    <p className="font-mono text-xs font-medium break-all text-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                      {campaign.creator_id}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                      Campaign Vault
                    </p>
                    <p className="font-mono text-xs break-all text-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                      {campaign.vault_pda}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                      Reward Rate
                    </p>
                    <p className="text-lg font-medium text-foreground">
                      {campaign.reward_rate} <span className="text-xs text-muted-foreground font-normal">SOL / 1k</span>
                    </p>
                  </div>
                  {campaign.created_at && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                        Launch Date
                      </p>
                      <p className="text-lg font-medium text-foreground">
                        {formatDate(campaign.created_at)}
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>

              {campaign.source_vod_url && (
                <div className="space-y-3">
                  <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">
                    Source Material
                  </p>
                  <a
                    href={campaign.source_vod_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[24px] border border-border bg-card px-6 py-4 text-sm break-all text-foreground shadow-sm transition-colors hover:border-primary/50"
                  >
                    {campaign.source_vod_url}
                  </a>
                </div>
              )}

              {campaign.social_targets &&
                campaign.social_targets.length > 0 && (
                  <Reveal className="space-y-5">
                    <div className="flex items-center gap-2">
                      <Layout size={16} className="text-primary" />
                      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                        Target Platforms
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {campaign.social_targets.map((target) => {
                        const Icon = SOCIAL_ICONS[target.toLowerCase()]
                        return (
                          <span
                            key={target}
                            className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/10 px-5 py-2.5 text-xs font-bold tracking-wider text-primary"
                          >
                            {Icon && <Icon size={14} />}
                            {target}
                          </span>
                        )
                      })}
                    </div>
                  </Reveal>
                )}

              <Reveal className="space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    AI Verification Rules
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {campaign.ai_rules &&
                    Object.keys(campaign.ai_rules).length > 0 ? (
                    Object.entries(campaign.ai_rules).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-[24px] border border-border bg-card px-8 py-4 text-sm shadow-sm transition-colors hover:border-primary/30"
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatRuleLabel(key)}
                        </span>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          {formatRuleValue(value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 rounded-[24px] border border-dashed border-border text-sm text-muted-foreground italic text-center">
                      No AI verification rules defined for this campaign.
                    </p>
                  )}
                </div>
              </Reveal>

              <Reveal className="space-y-5">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    Creator Guidelines
                  </p>
                </div>
                <div className="rounded-[32px] border border-border bg-card px-8 py-6 text-base leading-relaxed text-foreground shadow-sm">
                  {campaign.soft_rules
                    ? campaign.soft_rules
                    : "No specific guidelines provided by the creator."}
                </div>
              </Reveal>
            </div>

            <div className="space-y-8">
              <Reveal className="sticky top-12 space-y-8">
                <div className="rounded-[40px] border border-border bg-card p-10 shadow-xl">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    Campaign Budget
                  </p>
                  <p className="mt-4 text-5xl font-bold text-foreground">
                    {campaign.total_budget} <span className="text-xl font-normal text-muted-foreground">SOL</span>
                  </p>
                  <VaultProgressBar campaignId={campaign.id} />
                </div>

                <div className="rounded-[40px] border border-border bg-card p-10 shadow-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Current Status
                    </p>
                    <span className="flex h-3 w-3 items-center justify-center">
                      <span className="absolute h-4 w-4 animate-ping rounded-full bg-primary opacity-20" />
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-primary" />
                    <p className="text-2xl font-medium text-foreground capitalize">
                      {campaign.status}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    This protocol-protected campaign is currently active and verified clippers can submit work.
                  </p>
                </div>

                {hasJoined ? (
                  <div className="space-y-6">
                    <button
                      type="button"
                      onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-6 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:scale-[1.03] hover:bg-primary/90 active:scale-[0.97]"
                    >
                      <Sparkles className="h-5 w-5" />
                      {showSubmissionForm ? "Cancel Submission" : "Submit a Clip"}
                    </button>

                    {showSubmissionForm && (
                      <Reveal className="space-y-4 rounded-[32px] border border-primary/20 bg-primary/5 p-6 transition-all">
                        <div>
                          <label className="mb-2 block text-xs font-bold tracking-wider text-primary uppercase">
                            TikTok Video URL
                          </label>
                          <input
                            type="url"
                            value={submissionUrl}
                            onChange={(e) => setSubmissionUrl(e.target.value)}
                            placeholder="https://www.tiktok.com/@user/video/..."
                            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            required
                          />
                        </div>
                        <button
                          onClick={handleSubmitClip}
                          disabled={isSubmitting || !submissionUrl}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-bold text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                              Submitting...
                            </>
                          ) : (
                            "Confirm Submission"
                          )}
                        </button>
                        {submissionMessage && (
                          <p className={`text-center text-xs font-medium ${submissionStatus === "error" ? "text-red-500" : "text-green-600"}`}>
                            {submissionMessage}
                          </p>
                        )}
                      </Reveal>
                    )}

                    {/* MY SUBMISSIONS */}
                    {myClips.length > 0 && (
                      <div className="mt-12 space-y-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-serif text-2xl text-foreground">My Submissions</h3>
                          <button
                            onClick={async () => {
                              const { data: { session: s } } = await supabase.auth.getSession()
                              if (!s || !id) return
                              const res = await fetch(apiUrl(`/campaigns/${id}/my-clips`), {
                                headers: authHeaders(s.access_token, walletAddress),
                              })
                              const payload = await res.json()
                              setMyClips(payload.data || [])
                              toast.success("Clips refreshed")
                            }}
                            className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-all border border-border"
                          >
                            <RefreshCw size={14} />
                            Refresh
                          </button>
                        </div>
                        <div className="grid gap-4">
                          {myClips.map((clip) => {
                            const isPending = clip.ai_status === "pending"
                            const isVerified = clip.ai_status === "verified" || clip.status === "tracking"
                            const isRejected = clip.ai_status === "rejected"
                            const isPaid = clip.status === "paid"
                            const isDisputed = clip.status === "disputed"
                            
                            // Calculate approximate reward for UI
                            const views = clip.current_views || clip.initial_views || 1000
                            const rate = campaign.reward_rate || 0
                            const estimatedReward = ((views / 1000) * rate).toFixed(3)

                            return (
                              <div key={clip.id} className={`rounded-[24px] border ${isPaid ? "border-green-500/30 bg-green-500/5" : isRejected || isDisputed ? "border-red-500/30 bg-red-500/5" : isPending ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"} p-6 shadow-sm`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                    <a href={clip.video_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline break-all">
                                      {clip.video_url}
                                    </a>
                                    <div className="flex items-center gap-3 mt-2">
                                      {isPending && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 border border-amber-500/20">
                                          <Clock size={10} /> Pending Review
                                        </span>
                                      )}
                                      {isVerified && !isPaid && !isPending && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-600 border border-blue-500/20">
                                          <CheckCircle2 size={10} /> Verified
                                        </span>
                                      )}
                                      {isPaid && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-600 border border-green-500/20">
                                          <CheckCircle2 size={10} /> Paid
                                        </span>
                                      )}
                                      {(isRejected || isDisputed) && !isPaid && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-600 border border-red-500/20">
                                          <XCircle size={10} /> Rejected
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">{views.toLocaleString()} views</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-foreground">{estimatedReward} SOL</p>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Earned</p>
                                    </div>
                                    {isVerified && !isPaid && !isPending && (
                                      <button 
                                        onClick={() => handleWithdraw(clip.id)}
                                        disabled={withdrawingClipId === clip.id || parseFloat(estimatedReward) <= 0}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-4 py-2 rounded-full transition-all disabled:opacity-50"
                                      >
                                        {withdrawingClipId === clip.id ? "Processing..." : "Withdraw Reward"}
                                      </button>
                                    )}
                                    {isPending && (
                                      <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                        <Clock size={12} /> Awaiting review
                                      </span>
                                    )}
                                    {isPaid && (
                                      <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Transferred
                                      </span>
                                    )}
                                    {(isRejected || isDisputed) && !isPaid && (
                                      <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                                        <XCircle size={12} /> Not eligible
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-6 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:scale-[1.03] hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isJoining ? "Processing..." : "Join this campaign"}
                  </button>
                )}

                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    By joining, you agree to the campaign's AI and soft rules.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

