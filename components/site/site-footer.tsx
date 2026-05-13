import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  {
    title: "Modules",
    links: [
      { href: "/ai-action-gate", label: "AI Action Gate" },
      { href: "/access-accept", label: "Access Accept" },
      { href: "/vulnerability-acceptance", label: "Vulnerability Accept" },
      { href: "/cisa-kev-review", label: "KEV Exposure Review" },
      { href: "/secure-release-gate", label: "Secure Release Gate" },
      { href: "/device-accept", label: "Device Accept" },
      { href: "/evidence-desk", label: "Evidence Desk" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations", label: "Integrations" },
      { href: "/security", label: "Security" },
      { href: "/docs", label: "Docs" },
    ],
  },
  {
    title: "Talk to us",
    links: [
      { href: "/book-risk-review", label: "Book 48-Hour Review" },
      { href: "/start-pilot", label: "Start a pilot" },
      { href: "/request-evidence-desk", label: "Managed Evidence Desk" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background py-16">
      <div className="container grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Accept or reject cyber risk before it becomes an incident. Defensible
            approval records for the decisions that matter most.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
              {col.title}
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          TrustAccept is a Lumens Technology product. Approval delivery and identity
          workflow support powered by SequenceNow.
        </p>
        <p>&copy; {new Date().getFullYear()} Lumens Technology. All rights reserved.</p>
      </div>
    </footer>
  );
}
