import Link from "next/link";
import { ArrowRight, BrainCircuit, Clock3, ShieldCheck, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CTASection } from "@/components/ui/hero-dithering-card";
import { supportEmail } from "@/lib/site";

type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type WorkflowStep = {
  label: string;
  title: string;
  description: string;
};

type StackCard = {
  title: string;
  description: string;
};

type ImpactCard = {
  title: string;
  description: string;
};

const featureCards: FeatureCard[] = [
  {
    title: "On-chain campaign vaults",
    description: "Creators lock campaign budgets into Solana PDAs so every payout path is transparent and auditable.",
    icon: ShieldCheck,
  },
  {
    title: "AI verification",
    description: "A Python oracle checks clip originality and engagement data before a submission can settle.",
    icon: BrainCircuit,
  },
  {
    title: "Clipper workflow",
    description: "Clippers discover a campaign, submit a video link, and track the result from a single dashboard.",
    icon: Workflow,
  },
  {
    title: "Challenge window",
    description: "The protocol keeps payouts optimistic until the review period passes, giving creators a final dispute path.",
    icon: Clock3,
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    label: "Step 01",
    title: "Creators fund a campaign",
    description:
      "A creator sets the budget, reward rate, and campaign rules. That money is locked into a vault so the payout logic has real funds to work with.",
  },
  {
    label: "Step 02",
    title: "Clippers submit a video",
    description:
      "Clippers browse active campaigns, upload a clip link, and attach it to the right campaign without back-and-forth negotiation.",
  },
  {
    label: "Step 03",
    title: "The backend verifies the clip",
    description:
      "The FastAPI backend scrapes metadata, runs the AI originality check, and records the verification state for the submission.",
  },
  {
    label: "Step 04",
    title: "Solana settles the result",
    description:
      "If the verification passes and no dispute is raised, the smart contract releases the funds directly to the clipper wallet.",
  },
];

const stackCards: StackCard[] = [
  {
    title: "Frontend",
    description: "Next.js surfaces for discovery, creator campaign setup, and clipper submission and tracking.",
  },
  {
    title: "Backend",
    description: "Python services handle scraping, AI scoring, settlement orchestration, and cron-style automation.",
  },
  {
    title: "Chain",
    description: "Solana Anchor programs keep vaults, campaign PDAs, and payout execution deterministic.",
  },
  {
    title: "Data",
    description: "Supabase stores auth, campaign metadata, profiles, and clip state for the app layer.",
  },
];

const impactCards: ImpactCard[] = [
  {
    title: "Less manual work",
    description: "Campaign setup, verification, and payout tracking collapse into one repeatable flow.",
  },
  {
    title: "Clear incentives",
    description: "Creators protect their budgets while clippers know exactly what gets rewarded.",
  },
  {
    title: "A real business model",
    description: "The protocol can capture a fee, keep vault operations transparent, and scale with usage.",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="w-full flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="font-serif text-3xl font-bold tracking-tight text-foreground">Kern.</div>
        <nav className="flex items-center gap-6">
          <Link
            href="/discovery"
            className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-12 text-base font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:scale-105 active:scale-95 hover:ring-4 hover:ring-primary/20"
          >
            <span className="relative z-10">Launch App</span>
            <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </nav>
      </header>

      <main className="flex-1 pb-20">
        <CTASection />

        <section className="px-4 pb-8 md:px-6">
          <div className="mx-auto max-w-7xl rounded-[48px] border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm md:p-12">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">What we built</p>
              <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-foreground md:text-5xl">
                A clip-to-earn protocol that settles trust automatically.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Kern connects creators, clippers, and an AI oracle inside one flow. Campaign budgets live in on-chain vaults, clips are
                verified off-chain, and payouts move only when the rules are satisfied.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((card) => (
                <div key={card.title} className="rounded-[28px] border border-border bg-background/70 p-6 shadow-sm">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 md:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[48px] border border-border bg-card p-8 shadow-sm md:p-12">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
              <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-foreground md:text-5xl">
                From campaign setup to settlement, the path is explicit.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                We designed the product so creators can fund campaigns, clippers can submit work, and the backend can verify and settle
                without manual coordination.
              </p>
              <div className="mt-8 rounded-[32px] border border-border bg-background/70 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Built around</p>
                <p className="mt-3 text-foreground">
                  A default-to-pay model with a challenge window, so valid clips move quickly and bad submissions can still be disputed.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="rounded-[32px] border border-border bg-card p-6 shadow-sm md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{step.label}</p>
                      <h3 className="mt-1 font-serif text-2xl text-foreground">{step.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 md:px-6">
          <div className="mx-auto max-w-7xl rounded-[48px] bg-foreground px-8 py-10 text-background shadow-xl md:px-12 md:py-12">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-background/70">Why it matters</p>
                <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight md:text-5xl">
                  Kern turns creator operations into a measurable settlement system.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/80">
                  Instead of manually chasing clips, checking views, and negotiating payouts, the protocol codifies the workflow. That
                  gives creators predictable budgets, clippers clearer incentives, and the product a business model built on protocol fees
                  and vault yield.
                </p>
              </div>

              <div className="grid gap-4">
                {impactCards.map((card) => (
                  <div key={card.title} className="rounded-[28px] border border-background/15 bg-background/8 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-background/70">{card.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-background/90">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/discovery"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore campaigns
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/creator"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-background/20 bg-background/5 px-6 py-3 text-sm font-medium text-background transition-all hover:bg-background/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                Build a campaign
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/clipper"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-background/20 bg-background/5 px-6 py-3 text-sm font-medium text-background transition-all hover:bg-background/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start clipping
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="px-4 pb-10 pt-6 md:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              Kern is an alpha clip-to-earn protocol. Public legal pages are available for review and OAuth verification.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
              <a href={`mailto:${supportEmail}`} className="transition-colors hover:text-foreground">
                {supportEmail}
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
