"use client";

import { useSupabaseAuth } from "@/components/WalletProvider";
import { cn } from "@/lib/utils";

type SupabaseAuthButtonProps = {
  className?: string;
};

export function SupabaseAuthButton({ className }: SupabaseAuthButtonProps) {
  const { session, walletAddress, loading, signIn, signOut } = useSupabaseAuth();

  const label = loading
    ? "Connecting..."
    : session
      ? walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "Connected"
      : "Login with Solana";

  const handleClick = async () => {
    try {
      if (session) {
        await signOut();
        return;
      }

      await signIn();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to authenticate with Solana.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {label}
    </button>
  );
}