"use client"

import { useEffect, useState } from "react"
import { apiUrl } from "@/lib/backend"
import { Wallet } from "lucide-react"

export function VaultProgressBar({ campaignId }: { campaignId: string }) {
  const [balance, setBalance] = useState<{ budget: number; remaining: number; percentage_used: number } | null>(null)

  useEffect(() => {
    let active = true
    async function fetchBalance() {
      try {
        const res = await fetch(apiUrl(`/campaigns/${campaignId}/vault-balance`))
        const payload = await res.json()
        if (active && payload.status === "success") {
          setBalance(payload.data)
        }
      } catch (err) {
        console.error("Failed to fetch vault balance", err)
      }
    }
    fetchBalance()
    // Poll every 15s to keep it somewhat updated
    const interval = setInterval(fetchBalance, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [campaignId])

  if (!balance) return (
    <div className="w-full space-y-2 pt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground flex items-center gap-1"><Wallet size={12} /> Vault Balance</span>
        <span className="font-mono text-muted-foreground text-[10px]">Loading...</span>
      </div>
      <div className="w-full animate-pulse h-1.5 bg-muted rounded-full overflow-hidden" />
    </div>
  )

  const percentageRemaining = Math.max(0, 100 - balance.percentage_used)

  return (
    <div className="w-full space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest text-[10px]"><Wallet size={12} /> Vault Status</span>
        <span className="font-mono text-foreground font-bold text-[10px]">{balance.remaining.toFixed(2)} SOL</span>
      </div>
      <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-in-out shadow-sm"
          style={{ width: `${percentageRemaining}%` }}
        />
      </div>
    </div>
  )
}
