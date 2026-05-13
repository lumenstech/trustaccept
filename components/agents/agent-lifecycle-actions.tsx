"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lifecyclePermissions } from "@/lib/agents-ui";
import type { Agent } from "@/lib/types";

interface Props {
  agent: Agent;
  variant?: "row" | "detail";
}

/**
 * Pause / Revoke buttons used in both the list row and the detail
 * page. Revoke is gated behind a confirm() prompt because the action
 * is terminal — once revoked an agent cannot be reactivated.
 */
export function AgentLifecycleActions({ agent, variant = "row" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<"pause" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const perms = lifecyclePermissions(agent);

  async function call(action: "pause" | "revoke") {
    setError(null);
    setPending(action);
    try {
      const res = await fetch(`/api/v1/agents/${agent.id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to ${action}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setPending(null);
    }
  }

  function onRevokeClick() {
    if (typeof window !== "undefined" && !window.confirm(perms.revokeConfirmation)) {
      return;
    }
    void call("revoke");
  }

  const size = variant === "row" ? "sm" : "md";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size={size}
          disabled={!perms.pauseEnabled || pending !== null}
          onClick={() => void call("pause")}
          aria-label={`Pause ${agent.name}`}
        >
          <PauseCircle className="h-4 w-4" />
          {pending === "pause" ? "Pausing…" : perms.pauseLabel}
        </Button>
        <Button
          variant="reject"
          size={size}
          disabled={!perms.revokeEnabled || pending !== null}
          onClick={onRevokeClick}
          aria-label={`Revoke ${agent.name}`}
        >
          <ShieldOff className="h-4 w-4" />
          {pending === "revoke" ? "Revoking…" : perms.revokeLabel}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
