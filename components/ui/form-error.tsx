import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface FormErrorProps {
  message?: string | null;
  className?: string;
}

/**
 * Inline error banner used by client forms (agent create/edit,
 * lifecycle actions, future flows). Renders nothing when there's no
 * message so callers can drop it in unconditionally.
 */
export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
