import Link from "next/link";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/ai-action-gate", label: "AI Action Gate" },
  { href: "/access-accept", label: "Access" },
  { href: "/vulnerability-acceptance", label: "Vulnerability" },
  { href: "/cisa-kev-review", label: "KEV Review" },
  { href: "/secure-release-gate", label: "Release Gate" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Open dashboard
            </Button>
          </Link>
          <Link href="/book-risk-review">
            <Button size="sm">Book a 48-Hour Review</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
