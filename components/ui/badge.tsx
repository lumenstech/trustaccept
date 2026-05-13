import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-primary/30 bg-primary/10 text-primary",
        accent: "border-accent/30 bg-accent/10 text-accent",
        amber: "border-amber/30 bg-amber/10 text-amber",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

import type { RiskLevel, RiskStatus } from "@/lib/types";

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const tone =
    level === "critical" ? "danger" : level === "high" ? "amber" : level === "medium" ? "info" : "neutral";
  return <Badge tone={tone}>{level.toUpperCase()}</Badge>;
}

export function StatusBadge({ status }: { status: RiskStatus }) {
  const map: Record<RiskStatus, { tone: BadgeProps["tone"]; label: string }> = {
    pending: { tone: "amber", label: "Pending" },
    accepted: { tone: "success", label: "Accepted" },
    rejected: { tone: "danger", label: "Rejected" },
    remediation_required: { tone: "info", label: "Remediation Required" },
    expired: { tone: "neutral", label: "Expired" },
  };
  const entry = map[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
