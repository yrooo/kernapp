"use client";

import { useState, useRef, useEffect } from "react";
import { useSupabaseAuth } from "@/components/WalletProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type SupabaseAuthButtonProps = {
  className?: string;
};

export function SupabaseAuthButton({ className }: SupabaseAuthButtonProps) {
  const { session, walletAddress, loading, signIn, signOut } = useSupabaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const label = loading
    ? "Connecting..."
    : session
      ? walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "Connected"
      : "Login with Solana";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to authenticate with Solana.");
    }
  };

  const handleSignOut = async () => {
    try {
      setIsOpen(false);
      await signOut();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to sign out.");
    }
  };

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        Connecting...
      </button>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        Login with Solana
      </button>
    );
  }

  // Connected state - show dropdown
  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90",
          className,
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="p-2">
            <Link
              href="/profile"
              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Open Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}