/**
 * Alert
 *
 * WHY IT EXISTS:
 * - Reusable inline banner for form-level error / success / info messages
 *
 * RESPONSIBILITY:
 * - Render a styled message with an icon matching its variant
 *
 * SERVER/CLIENT: Either (no hooks, safe inside client pages)
 *
 * USED BY: login/page.tsx, register/page.tsx, forgot-password/page.tsx
 */

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type AlertVariant = "error" | "success" | "info";

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

const VARIANT_STYLES: Record<
  AlertVariant,
  { wrapper: string; icon: ReactNode }
> = {
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-700",
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  info: {
    wrapper: "border-[var(--color-sky-light)]/30 bg-[var(--color-mist-2)] text-[var(--color-deep)]",
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
};

export function Alert({ variant = "info", children }: AlertProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm",
        styles.wrapper
      )}
    >
      {styles.icon}
      <span>{children}</span>
    </div>
  );
}
