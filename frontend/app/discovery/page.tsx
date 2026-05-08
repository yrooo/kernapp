"use client"

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useState } from "react";
import { Menu, Users, CheckCircle2, PlayCircle } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default function DiscoveryPage() {
  const { publicKey } = useWallet();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const mockCampaigns = [
    { id: 1, creator: "creatorXchange", title: "Wavy Saleen - Ch@n3l", rate: "0.05 SOL", joined: 124, progress: 65, total: "10 SOL", remaining: "3.5 SOL", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop" },
    { id: 2, creator: "Kern Labs", title: "Midnight Sol - Genesis", rate: "0.08 SOL", joined: 89, progress: 40, total: "25 SOL", remaining: "15 SOL", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop" },
    { id: 3, creator: "Solana Foundation", title: "Summer Hackathon 2024", rate: "0.12 SOL", joined: 567, progress: 90, total: "100 SOL", remaining: "10 SOL", image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop" },
    { id: 4, creator: "Alpha Group", title: "Nexus Protocol Launch", rate: "0.04 SOL", joined: 45, progress: 15, total: "5 SOL", remaining: "4.2 SOL", image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <header className="mb-12 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors text-foreground"
            >
              <Menu size={24} />
            </button>
            <span className="font-serif text-muted-foreground text-2xl hidden sm:inline">Discovery</span>
          </div>
          <div className="flex items-center gap-6">
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-full !transition-all" />
          </div>
        </header>

        <main className="max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-serif mb-8 text-foreground">Discover Campaigns</h2>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${isSidebarOpen ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6 transition-all duration-300`}>
            {mockCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-[#0f0f0f] border border-white/5 rounded-[24px] overflow-hidden group hover:border-white/10 transition-all">
                {/* Thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={campaign.image}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                  {/* Social Badges on Image */}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                      <PlayCircle size={14} className="text-white" />
                    </div>
                    <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                      <Users size={14} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* Creator Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                      <CheckCircle2 size={12} className="text-primary" />
                    </div>
                    <span className="text-xs font-medium text-white/60 truncate">{campaign.creator}</span>
                    <CheckCircle2 size={12} className="text-yellow-500 fill-yellow-500/20" />
                    <span className="text-[10px] text-white/30 ml-auto">1h</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-lg text-white leading-tight">{campaign.title}</h3>

                  {/* Budget Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-white">{campaign.remaining}</span>
                      <span className="text-white/40">/ {campaign.total}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${campaign.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <div className="bg-white/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/5">
                        <Users size={12} className="text-white/60" />
                        <span className="text-xs font-medium text-white">{campaign.joined}</span>
                      </div>
                      <div className="bg-primary/10 px-3 py-1.5 rounded-full flex items-center border border-primary/20">
                        <span className="text-xs font-medium text-primary">{campaign.rate}/1K</span>
                      </div>
                    </div>

                    <Link
                      href="/clipper"
                      className="text-[11px] font-bold text-white uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      Join
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
