"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { SupabaseAuthButton } from "@/components/SupabaseAuthButton"
import { useSupabaseAuth } from "@/components/WalletProvider"
import { SocialLinkButtons } from "@/components/social-link-buttons"

import { User, Wallet, Share2, BadgeCheck } from "lucide-react"

export default function ProfilePage() {
  const { walletAddress } = useSupabaseAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen overflow-hidden bg-background font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex h-screen flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-8 py-4">
          <PageHeader
            title="Profile"
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            actions={
              <SupabaseAuthButton className="!bg-primary hover:!bg-primary/90" />
            }
          />
        </div>

        <main className="mx-auto w-full max-w-4xl px-8 py-12">
          {/* Profile Hero */}
          <div className="mb-12 flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:text-left">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[40px] bg-primary/10 text-primary border-4 border-background shadow-xl">
              <User className="h-16 w-16" />
            </div>
            <div className="mt-4 md:mt-0">
              <h1 className="font-serif text-4xl font-medium text-foreground md:text-5xl">Your Profile</h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Active User
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
                  Demo Mode Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-12">
              {/* Wallet Info */}
              <div className="rounded-[32px] border border-border bg-card p-10 shadow-sm transition-all hover:shadow-md">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <h2 className="font-serif text-2xl font-medium text-foreground">Wallet Identity</h2>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Connected Wallet Address</p>
                  <p className="mt-2 break-all font-mono text-lg font-medium text-foreground">
                    {walletAddress || "Not Connected"}
                  </p>
                </div>
              </div>

              {/* Social Accounts */}
              <div className="rounded-[32px] border border-border bg-card p-10 shadow-sm transition-all hover:shadow-md">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <h2 className="font-serif text-2xl font-medium text-foreground">Social Verification</h2>
                  </div>
                </div>

                <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
                  Link your social media accounts to verify your reach and eligibility for creator campaigns.
                  Verified accounts unlock higher reward tiers and trust scores.
                </p>

                <SocialLinkButtons className="mt-8" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

