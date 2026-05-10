"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, authHeaders } from "@/lib/backend";
import { useSupabaseAuth } from "@/components/WalletProvider";

const PROVIDERS = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

type SocialAccount = {
  provider: ProviderId;
  provider_user_id?: string | null;
  provider_username?: string | null;
  scope?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};

type SocialLinkButtonsProps = {
  className?: string;
};

export function SocialLinkButtons({ className }: SocialLinkButtonsProps) {
  const { session, walletAddress } = useSupabaseAuth();
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<SocialAccount[]>([]);

  const fetchLinkedAccounts = async (accessToken: string, wallet: string) => {
    const response = await fetch(apiUrl("/me/social-accounts"), {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(accessToken, wallet),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { detail: await response.text() };

    if (!response.ok) {
      throw new Error(payload?.detail || "Failed to load social accounts.");
    }

    return payload?.data ?? [];
  };

  useEffect(() => {
    if (!session || !walletAddress) return;

    const accessToken = session.access_token;
    let active = true;

    fetchLinkedAccounts(accessToken, walletAddress)
      .then((accounts) => {
        if (active) {
          setLinkedAccounts(accounts);
        }
      })
      .catch((err) => {
        if (active) {
          console.error(err);
        }
      });

    return () => {
      active = false;
    };
  }, [session, walletAddress]);

  const linkedByProvider = useMemo(() => {
    const mapping: Record<ProviderId, SocialAccount> = {} as Record<ProviderId, SocialAccount>;
    linkedAccounts.forEach((account) => {
      mapping[account.provider] = account;
    });
    return mapping;
  }, [linkedAccounts]);

  const handleLink = async (provider: ProviderId) => {
    if (!session || !walletAddress) {
      alert("Please sign in with Solana first.");
      return;
    }

    setLoadingProvider(provider);
    setError(null);

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
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { detail: await response.text() };
      if (!response.ok) {
        setError(payload?.detail || "Failed to start social link.");
        return;
      }

      if (!payload?.auth_url) {
        setError("No auth URL returned from backend.");
        return;
      }

      window.location.href = payload.auth_url;
    } catch (err) {
      console.error(err);
      setError("Failed to start social link.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDisconnect = async (provider: ProviderId) => {
    if (!session || !walletAddress) {
      alert("Please sign in with Solana first.");
      return;
    }

    setLoadingProvider(provider);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/me/social-accounts/${provider}`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session.access_token, walletAddress),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { detail: await response.text() };

      if (!response.ok) {
        setError(payload?.detail || "Failed to disconnect account.");
        return;
      }

      const accounts = await fetchLinkedAccounts(session.access_token, walletAddress);
      setLinkedAccounts(accounts);
    } catch (err) {
      console.error(err);
      setError("Failed to disconnect account.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {PROVIDERS.map((provider) => {
          const linkedAccount = linkedByProvider[provider.id];
          const displayName = linkedAccount?.provider_username || linkedAccount?.provider_user_id;

          return (
            <div key={provider.id} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLink(provider.id)}
                disabled={loadingProvider === provider.id}
                className="px-4 py-2 rounded-full border text-sm font-medium transition-all bg-background text-foreground border-border hover:border-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingProvider === provider.id
                  ? `Linking ${provider.label}...`
                  : linkedAccount
                    ? `Relink ${provider.label}`
                    : `Link ${provider.label}`}
              </button>
              {linkedAccount && (
                <>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Linked{displayName ? ` as ${displayName}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(provider.id)}
                    disabled={loadingProvider === provider.id}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {session && linkedAccounts.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Linked: {linkedAccounts.map((account) => account.provider).join(", ")}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
