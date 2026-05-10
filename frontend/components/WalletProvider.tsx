"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { apiUrl, authHeaders } from "@/lib/backend";

type SupabaseAuthContextValue = {
  session: Session | null;
  user: User | null;
  walletAddress: string | null;
  accessToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

function extractWalletAddress(user: User | null) {
  if (!user) return null;

  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const identityData = (user.identities?.[0]?.identity_data ?? {}) as Record<string, unknown>;

  const candidates = [
    userMetadata.wallet_address,
    userMetadata.address,
    userMetadata.public_key,
    userMetadata.publicKey,
    userMetadata.pubkey,
    userMetadata.sub,
    identityData.wallet_address,
    identityData.address,
    identityData.public_key,
    identityData.publicKey,
    identityData.pubkey,
    identityData.sub,
  ];

  const walletAddress = candidates.find((value) => typeof value === "string" && value.length > 0);
  return typeof walletAddress === "string" ? walletAddress : null;
}

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setSession(session);
      })
      .catch((error) => {
        console.error("Failed to read Supabase session:", error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const walletAddress = extractWalletAddress(session?.user ?? null);
  const accessToken = session?.access_token ?? null;
  const user = session?.user ?? null;

  useEffect(() => {
    if (!accessToken || !walletAddress) return;

    let cancelled = false;

    async function ensureProfile() {
      try {
        await fetch(apiUrl("/me"), {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(accessToken, walletAddress),
          },
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to ensure profile:", error);
        }
      }
    }

    ensureProfile();
    return () => {
      cancelled = true;
    };
  }, [accessToken, walletAddress]);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithWeb3({
      chain: "solana",
      statement: "I accept Kern's Terms of Service and sign in with my Solana wallet.",
    });

    if (error) {
      setLoading(false);
      throw error;
    }
  }

  async function signOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      throw error;
    }
  }

  const value = useMemo(
    () => ({ session, user, walletAddress, accessToken, loading, signIn, signOut }),
    [session, user, walletAddress, accessToken, loading]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within AppWalletProvider");
  }

  return context;
}
