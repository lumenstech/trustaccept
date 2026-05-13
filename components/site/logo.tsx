import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-base font-semibold tracking-tight">TrustAccept</span>
    </Link>
  );
}
