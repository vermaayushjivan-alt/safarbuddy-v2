"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createHotelAdmin,
  updateHotelAdmin,
  type HotelInput,
} from "@/app/actions/hotel.actions";
import { getAllVendorsForDropdown } from "@/app/actions/vendor.actions";
import type { HotelRecord } from "@/lib/repositories/hotel.repository";

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "INACTIVE"] as const;

interface HotelFormProps {
  mode: "create" | "edit";
  hotel?: HotelRecord;
}

export function HotelForm({ mode, hotel }: HotelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Vendor dropdown state
  const [vendors, setVendors] = useState<
    { id: string; vendor_name: string }[]
  >([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  const [form, setForm] = useState<HotelInput>({
    hotel_name: hotel?.hotel_name ?? "",
    slug: hotel?.slug ?? "",
    description: hotel?.description ?? "",
    city: hotel?.city ?? "",
    state: hotel?.state ?? "",
    country: hotel?.country ?? "",
    address: hotel?.address ?? "",
    latitude: hotel?.latitude ?? undefined,
    longitude: hotel?.longitude ?? undefined,
    star_rating: hotel?.star_rating ?? undefined,
    starting_price: hotel?.starting_price ?? undefined,
    is_featured: hotel?.is_featured ?? false,
    status: (hotel?.status as HotelInput["status"]) ?? "DRAFT",

    // vendor_id — preselected from existing hotel when editing;
    // empty string as initial create state.
    // hotels.vendor_id is nullable, so a blank selection is valid
    // and is normalized to null server-side.
    vendor_id: hotel?.vendor_id ?? "",
  });

  // Load vendor list on mount — admin never types a UUID
  useEffect(() => {
    let active = true;

    async function loadVendors() {
      try {
        const data = await getAllVendorsForDropdown();

        if (active) {
          setVendors(data);
        }
      } catch (err) {
        if (active) {
          setVendorsError(
            err instanceof Error ? err.message : "Failed to load vendors"
          );
        }
      } finally {
        if (active) {
          setVendorsLoading(false);
        }
      }
    }

    loadVendors();

    return () => {
      active = false;
    };
  }, []);

  function handleChange<K extends keyof HotelInput>(
    key: K,
    value: HotelInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createHotelAdmin(form)
          : hotel
            ? await updateHotelAdmin(hotel.id, form)
            : null;

      if (!result) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/hotels");
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

      <Field label="Hotel Name" required>
        <input
          type="text"
          required
          value={form.hotel_name}
          onChange={(e) => handleChange("hotel_name", e.target.value)}
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
        <Field label="Latitude">
          <input
            type="number"
            step="any"
            value={form.latitude ?? ""}
            onChange={(e) =>
              handleChange(
                "latitude",
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
            className={inputClass}
          />
        </Field>

        <Field label="Longitude">
          <input
            type="number"
            step="any"
            value={form.longitude ?? ""}
            onChange={(e) =>
              handleChange(
                "longitude",
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
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

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) =>
            handleChange("status", e.target.value as HotelInput["status"])
          }
          className={inputClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      {/* Vendor selector — admin selects by name, UUID is submitted internally. */}
      <Field label="Vendor">
        {vendorsLoading ? (
          <p className="text-[13px] text-ink/50">Loading vendors…</p>
        ) : vendorsError ? (
          <p className="text-[13px] text-red-600">{vendorsError}</p>
        ) : (
          <select
            value={form.vendor_id ?? ""}
            onChange={(e) =>
              handleChange(
                "vendor_id",
                e.target.value === "" ? null : e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">— No vendor —</option>

            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        )}

        <p className="mt-1 text-[12px] text-ink/45">
          Select the vendor that owns or manages this hotel.
        </p>
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
          disabled={isPending || vendorsLoading}
          className="focus-ring rounded-xl bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create Hotel"
              : "Save Changes"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => router.push("/admin/hotels")}
          className="focus-ring rounded-xl border border-deep/15 px-5 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
        >
          Cancel
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
