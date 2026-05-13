import Link from "next/link";
import {
  Boxes,
  Bug,
  FileSignature,
  Inbox,
  KeyRound,
  LayoutDashboard,
  PlugZap,
  Settings,
  ShieldQuestion,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Approval Inbox", icon: Inbox },
  { href: "/dashboard/access-accept", label: "Access Accept", icon: KeyRound },
  { href: "/dashboard/vulnerability-acceptance", label: "Vulnerability Accept", icon: Bug },
  { href: "/dashboard/risk-records", label: "Risk Records", icon: ShieldQuestion },
  { href: "/dashboard/product-modules", label: "Product Modules", icon: Boxes },
  { href: "/dashboard/evidence-desk", label: "Evidence Desk", icon: FileSignature },
  { href: "/dashboard/integrations", label: "Integrations", icon: PlugZap },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Logo href="/dashboard" />
          <Badge tone="info">Workspace</Badge>
        </div>
        <nav className="flex flex-col gap-1 p-4 text-sm">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-4 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">Alex Greene</span>
          <br />
          Office of the CISO · Mock auth
        </div>
      </aside>
      <main className="min-h-screen bg-background">{children}</main>
    </div>
  );
}

export function DashboardHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card/30">
      <div className="flex flex-wrap items-end justify-between gap-4 px-8 py-8">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
