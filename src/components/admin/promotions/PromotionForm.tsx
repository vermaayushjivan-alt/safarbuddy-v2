"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPromotionAdmin,
  updatePromotionAdmin,
  uploadPromotionLogoAdmin,
  type PromotionInput,
} from "@/app/actions/promotion.actions";
import {
  PROMOTION_SLOT_VALUES,
  type PromotionRecord,
} from "@/lib/repositories/promotion.repository";

interface PromotionFormProps {
  mode: "create" | "edit";
  promotion?: PromotionRecord;
}

const SLOT_LABELS: Record<(typeof PROMOTION_SLOT_VALUES)[number], string> = {
  after_hero: "After Hero / before Offers",
  between_destinations_trending: "Between Destinations and Trending",
  between_packages_testimonials: "Between Packages and Testimonials",
};

function PromotionForm({ mode, promotion }: PromotionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PromotionInput>({
    hotel_id: promotion?.hotel_id ?? "",
    company_name: promotion?.company_name ?? "",
    logo_image: promotion?.logo_image ?? "",
    click_url: promotion?.click_url ?? "",
    slot_position: promotion?.slot_position ?? "after_hero",
    start_date: promotion?.start_date ?? "",
    end_date: promotion?.end_date ?? "",
    is_active: promotion?.is_active ?? true,
  });

  function handleChange<K extends keyof PromotionInput>(
    key: K,
    value: PromotionInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    startTransition(async () => {
      try {
        const result = await uploadPromotionLogoAdmin(file);
        if (!result.success) {
          throw new Error(result.error);
        }
        handleChange("logo_image", result.data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setIsUploading(false);
        input.value = "";
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPromotionAdmin(form)
          : promotion
            ? await updatePromotionAdmin(promotion.id, form)
            : null;

      if (!result) return;

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/promotions");
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

      <Field label="Company / Advertiser Name" required>
        <input
          type="text"
          required
          value={form.company_name}
          onChange={(e) => handleChange("company_name", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Slot" required>
        <select
          required
          value={form.slot_position}
          onChange={(e) =>
            handleChange(
              "slot_position",
              e.target.value as PromotionInput["slot_position"]
            )
          }
          className={inputClass}
        >
          {PROMOTION_SLOT_VALUES.map((slot) => (
            <option key={slot} value={slot}>
              {SLOT_LABELS[slot]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Click-through URL" required>
        <input
          type="url"
          required
          placeholder="https://..."
          value={form.click_url}
          onChange={(e) => handleChange("click_url", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Logo / Banner Image">
        {form.logo_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.logo_image}
            alt="Logo preview"
            className="mb-2 h-24 w-full rounded-xl border border-deep/15 object-cover"
          />
        ) : null}
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleLogoUpload}
          disabled={isUploading}
          className="block w-full text-[13px] text-ink/70"
        />
        <p className="mt-1 text-[12px] text-ink/45">
          {isUploading
            ? "Uploading..."
            : "jpg, jpeg, png, or webp. Max 5MB. Wide images (e.g. 1200×500) look best in the big banner slot."}
        </p>
        <input
          type="text"
          placeholder="Or paste an image URL directly"
          value={form.logo_image ?? ""}
          onChange={(e) => handleChange("logo_image", e.target.value)}
          className={`${inputClass} mt-2`}
        />
      </Field>

      <Field label="SafarBuddy Hotel ID (optional)">
        <input
          type="text"
          placeholder="Only if this promotion advertises one of our own hotels"
          value={form.hotel_id ?? ""}
          onChange={(e) => handleChange("hotel_id", e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Start Date">
          <input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => handleChange("start_date", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="End Date">
          <input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => handleChange("end_date", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] font-semibold text-deep">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => handleChange("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-deep/30"
        />
        Active
      </label>

      {promotion && (
        <p className="text-[12px] text-ink/50">
          {promotion.impression_count} impressions · {promotion.click_count}{" "}
          clicks so far.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="focus-ring rounded-xl bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create Promotion"
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

export default PromotionForm;
