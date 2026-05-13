import * as React from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Standardized empty-state used inside cards and tables. Centralizes
 * spacing, icon size, and copy hierarchy so the agents list, agent
 * detail, decisions table, and evidence form all read consistently
 * when there's no data to show.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const padding = size === "sm" ? "py-10" : "py-16";
  const iconSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 px-6 text-center",
        padding,
        className,
      )}
    >
      <Icon className={cn("text-muted-foreground", iconSize)} />
      <div>
        <p className="text-base font-medium">{title}</p>
        {description ? (
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
