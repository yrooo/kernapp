import { CTASection } from "@/components/ui/hero-dithering-card";
import Link from "next/link";
import { ArrowRight } from "lucide-react"


export default function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="w-full flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="font-serif text-3xl font-bold tracking-tight text-foreground">Kern.</div>
        <nav className="flex items-center gap-6">
          <Link href="/discovery" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Discovery</Link>
          <Link href="/creator" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Creator</Link>
          <Link href="/clipper" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Clipper</Link>
          <a href="/creator" className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-12 text-base font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:scale-105 active:scale-95 hover:ring-4 hover:ring-primary/20">
            <span className="relative z-7">Launch App</span>
            <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </nav>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center">
        <CTASection />
      </main>
    </div>
  )
}
