"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Users, CheckCircle2, ArrowLeft, Shield, Sparkles, FileText, Layout } from "lucide-react"
import { SiYoutube, SiTiktok, SiInstagram } from "react-icons/si"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Sidebar } from "@/components/sidebar"
import { apiUrl, authHeaders } from "@/lib/backend"
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton"
import { useSupabaseAuth } from "@/components/WalletProvider"
import { supabase } from "@/lib/supabase"
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

    checkJoinStatus()
    return () => { active = false }
  }, [id])

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
                  <div className="mt-8 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-full rounded-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
                  </div>
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

