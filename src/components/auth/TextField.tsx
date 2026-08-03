/**
 * TextField
 *
 * WHY IT EXISTS:
 * - Reusable labeled input for auth forms (email, full name, etc.)
 * - Centralizes label/error/focus styling so every field looks identical
 *
 * RESPONSIBILITY:
 * - Render a label, input, and inline field-level error message
 * - Expose standard input props (type, autoComplete, required, etc.)
 *
 * SERVER/CLIENT: Either (no hooks, safe inside client pages)
 *
 * USED BY: login/page.tsx, register/page.tsx
 */

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

export function TextField({
  label,
  id,
  error,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "focus-ring w-full rounded-xl border px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink)]/35",
          error
            ? "border-red-300 bg-red-50/40"
            : "border-[var(--color-mist)] bg-white focus:border-[var(--color-sky)]",
          className
        )}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
