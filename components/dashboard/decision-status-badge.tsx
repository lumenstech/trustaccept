import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { DecisionRequestStatus } from "@/src/server/decisions/types";

const STATUS_MAP: Record<
  DecisionRequestStatus,
  { tone: BadgeProps["tone"]; label: string }
> = {
  pending: { tone: "amber", label: "Pending" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  expired: { tone: "neutral", label: "Expired" },
  canceled: { tone: "neutral", label: "Canceled" },
  error: { tone: "danger", label: "Error" },
};

export function DecisionStatusBadge({ status }: { status: DecisionRequestStatus }) {
  const entry = STATUS_MAP[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
