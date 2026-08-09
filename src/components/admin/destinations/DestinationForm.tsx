"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDestinationAdmin,
  updateDestinationAdmin,
  type DestinationInput,
} from "@/app/actions/destination.actions";
import type { DestinationRecord } from "@/lib/repositories/destination.repository";

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "INACTIVE"] as const;

interface DestinationFormProps {
  mode: "create" | "edit";
  destination?: DestinationRecord;
}

export function DestinationForm({ mode, destination }: DestinationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<DestinationInput>({
    name: destination?.name ?? "",
    slug: destination?.slug ?? "",
    state: destination?.state ?? "",
    description: destination?.description ?? "",
    is_featured: destination?.is_featured ?? false,
    status: destination?.status ?? "DRAFT",
  });

  function handleChange<K extends keyof DestinationInput>(
    key: K,
    value: DestinationInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDestinationAdmin(form)
          : destination
            ? await updateDestinationAdmin(destination.id, form)
            : null;

      if (!result) return;

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/destinations");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <Field label="Name" required>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Slug" required>
        <input
          type="text"
          required
          value={form.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description ?? ""}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          className={inputClass}
        />
      </Field>

      <Field label="State">
        <input
          type="text"
          value={form.state ?? ""}
          onChange={(e) => handleChange("state", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-[13px] text-deep">
        <input
          type="checkbox"
          checked={form.is_featured ?? false}
          onChange={(e) => handleChange("is_featured", e.target.checked)}
          className="h-4 w-4 rounded border-deep/30"
        />
        Featured on homepage
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-xl bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create Destination"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "focus-ring w-full rounded-xl border border-deep/15 px-3.5 py-2.5 text-[14px] text-deep outline-none transition focus:border-deep/40";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-heading text-[13px] font-semibold text-deep">
        {label}
        {required && <span className="text-orange"> *</span>}
      </label>
      {children}
    </div>
  );
}
