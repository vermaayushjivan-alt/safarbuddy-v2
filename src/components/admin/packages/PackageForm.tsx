"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPackageAdmin,
  updatePackageAdmin,
  type PackageInput,
} from "@/app/actions/package.actions";
import type { PackageRecord } from "@/lib/repositories/package.repository";

interface PackageFormProps {
  mode: "create" | "edit";
  pkg?: PackageRecord;
}

export function PackageForm({ mode, pkg }: PackageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PackageInput>({
    package_name: pkg?.package_name ?? "",
    slug: pkg?.slug ?? "",
    description: pkg?.description ?? "",
    city: pkg?.city ?? "",
    duration: pkg?.duration ?? "",
    starting_price: pkg?.starting_price ?? undefined,
    is_featured: pkg?.is_featured ?? false,
    status: pkg?.status ?? "",
  });

  function handleChange<K extends keyof PackageInput>(key: K, value: PackageInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createPackageAdmin(form);
        } else if (pkg) {
          await updatePackageAdmin(pkg.id, form);
        }
        router.push("/admin/packages");
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

      <Field label="Package Name" required>
        <input
          type="text"
          required
          value={form.package_name}
          onChange={(e) => handleChange("package_name", e.target.value)}
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <input
            type="text"
            value={form.city ?? ""}
            onChange={(e) => handleChange("city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Duration">
          <input
            type="text"
            placeholder="e.g. 4 Days / 3 Nights"
            value={form.duration ?? ""}
            onChange={(e) => handleChange("duration", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Starting Price (₹)">
        <input
          type="number"
          min={0}
          value={form.starting_price ?? ""}
          onChange={(e) =>
            handleChange(
              "starting_price",
              e.target.value === "" ? undefined : Number(e.target.value)
            )
          }
          className={inputClass}
        />
      </Field>

      <Field label="Status" required>
        <input
          type="text"
          required
          placeholder="e.g. ACTIVE"
          value={form.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className={inputClass}
        />
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
          {isPending ? "Saving..." : mode === "create" ? "Create Package" : "Save Changes"}
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
