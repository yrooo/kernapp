"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Buffer } from "buffer"
import { Transaction } from "@solana/web3.js"
import { Sidebar } from "@/components/sidebar"
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton"
import { useSupabaseAuth } from "@/components/WalletProvider"
import { apiUrl, authHeaders } from "@/lib/backend"
import { supabase } from "@/lib/supabase"

export default function CreatorDashboard() {
  const { session, walletAddress } = useSupabaseAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCampaign, setCreatedCampaign] = useState<{
    id: string
    title: string
    vaultPda: string
    chainTxSignature: string
    chainStatus: string
    chainCluster: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null
  )

  // Wizard State
  const [step, setStep] = useState(1)

  // Form State
  const [title, setTitle] = useState("")
  const [targets, setTargets] = useState<string[]>([])
  const [sourceUrl, setSourceUrl] = useState("")

  const [checks, setChecks] = useState({
    face: false,
    audio: false,
    subtitles: false,
    duration: false,
  })
  const [customReq, setCustomReq] = useState("")

  const [budget, setBudget] = useState("")
  const [rate, setRate] = useState("")

  const THUMBNAIL_BUCKET = "campaign-thumbnails"

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(thumbnailFile)
    setThumbnailPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [thumbnailFile])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !walletAddress)
      return toast.warning("Please sign in with Solana first.")

    setIsSubmitting(true)
    setError(null)

    let thumbnailUrl: string | null = null
    if (thumbnailFile) {
      const cleanName = thumbnailFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const storagePath = `${walletAddress}/${Date.now()}-${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from(THUMBNAIL_BUCKET)
        .upload(storagePath, thumbnailFile, {
          upsert: true,
          contentType: thumbnailFile.type,
        })

      if (uploadError) {
        setIsSubmitting(false)
        setError("Failed to upload thumbnail. Please try again.")
        return
      }

      const { data } = supabase.storage
        .from(THUMBNAIL_BUCKET)
        .getPublicUrl(storagePath)
      thumbnailUrl = data?.publicUrl ?? null
    }

    // Step 1: Prepare the unsigned transaction
    const prepareResponse = await fetch(apiUrl("/campaigns/prepare"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(session?.access_token, walletAddress),
      },
      body: JSON.stringify({
        title,
        reward_rate: Number(rate),
        total_budget: Number(budget),
        source_vod_url: sourceUrl,
        thumbnail_url: thumbnailUrl,
        social_targets: targets,
        ai_rules: {
          face_check: checks.face,
          audio_match: checks.audio,
          subtitles: checks.subtitles,
          duration: checks.duration,
        },
        soft_rules: customReq,
      }),
    })

    if (!prepareResponse.ok) {
      const payload = await prepareResponse.json()
      setIsSubmitting(false)
      setError(payload?.detail || "Failed to prepare campaign transaction.")
      return
    }

    const prepareData = await prepareResponse.json()
    const {
      signed_transaction: unsignedTxBase64,
      campaign_pda,
      bump,
      program_id,
      campaign_seed,
    } = prepareData.data

    // Step 2: Sign the transaction with Phantom wallet
    try {
      const phantom = (window as any).solana
      if (!phantom || !phantom.isConnected) {
        throw new Error(
          "Phantom wallet not connected. Please connect your wallet first."
        )
      }

      // Convert base64 to a Transaction and let Phantom sign it
      const txBytes = Uint8Array.from(Buffer.from(unsignedTxBase64, "base64"))
      const transaction = Transaction.from(txBytes)
      const signedTransaction = await phantom.signTransaction(transaction)

      // Some wallet providers mutate the original transaction and return a plain object.
      const serialized =
        signedTransaction && typeof signedTransaction.serialize === "function"
          ? signedTransaction.serialize()
          : transaction.serialize()

      // Serialize the signed transaction back to base64 for the backend
      const signedTxBase64 = Buffer.from(serialized).toString("base64")

      // Step 3: Submit the signed transaction
      const submitResponse = await fetch(apiUrl("/campaigns/submit"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session?.access_token, walletAddress),
        },
        body: JSON.stringify({
          signed_transaction: signedTxBase64,
          campaign_metadata: {
            title,
            reward_rate: Number(rate),
            total_budget: Number(budget),
            source_vod_url: sourceUrl,
            thumbnail_url: thumbnailUrl,
            social_targets: targets,
            ai_rules: {
              face_check: checks.face,
              audio_match: checks.audio,
              subtitles: checks.subtitles,
              duration: checks.duration,
            },
            soft_rules: customReq,
            vault_pda: campaign_pda,
            campaign_seed,
            program_id,
            cluster: "devnet",
          },
        }),
      })

      const submitData = await submitResponse.json()
      setIsSubmitting(false)

      if (!submitResponse.ok) {
        setError(submitData?.detail || "Failed to submit campaign.")
        return
      }

      const created = Array.isArray(submitData.data)
        ? submitData.data[0]
        : (submitData.data?.[0] ?? submitData.data)
      setCreatedCampaign({
        id: created?.id ?? "unknown",
        title: created?.title ?? title,
        vaultPda: created?.vault_pda ?? campaign_pda,
        chainTxSignature: created?.chain_tx_signature ?? "pending",
        chainStatus: created?.chain_status ?? "active",
        chainCluster: created?.chain_cluster ?? "devnet",
      })
    } catch (err) {
      setIsSubmitting(false)
      const message =
        err instanceof Error
          ? err.message
          : "Failed to sign transaction with wallet."
      setError(message)
      return
    }
  }

  const toggleTarget = (target: string) => {
    setTargets((prev) =>
      prev.includes(target)
        ? prev.filter((t) => t !== target)
        : [...prev, target]
    )
  }

  const estimatedReach =
    parseFloat(budget) > 0 && parseFloat(rate) > 0
      ? Math.floor(
          (parseFloat(budget) / parseFloat(rate)) * 1000
        ).toLocaleString()
      : "0"

  return (
    <div className="flex min-h-screen overflow-hidden bg-background font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex h-screen flex-1 flex-col overflow-y-auto p-8">
        <PageHeader
          title="Creator"
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          actions={
            <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
          }
        />

        <main className="mx-auto w-full max-w-3xl flex-1">
          <div className="relative mb-12 flex items-center justify-between">
            {/* Step Indicators */}
            <div className="absolute top-1/2 left-0 -z-10 h-0.5 w-full -translate-y-1/2 transform bg-border"></div>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${step >= s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"} font-serif font-medium transition-all`}
              >
                {s}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateCampaign}
            className="rounded-[48px] border border-border bg-card p-8 shadow-sm md:p-12"
          >
            {error && (
              <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {createdCampaign && (
              <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground">
                <p className="font-medium">Campaign created</p>
                <p className="text-muted-foreground">
                  {createdCampaign.title} ·{" "}
                  <span className="font-mono">{createdCampaign.id}</span>
                </p>
                <p className="mt-2 text-xs break-all text-muted-foreground">
                  Vault PDA:{" "}
                  <span className="font-mono text-foreground">
                    {createdCampaign.vaultPda}
                  </span>
                </p>
                <p className="text-xs break-all text-muted-foreground">
                  Chain tx:{" "}
                  <span className="font-mono text-foreground">
                    {createdCampaign.chainTxSignature}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span className="font-mono text-foreground">
                    {createdCampaign.chainStatus}
                  </span>{" "}
                  on{" "}
                  <span className="font-mono text-foreground">
                    {createdCampaign.chainCluster}
                  </span>
                </p>
                <Link
                  href={`/discovery`}
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  View in discovery
                </Link>
              </div>
            )}
            {step === 1 && (
              <div className="animate-in space-y-8 duration-500 fade-in slide-in-from-bottom-4">
                <div>
                  <h2 className="mb-2 font-serif text-3xl text-foreground">
                    Step 1: Define Your Campaign
                  </h2>
                  <p className="font-serif font-light text-muted-foreground">
                    Define the core identity of your campaign.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                      Campaign Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-4 font-serif text-xl text-foreground transition-all outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., The Podcast Launch Program"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                      Social Targets
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "YouTube", value: "youtube" },
                        { label: "Instagram", value: "instagram" },
                        { label: "TikTok", value: "tiktok" },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleTarget(value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${targets.includes(value) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                      Source Material (URL)
                    </label>
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-foreground transition-all outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://youtube.com/..."
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                      Campaign Thumbnail
                    </label>
                    <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setThumbnailFile(e.target.files?.[0] ?? null)
                        }
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      {thumbnailPreviewUrl && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                          <img
                            src={thumbnailPreviewUrl}
                            alt="Campaign thumbnail preview"
                            className="h-48 w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Recommended: 4:3 or 16:9. This image appears on the
                      discovery card.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 rounded-full bg-foreground px-8 py-3 font-medium text-background transition-all hover:scale-[1.02]"
                  >
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in space-y-8 duration-500 fade-in slide-in-from-bottom-4">
                <div>
                  <h2 className="mb-2 font-serif text-3xl text-foreground">
                    Step 2: Set Your Rules
                  </h2>
                  <p className="font-serif font-light text-muted-foreground">
                    Establish AI-verified hard rules and human-reviewed creative
                    guidelines.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-4 block font-serif text-sm font-light text-muted-foreground">
                      Hard Rules (AI-Verified)
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        {
                          id: "face",
                          label: "Face Recognition",
                          desc: "Creator's face must be visible",
                        },
                        {
                          id: "audio",
                          label: "Audio Match",
                          desc: "Must use original source audio",
                        },
                        {
                          id: "subtitles",
                          label: "Subtitles",
                          desc: "AI checks for text overlays",
                        },
                        {
                          id: "duration",
                          label: "Min. Duration",
                          desc: "Must be at least 15 seconds",
                        },
                      ].map((check) => (
                        <div
                          key={check.id}
                          onClick={() =>
                            setChecks((prev) => ({
                              ...prev,
                              [check.id]:
                                !prev[check.id as keyof typeof checks],
                            }))
                          }
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${checks[check.id as keyof typeof checks] ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}
                        >
                          <div className="mt-0.5">
                            {checks[check.id as keyof typeof checks] ? (
                              <CheckCircle2
                                className="text-primary"
                                size={20}
                              />
                            ) : (
                              <Circle
                                className="text-muted-foreground"
                                size={20}
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {check.label}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {check.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                      Soft Style (Human-Verified Guidelines)
                    </label>
                    <textarea
                      value={customReq}
                      onChange={(e) => setCustomReq(e.target.value)}
                      className="min-h-[120px] w-full resize-y rounded-2xl border border-border bg-background px-4 py-4 text-foreground transition-all outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g., Don't use swearing, Must use my brand colors..."
                    />
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Custom requirements may require manual review/dispute
                      resolution. Standardized checks are paid instantly by AI.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-3 font-medium text-muted-foreground transition-all hover:text-foreground"
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 rounded-full bg-foreground px-8 py-3 font-medium text-background transition-all hover:scale-[1.02]"
                  >
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in space-y-8 duration-500 fade-in slide-in-from-bottom-4">
                <div>
                  <h2 className="mb-2 font-serif text-3xl text-foreground">
                    Step 3: Fund Your Campaign
                  </h2>
                  <p className="font-serif font-light text-muted-foreground">
                    Fund the vault and set your reward rate.
                  </p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                        Campaign Budget (SOL)
                      </label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full border-b-2 border-border bg-background px-2 py-2 font-serif text-5xl text-foreground transition-all outline-none focus:border-primary"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-serif text-sm font-light text-muted-foreground">
                        Reward Rate (SOL / 1k views)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full border-b-2 border-border bg-background px-2 py-2 font-serif text-5xl text-foreground transition-all outline-none focus:border-primary"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* The Live Math & Trust Signal */}
                  <div className="rounded-3xl border border-border bg-secondary/30 p-6">
                    <h3 className="mb-2 font-serif text-lg">Estimated Reach</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      With{" "}
                      <strong className="text-foreground">
                        {budget || "0"} SOL
                      </strong>{" "}
                      and a{" "}
                      <strong className="text-foreground">
                        {rate || "0"} SOL/1k
                      </strong>{" "}
                      rate, you are funding approximately:
                    </p>
                    <div className="mb-4 font-serif text-4xl text-primary">
                      {estimatedReach} views
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">
                          Clipper Visibility:
                        </strong>{" "}
                        Based on your rules, 452 verified clippers in our
                        network are eligible for this campaign. Average payout
                        time: 48.2 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-4 py-3 font-medium text-muted-foreground transition-all hover:text-foreground"
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Launching..." : "Deposit & Launch Vault"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  )
}
