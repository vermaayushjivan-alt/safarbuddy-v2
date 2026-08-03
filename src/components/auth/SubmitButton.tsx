/**
 * SubmitButton
 *
 * WHY IT EXISTS:
 * - Consistent primary CTA for every auth form with a built-in pending state
 *
 * RESPONSIBILITY:
 * - Render a full-width submit button
 * - Swap label + show a spinner while the form action is pending
 * - Disable itself while pending to prevent double submits
 *
 * SERVER/CLIENT: Either (no hooks, safe inside client pages)
 *
 * USED BY: login/page.tsx, register/page.tsx
 */

import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel?: string;
}

export function SubmitButton({
  pending,
  label,
  pendingLabel,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-deep)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-deep-2)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending ? pendingLabel ?? label : label}
    </button>
  );
}
