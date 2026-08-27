"use client";

// VENDOR-03 (M2) — single-page "List Your Property" form.
// One submit, all sections: owner account, property details,
// facilities, payout + contact. No multi-step wizard — explicit
// project-owner requirement (a small hotel owner shouldn't have to
// navigate between separate pages/sections to list a property).

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getFacilityCatalog,
  submitPropertyListing,
  type PropertyListingInput,
} from "@/app/actions/property-listing.actions";
import { TextField } from "@/components/auth/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { Alert } from "@/components/auth/Alert";

type FacilityOption = {
  id: string;
  code: string;
  label: string;
  category: string;
};

const emptyForm: PropertyListingInput = {
  ownerFullName: "",
  ownerEmail: "",
  ownerPhone: "",
  password: "",
  confirmPassword: "",
  hotelName: "",
  description: "",
  propertyCity: "",
  propertyState: "",
  propertyCountry: "",
  propertyAddress: "",
  starRating: undefined,
  startingPrice: undefined,
  facilityIds: [],
  bankAccountNumber: "",
  bankIfsc: "",
  upiId: "",
  contactPhone: "",
  contactEmail: "",
  website: "",
};

export function PropertyListingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);

  const [form, setForm] = useState<PropertyListingInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sameAsOwnerContact, setSameAsOwnerContact] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getFacilityCatalog();
        if (active) {
          setFacilities(
            data.map((f) => ({
              id: f.id,
              code: f.code,
              label: f.label,
              category: f.category,
            }))
          );
        }
      } catch {
        // Non-fatal — facilities section just shows empty; the rest
        // of the form still works. Logged server-side already by the
        // repository/action layer.
      } finally {
        if (active) setFacilitiesLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  function handleChange<K extends keyof PropertyListingInput>(
    key: K,
    value: PropertyListingInput[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      // Mirror owner phone/email into the contact section live while
      // "same as owner contact" is checked, without a separate effect
      // (avoids the cascading-render lint issue with setState-in-effect).
      if (sameAsOwnerContact) {
        if (key === "ownerPhone") next.contactPhone = value as string;
        if (key === "ownerEmail") next.contactEmail = value as string;
      }

      return next;
    });
  }

  function handleSameAsOwnerContactToggle(checked: boolean) {
    setSameAsOwnerContact(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        contactPhone: prev.ownerPhone,
        contactEmail: prev.ownerEmail,
      }));
    }
  }

  function toggleFacility(id: string) {
    setForm((prev) => ({
      ...prev,
      facilityIds: prev.facilityIds.includes(id)
        ? prev.facilityIds.filter((f) => f !== id)
        : [...prev.facilityIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitPropertyListing(form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <Alert variant="success">
        Your property has been submitted for review. We&apos;ve sent a
        confirmation link to your email — verify it, then log in to see
        your listing status.{" "}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="font-medium underline"
        >
          Go to login
        </button>
      </Alert>
    );
  }

  const facilitiesByCategory = groupByCategory(facilities);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-10">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Section 1: Owner account */}
      <Section title="Your account" subtitle="This creates your SafarBuddy host login.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="ownerFullName"
            label="Full name"
            required
            value={form.ownerFullName}
            onChange={(e) => handleChange("ownerFullName", e.target.value)}
          />
          <TextField
            id="ownerPhone"
            label="Phone number"
            type="tel"
            required
            value={form.ownerPhone}
            onChange={(e) => handleChange("ownerPhone", e.target.value)}
          />
          <TextField
            id="ownerEmail"
            label="Email"
            type="email"
            required
            value={form.ownerEmail}
            onChange={(e) => handleChange("ownerEmail", e.target.value)}
          />
          <div />
          <PasswordField
            id="password"
            label="Password"
            required
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            required
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
          />
        </div>
      </Section>

      {/* Section 2: Property details */}
      <Section title="Property details">
        <div className="space-y-5">
          <TextField
            id="hotelName"
            label="Property name"
            required
            value={form.hotelName}
            onChange={(e) => handleChange("hotelName", e.target.value)}
          />

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full rounded-xl border border-[var(--color-mist)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-sky)]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="propertyCity"
              label="City"
              required
              value={form.propertyCity}
              onChange={(e) => handleChange("propertyCity", e.target.value)}
            />
            <TextField
              id="propertyState"
              label="State"
              value={form.propertyState ?? ""}
              onChange={(e) => handleChange("propertyState", e.target.value)}
            />
            <TextField
              id="propertyCountry"
              label="Country"
              required
              value={form.propertyCountry}
              onChange={(e) => handleChange("propertyCountry", e.target.value)}
            />
            <TextField
              id="propertyAddress"
              label="Full address"
              required
              value={form.propertyAddress}
              onChange={(e) => handleChange("propertyAddress", e.target.value)}
            />
            <TextField
              id="starRating"
              label="Star rating (0–5)"
              type="number"
              min={0}
              max={5}
              value={form.starRating ?? ""}
              onChange={(e) =>
                handleChange(
                  "starRating",
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
            />
            <TextField
              id="startingPrice"
              label="Starting price per night (₹)"
              type="number"
              min={0}
              value={form.startingPrice ?? ""}
              onChange={(e) =>
                handleChange(
                  "startingPrice",
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
            />
          </div>
        </div>
      </Section>

      {/* Section 3: Facilities */}
      <Section
        title="Facilities & amenities"
        subtitle="Select everything your property offers."
      >
        {facilitiesLoading ? (
          <p className="text-sm text-[var(--color-ink)]/50">Loading facilities…</p>
        ) : facilities.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/50">
            No facilities available to select right now — you can add these later
            from your dashboard.
          </p>
        ) : (
          <div className="space-y-5">
            {Object.entries(facilitiesByCategory).map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {items.map((f) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-mist)] px-3 py-2 text-sm has-[:checked]:border-[var(--color-sky)] has-[:checked]:bg-[var(--color-sky)]/5"
                    >
                      <input
                        type="checkbox"
                        checked={form.facilityIds.includes(f.id)}
                        onChange={() => toggleFacility(f.id)}
                        className="h-4 w-4"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 4: Payout + contact */}
      <Section
        title="Payout & contact details"
        subtitle="Used for booking payouts and guest booking notifications."
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="bankAccountNumber"
              label="Bank account number"
              value={form.bankAccountNumber ?? ""}
              onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
            />
            <TextField
              id="bankIfsc"
              label="IFSC code"
              value={form.bankIfsc ?? ""}
              onChange={(e) => handleChange("bankIfsc", e.target.value.toUpperCase())}
            />
          </div>
          <div className="text-center text-xs text-[var(--color-ink)]/40">— or —</div>
          <TextField
            id="upiId"
            label="UPI ID"
            placeholder="name@bank"
            value={form.upiId ?? ""}
            onChange={(e) => handleChange("upiId", e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]/70">
            <input
              type="checkbox"
              checked={sameAsOwnerContact}
              onChange={(e) => handleSameAsOwnerContactToggle(e.target.checked)}
              className="h-4 w-4"
            />
            Use my account phone/email as the booking contact
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="contactPhone"
              label="Booking contact phone"
              required
              disabled={sameAsOwnerContact}
              value={form.contactPhone}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
            />
            <TextField
              id="contactEmail"
              label="Booking contact email"
              type="email"
              required
              disabled={sameAsOwnerContact}
              value={form.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
            />
          </div>
          <TextField
            id="website"
            label="Website (optional)"
            value={form.website ?? ""}
            onChange={(e) => handleChange("website", e.target.value)}
          />
        </div>
      </Section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[var(--color-sky)] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit property for review"}
      </button>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-mist)] p-6">
      <h2 className="font-heading text-lg font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      {subtitle && (
        <p className="mb-4 mt-1 text-sm text-[var(--color-ink)]/50">{subtitle}</p>
      )}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function groupByCategory(
  facilities: FacilityOption[]
): Record<string, FacilityOption[]> {
  return facilities.reduce<Record<string, FacilityOption[]>>((acc, f) => {
    acc[f.category] = acc[f.category] ?? [];
    acc[f.category].push(f);
    return acc;
  }, {});
}

