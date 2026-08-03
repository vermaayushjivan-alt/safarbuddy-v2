/**
 * PasswordField
 *
 * WHY IT EXISTS:
 * - Password input with a show/hide toggle, used on login, register,
 *   and confirm-password fields
 *
 * RESPONSIBILITY:
 * - Render a labeled password input
 * - Toggle between masked/plain text visibility
 * - Support an optional right-aligned slot (e.g. "Forgot password?" link)
 *
 * SERVER/CLIENT: Client (uses useState for visibility toggle)
 *
 * USED BY: login/page.tsx, register/page.tsx
 */

"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  id: string;
  error?: string;
  rightSlot?: ReactNode;
}

export function PasswordField({
  label,
  id,
  error,
  rightSlot,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
        {rightSlot}
      </div>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "focus-ring w-full rounded-xl border px-3.5 py-2.5 pr-11 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink)]/35",
            error
              ? "border-red-300 bg-red-50/40"
              : "border-[var(--color-mist)] bg-white focus:border-[var(--color-sky)]",
            className
          )}
          {...inputProps}
        />
        <button
          type="button"
          id={toggleId}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--color-ink)]/40 transition hover:text-[var(--color-ink)]/70"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
