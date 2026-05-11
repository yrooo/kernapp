"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { SiYoutube, SiTiktok, SiInstagram } from "react-icons/si"
import { HiCheckCircle, HiX } from "react-icons/hi"
import { apiUrl, authHeaders } from "@/lib/backend"
import { useSupabaseAuth } from "@/components/WalletProvider"

const PROVIDERS = [
  { 
    id: "youtube", 
    label: "YouTube", 
    icon: SiYoutube, 
    color: "group-hover:text-[#FF0000]",
    bgColor: "group-hover:bg-[#FF0000]/10"
  },
  { 
    id: "tiktok", 
    label: "TikTok", 
    icon: SiTiktok, 
    color: "group-hover:text-[#000000] dark:group-hover:text-white",
    bgColor: "group-hover:bg-black/10 dark:group-hover:bg-white/10"
  },
  { 
    id: "instagram", 
    label: "Instagram", 
    icon: SiInstagram, 
    color: "group-hover:text-[#E4405F]",
    bgColor: "group-hover:bg-[#E4405F]/10"
  },
] as const

type ProviderId = (typeof PROVIDERS)[number]["id"]

type SocialAccount = {
  provider: ProviderId
  provider_user_id?: string | null
  provider_username?: string | null
  scope?: string | null
  expires_at?: string | null
  updated_at?: string | null
}

type SocialLinkButtonsProps = {
  className?: string
}

export function SocialLinkButtons({ className }: SocialLinkButtonsProps) {
  const { session, walletAddress } = useSupabaseAuth()
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<SocialAccount[]>([])

  const fetchLinkedAccounts = async (accessToken: string, wallet: string) => {
    try {
      const response = await fetch(apiUrl("/me/social-accounts"), {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(accessToken, wallet),
        },
      })

      const contentType = response.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { detail: await response.text() }

      if (!response.ok) {
        throw new Error(payload?.detail || "Failed to load social accounts.")
      }

      return payload?.data ?? []
    } catch (err) {
      console.error("Error fetching social accounts:", err)
      return []
    }
  }

  useEffect(() => {
    if (!session || !walletAddress) return

    const accessToken = session.access_token
    let active = true

    fetchLinkedAccounts(accessToken, walletAddress)
      .then((accounts) => {
        if (active) {
          setLinkedAccounts(accounts)
        }
      })

    return () => {
      active = false
    }
  }, [session, walletAddress])

  const linkedByProvider = useMemo(() => {
    const mapping: Record<ProviderId, SocialAccount> = {} as Record<
      ProviderId,
      SocialAccount
    >
    linkedAccounts.forEach((account) => {
      mapping[account.provider] = account
    })
    return mapping
  }, [linkedAccounts])

  const handleLink = async (provider: ProviderId) => {
    if (!session || !walletAddress) {
      toast.warning("Please sign in with Solana first.")
      return
    }

    setLoadingProvider(provider)
    setError(null)

    try {
      const response = await fetch(apiUrl("/me/link-social/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.access_token, walletAddress),
        },
        body: JSON.stringify({
          provider,
          redirect_url: window.location.href,
        }),
      })

      const contentType = response.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { detail: await response.text() }
      if (!response.ok) {
        setError(payload?.detail || "Failed to start social link.")
        return
      }

      if (!payload?.auth_url) {
        setError("No auth URL returned from backend.")
        return
      }

      if (payload?.demo_mode) {
        const accounts = await fetchLinkedAccounts(
          session.access_token,
          walletAddress
        )
        setLinkedAccounts(accounts)
        setLoadingProvider(null)
        setSuccess(
          `Successfully linked ${provider.toUpperCase()} account! (Demo Mode)`
        )
        setTimeout(() => setSuccess(null), 3000)
        return
      }

      window.location.href = payload.auth_url
    } catch (err) {
      console.error(err)
      setError("Failed to start social link.")
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleDisconnect = async (provider: ProviderId) => {
    if (!session || !walletAddress) {
      toast.warning("Please sign in with Solana first.")
      return
    }

    setLoadingProvider(provider)
    setError(null)

    try {
      const response = await fetch(apiUrl(`/me/social-accounts/${provider}`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.access_token, walletAddress),
        },
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || ""
        const payload = contentType.includes("application/json")
          ? await response.json()
          : { detail: await response.text() }
        setError(payload?.detail || "Failed to disconnect account.")
        return
      }

      const accounts = await fetchLinkedAccounts(
        session.access_token,
        walletAddress
      )
      setLinkedAccounts(accounts)
    } catch (err) {
      console.error(err)
      setError("Failed to disconnect account.")
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className={className}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const linkedAccount = linkedByProvider[provider.id]
          const displayName =
            linkedAccount?.provider_username || linkedAccount?.provider_user_id

          return (
            <div
              key={provider.id}
              className="group relative flex flex-col items-start rounded-[24px] border border-border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-5 flex w-full items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 transition-all ${provider.bgColor} ${provider.color}`}>
                  <provider.icon size={24} />
                </div>
                {linkedAccount ? (
                  <HiCheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-muted" />
                )}
              </div>
              
              <h3 className="font-serif text-xl font-medium text-foreground">{provider.label}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {linkedAccount ? (
                  <span className="font-medium text-foreground">Linked as {displayName || "user"}</span>
                ) : (
                  `Connect your ${provider.label} account to start.`
                )}
              </p>

              <div className="mt-8 flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => handleLink(provider.id)}
                  disabled={loadingProvider === provider.id}
                  className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loadingProvider === provider.id
                    ? "Linking..."
                    : linkedAccount
                      ? "Reconnect"
                      : "Link Account"}
                </button>
                {linkedAccount && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={loadingProvider === provider.id}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-destructive hover:text-destructive hover:bg-destructive/5"
                    title="Disconnect"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {success && (
        <p className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/50">
          {success}
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50">
          {error}
        </p>
      )}
    </div>
  )
}
