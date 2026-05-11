import Link from "next/link";
import { ArrowLeft, Shield, Mail, LockKeyhole } from "lucide-react";

import { legalLastUpdated, supportEmail } from "@/lib/site";

const privacySections = [
  {
    title: "1. Information We Collect",
    items: [
      "Account information you use to sign in, such as wallet-linked identity data and profile details stored in Supabase.",
      "Campaign, clip, payout, and dispute data that you submit or generate while using Kern.",
      "Social account connection data, including provider IDs, usernames, scopes, and token metadata when you link YouTube, Instagram, or TikTok.",
      "Technical information such as logs, timestamps, and device or browser data necessary to keep the service working.",
    ],
  },
  {
    title: "2. How We Use Information",
    items: [
      "Authenticate users and connect wallets or linked social accounts.",
      "Verify clip originality, track campaign activity, and settle payouts.",
      "Protect the service from fraud, spam, and abuse.",
      "Improve the platform, fix bugs, and respond to support requests.",
    ],
  },
  {
    title: "3. Google OAuth and Third-Party Account Data",
    items: [
      "When you connect a YouTube account, Kern requests only the scopes needed for identity and read-only channel access, including openid, email, profile, and youtube.readonly.",
      "We use the returned account data to link the social account to your profile and show connected status inside the app.",
      "If you connect Instagram or TikTok, we may store the corresponding provider ID, username, token metadata, and expiration details so the connection can continue to work.",
    ],
  },
  {
    title: "4. How We Share Information",
    items: [
      "With infrastructure providers such as Supabase that store authentication, profile, and campaign data.",
      "With blockchain networks such as Solana when transactions are submitted on-chain.",
      "With connected platforms and APIs when you authorize Kern to fetch account or profile information.",
      "With service providers or legal authorities when required to operate, protect, or comply with the law.",
    ],
  },
  {
    title: "5. Data Retention and Deletion",
    items: [
      "We keep information as long as your account is active or as needed to provide the service.",
      "On-chain transactions cannot be deleted from the blockchain, even if your off-chain profile is removed.",
      "You can disconnect linked accounts or request deletion by contacting us.",
    ],
  },
  {
    title: "6. Security",
    items: [
      "We use reasonable administrative and technical safeguards, but no system is perfectly secure.",
      "Please keep your wallet, connected accounts, and sign-in methods secure.",
    ],
  },
  {
    title: "7. Children’s Privacy",
    items: [
      "Kern is not intended for children under 13, and you should not use the service if you are not old enough to form a legal agreement in your jurisdiction.",
    ],
  },
];

export const metadata = {
  title: "Privacy Policy | Kern",
  description: "Privacy Policy for Kern, including Google OAuth and connected account data handling.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 md:px-6">
        <Link href="/" className="inline-flex items-center gap-3 text-foreground transition-colors hover:text-primary">
          <span className="font-serif text-3xl font-bold tracking-tight">Kern.</span>
        </Link>
        <Link href="/terms" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Terms of Service
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        <section className="rounded-[48px] border border-border bg-card p-8 shadow-sm md:p-12">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[11px] tracking-[0.22em]">
              <LockKeyhole className="h-4 w-4 text-primary" />
              Privacy
            </span>
            <span>Last updated {legalLastUpdated}</span>
          </div>

          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-medium tracking-tight text-foreground md:text-6xl">
            Privacy Policy for Kern
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            This policy explains what data Kern collects, how we use it, and how it is shared when you connect wallets, social accounts,
            and Google OAuth-based services to the platform.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-border bg-background/70 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Service</p>
              <p className="mt-2 text-foreground">Kern clip-to-earn platform</p>
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
          {privacySections.map((section) => (
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
            <Shield className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-serif text-2xl text-foreground">Your choices</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You can disconnect linked accounts, stop using the service, or ask for help with deletion by emailing{' '}
                <a href={`mailto:${supportEmail}`} className="text-foreground underline decoration-primary/50 underline-offset-4">
                  {supportEmail}
                </a>
                .
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                For Google OAuth review, make sure the contact email points to an inbox you actually monitor.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}