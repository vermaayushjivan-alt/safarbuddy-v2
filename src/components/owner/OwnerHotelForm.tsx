"use client";

// P0.3 Steps 2 (onboarding/management page for a signed-in hotel_owner).
//
// Deliberately narrower than admin's HotelForm.tsx: no vendor_id,
// status, or is_featured fields — those are admin-only per
// owner-hotel.actions.ts's ownerHotelUpdateSchema (an owner can
// describe/price/contact-info their own property, but never
// self-approve or self-feature it). Reuses updateMyHotel(), the one
// Server Action this milestone's Step 1 already built for this
// purpose (Bible Rule 9 — no duplicate write path).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMyHotel,
  type OwnerHotelUpdateInput,
} from "@/app/actions/owner-hotel.actions";
import type { HotelRecord } from "@/lib/repositories/hotel.repository";

interface OwnerHotelFormProps {
  hotel: HotelRecord;
}

export function OwnerHotelForm({ hotel }: OwnerHotelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<OwnerHotelUpdateInput>({
    hotel_name: hotel.hotel_name,
    description: hotel.description ?? "",
    city: hotel.city ?? "",
    state: hotel.state ?? "",
    country: hotel.country ?? "",
    address: hotel.address ?? "",
    star_rating: hotel.star_rating ?? undefined,
    starting_price: hotel.starting_price ?? undefined,
    phone: hotel.phone ?? "",
    email: hotel.email ?? "",
    website: hotel.website ?? "",
  });

  function handleChange<K extends keyof OwnerHotelUpdateInput>(
    key: K,
    value: OwnerHotelUpdateInput[K]
  ) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateMyHotel(hotel.id, form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSaved(true);
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

      {saved && !error && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          Saved.
        </div>
      )}

      <Field label="Property Name" required>
        <input
          type="text"
          required
          value={form.hotel_name}
          onChange={(e) => handleChange("hotel_name", e.target.value)}
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

        <Field label="State">
          <input
            type="text"
            value={form.state ?? ""}
            onChange={(e) => handleChange("state", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Country">
          <input
            type="text"
            value={form.country ?? ""}
            onChange={(e) => handleChange("country", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address">
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Star Rating">
          <input
            type="number"
            min={0}
            max={5}
            step="0.1"
            value={form.star_rating ?? ""}
            onChange={(e) =>
              handleChange(
                "star_rating",
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
            className={inputClass}
          />
        </Field>

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
      </div>

      <div className="rounded-xl border border-deep/10 bg-mist/30 p-4">
        <p className="mb-3 text-[13px] font-medium text-deep">
          Contact Details
        </p>
        <p className="mb-4 text-[12px] text-ink/45">
          Used to notify you about new bookings for this property.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="bookings@example.com"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Website">
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-xl bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
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

