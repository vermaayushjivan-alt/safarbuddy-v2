"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createVendorAdmin,
  updateVendorAdmin,
  type VendorInput,
} from "@/app/actions/vendor.actions";
import type { VendorRecord } from "@/lib/repositories/vendor.repository";

interface VendorFormProps {
  mode: "create" | "edit";
  vendor?: VendorRecord;
}

export function VendorForm({ mode, vendor }: VendorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<VendorInput>({
    user_id: vendor?.user_id ?? "",
    business_name: vendor?.business_name ?? "",
    gst_number: vendor?.gst_number ?? "",
    is_approved: vendor?.is_approved ?? false,
  });

  function handleChange<K extends keyof VendorInput>(
    key: K,
    value: VendorInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createVendorAdmin(form);
        } else if (vendor) {
          await updateVendorAdmin(vendor.id, form);
        }
        router.push("/admin/vendors");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <Field label="Business Name" required>
        <input
          type="text"
          required
          value={form.business_name}
          onChange={(e) => handleChange("business_name", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="User ID" required>
        <input
          type="text"
          required
          placeholder="00000000-0000-0000-0000-000000000000"
          value={form.user_id}
          onChange={(e) => handleChange("user_id", e.target.value)}
          disabled={mode === "edit"}
          className={`${inputClass} ${mode === "edit" ? "opacity-60" : ""} font-mono`}
        />
        <p className="mt-1 text-[12px] text-ink/45">
          The Supabase user ID (UUID) this vendor account belongs to.
        </p>
      </Field>

      <Field label="GST Number">
        <input
          type="text"
          value={form.gst_number ?? ""}
          onChange={(e) => handleChange("gst_number", e.target.value)}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-[13px] text-deep">
        <input
          type="checkbox"
          checked={form.is_approved ?? false}
          onChange={(e) => handleChange("is_approved", e.target.checked)}
          className="h-4 w-4 rounded border-deep/30"
        />
        Approved
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
              ? "Create Vendor"
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
