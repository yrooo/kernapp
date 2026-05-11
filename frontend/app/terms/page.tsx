import Link from "next/link";
import { ArrowLeft, Scale, ShieldCheck } from "lucide-react";

import { legalLastUpdated, supportEmail } from "@/lib/site";

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    items: [
      "By accessing Kern, you agree to these Terms of Service and any additional campaign rules shown in the product.",
      "If you use the service on behalf of a team or company, you confirm that you have permission to accept these terms for that entity.",
    ],
  },
  {
    title: "2. What Kern Does",
    items: [
      "Kern is a clip-to-earn platform that helps creators launch campaigns, lets clippers submit work, and uses an AI and blockchain workflow to settle payouts.",
      "The service is currently an alpha / hackathon prototype and may change, pause, or break without notice.",
    ],
  },
  {
    title: "3. Wallets, Accounts, and Eligibility",
    items: [
      "You are responsible for the wallet, email, and social accounts you connect to Kern.",
      "You must provide accurate information and keep your credentials secure.",
      "You may only use the service if you can legally enter into a contract in your jurisdiction.",
    ],
  },
  {
    title: "4. Campaigns, Clips, and Settlement",
    items: [
      "Creators decide the budget, reward logic, and campaign rules for their campaigns.",
      "Clippers are responsible for the clips they submit and for having rights to publish the content.",
      "On-chain payouts are irreversible once they are settled on Solana, and transaction fees may apply.",
    ],
  },
  {
    title: "5. Prohibited Use",
    items: [
      "Do not submit fraudulent content, bot-driven engagement, spam, malware, or illegal material.",
      "Do not attempt to exploit the platform, bypass verification, or interfere with the smart contract, backend, or social account connections.",
      "Do not use Kern to infringe copyright, privacy, or any other rights of another person.",
    ],
  },
  {
    title: "6. Suspension and Termination",
    items: [
      "We may suspend or terminate access if we believe a user is violating these terms or abusing the service.",
      "You may stop using Kern at any time, but any completed blockchain transactions remain final.",
    ],
  },
  {
    title: "7. Disclaimer and Limitation of Liability",
    items: [
      "Kern is provided on an as-is and as-available basis without warranties of any kind.",
      "To the maximum extent allowed by law, Kern is not liable for indirect, incidental, or consequential damages arising from use of the service.",
    ],
  },
];

export const metadata = {
  title: "Terms of Service | Kern",
  description: "Terms of Service for Kern, the clip-to-earn protocol.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 md:px-6">
        <Link href="/" className="inline-flex items-center gap-3 text-foreground transition-colors hover:text-primary">
          <span className="font-serif text-3xl font-bold tracking-tight">Kern.</span>
        </Link>
        <Link href="/privacy" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Privacy Policy
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        <section className="rounded-[48px] border border-border bg-card p-8 shadow-sm md:p-12">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[11px] tracking-[0.22em]">
              <Scale className="h-4 w-4 text-primary" />
              Legal
            </span>
            <span>Last updated {legalLastUpdated}</span>
          </div>

          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-medium tracking-tight text-foreground md:text-6xl">
            Terms of Service for Kern
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            These terms explain how the Kern platform works, who is responsible for what, and how campaign payouts are handled across
            the frontend, backend, and Solana settlement layer.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-border bg-background/70 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Project</p>
              <p className="mt-2 text-foreground">Kern</p>
            </div>
            <div className="rounded-[28px] border border-border bg-background/70 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contact</p>
              <a href={`mailto:${supportEmail}`} className="mt-2 block text-foreground transition-colors hover:text-primary">
                {supportEmail}
              </a>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-4">
          {termsSections.map((section) => (
            <section key={section.title} className="rounded-[32px] border border-border bg-card p-7 shadow-sm md:p-8">
              <h2 className="font-serif text-2xl text-foreground">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-[32px] border border-primary/15 bg-primary/5 p-7 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-serif text-2xl text-foreground">Contact and questions</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Questions about these terms or the service can be sent to <a href={`mailto:${supportEmail}`} className="text-foreground underline decoration-primary/50 underline-offset-4">{supportEmail}</a>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                If you need a version for review, replace the contact email with a monitored inbox before submitting the app to Google.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}