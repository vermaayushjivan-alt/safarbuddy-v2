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

// ALREADY-AUTH-01: passed down from the Server Component page so the
// form knows, on first render, whether the visitor already has a
// SafarBuddy account — before they type anything. Prevents the
// "User already registered" dead-end for existing customers.
type InitialAuth =
  | { isAuthenticated: true; email: string; fullName: string }
  | { isAuthenticated: false };

// KYC-01: kept as separate component state, never inside `form`
// (PropertyListingInput) — File objects don't belong in a
// Zod-validated plain object (see property-listing.actions.ts's
// PropertyListingKycFiles comment), and this state must survive
// independently of any future field-by-field form reset logic.
type KycFileState = {
  aadhar: File | null;
  pan: File | null;
  passbook: File | null;
};

const emptyKycFiles: KycFileState = { aadhar: null, pan: null, passbook: null };

const KYC_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,application/pdf";
const KYC_MAX_SIZE_BYTES = 5 * 1024 * 1024;

// ROOMS-01: must match ROOM_TYPE_VALUES in room-type.repository.ts —
// the live hotel_rooms.room_type CHECK constraint. Not imported
// directly since that repository file is server-only; kept in sync by
// hand (both derive from the same live DB constraint).
const ROOM_TYPE_OPTIONS = [
  "single",
  "double",
  "twin",
  "suite",
  "deluxe",
  "executive",
  "family",
] as const;

type RoomEntry = PropertyListingInput["roomTypes"][number];

const emptyRoom: RoomEntry = {
  roomName: "",
  roomType: "double",
  basePrice: 0,
  capacityAdults: 2,
  capacityChildren: 0,
  maxOccupancy: 2,
  bedType: "",
  roomSizeSqft: undefined,
  totalRooms: 1,
};

const ROOM_IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const ROOM_MAX_IMAGES_PER_ROOM = 6;

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
  roomTypes: [{ ...emptyRoom }],
  facilityIds: [],
  bankAccountNumber: "",
  bankIfsc: "",
  upiId: "",
  contactPhone: "",
  contactEmail: "",
  website: "",
};

export function PropertyListingForm({ initialAuth }: { initialAuth: InitialAuth }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);

  const [form, setForm] = useState<PropertyListingInput>(() =>
    initialAuth.isAuthenticated
      ? {
          ...emptyForm,
          ownerEmail: initialAuth.email,
          ownerFullName: initialAuth.fullName,
          contactEmail: initialAuth.email,
        }
      : emptyForm
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountWasCreated, setAccountWasCreated] = useState(false);
  const [sameAsOwnerContact, setSameAsOwnerContact] = useState(true);
  const [kycFiles, setKycFiles] = useState<KycFileState>(emptyKycFiles);
  const [kycUploadResult, setKycUploadResult] = useState<{
    aadhar: boolean;
    pan: boolean;
    passbook: boolean;
  } | null>(null);
  // ROOMS-01: images per room, aligned by index to form.roomTypes —
  // roomImages[0] holds the files for form.roomTypes[0], etc. Kept
  // separate from `form` for the same reason kycFiles is (File
  // objects don't belong in the Zod-validated object).
  const [roomImages, setRoomImages] = useState<File[][]>([[]]);
  const [roomImagesResult, setRoomImagesResult] = useState<
    { attempted: number; saved: number }[] | null
  >(null);

  function addRoom() {
    setForm((prev) => ({ ...prev, roomTypes: [...prev.roomTypes, { ...emptyRoom }] }));
    setRoomImages((prev) => [...prev, []]);
  }

  function removeRoom(index: number) {
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index),
    }));
    setRoomImages((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRoom<K extends keyof RoomEntry>(index: number, key: K, value: RoomEntry[K]) {
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.map((room, i) =>
        i === index ? { ...room, [key]: value } : room
      ),
    }));
  }

  function handleRoomImagesChange(index: number, files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files).slice(0, ROOM_MAX_IMAGES_PER_ROOM);
    const tooLarge = selected.find((f) => f.size > KYC_MAX_SIZE_BYTES);
    if (tooLarge) {
      setError(`${tooLarge.name} is too large — each photo must be 5MB or smaller.`);
      return;
    }
    setError(null);
    setRoomImages((prev) => prev.map((imgs, i) => (i === index ? selected : imgs)));
  }

  // KYC-01: rejects an over-size/wrong-type file at selection time
  // with an inline message, rather than silently sending it and only
  // finding out from kycUploaded after the whole submission succeeds.
  // Still not the only check — the server re-validates independently
  // (never trust client-side validation alone) via uploadKycDocument()
  // in property-listing.actions.ts.
  function handleKycFileChange(field: keyof KycFileState, file: File | null) {
    if (file && file.size > KYC_MAX_SIZE_BYTES) {
      setError(`${kycFieldLabel(field)} must be 5MB or smaller.`);
      return;
    }
    setError(null);
    setKycFiles((prev) => ({ ...prev, [field]: file }));
  }

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
      const result = await submitPropertyListing(
        form,
        {
          aadharFile: kycFiles.aadhar,
          panFile: kycFiles.pan,
          passbookFile: kycFiles.passbook,
        },
        roomImages
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setAccountWasCreated(result.data.accountCreated);
      setKycUploadResult(result.data.kycUploaded);
      setRoomImagesResult(result.data.roomImagesUploaded);
      setSuccess(true);
    });
  }

  // P0.3 Step 3 (post-submit session-based redirect, 2026-09-05
  // session): when submitPropertyListing() reused an existing signed-in
  // session (ALREADY-AUTH-01 — accountCreated: false), the hotel_owner
  // role has already been granted in this same request and the
  // person's session cookie is already valid — there is no email to
  // confirm, so there is no reason to leave them on this page. Sends
  // them straight to the new /hotel-owner dashboard (Step 2) instead of
  // just telling them to "check back later" with no way to get there.
  //
  // The accountCreated: true path is deliberately NOT auto-redirected
  // here — Supabase Auth may still require email confirmation before a
  // real session exists (project-level setting, unverified in this
  // sandbox — Bible Rule 13), so redirecting immediately could land an
  // unconfirmed visitor on a gated route with no session at all.
  useEffect(() => {
    if (success && !accountWasCreated) {
      router.push("/hotel-owner");
    }
  }, [success, accountWasCreated, router]);

  if (success) {
    // KYC-01: a document the person attached can still fail to upload
    // (wrong type slipped past the client check, a transient Storage
    // error) without failing the whole submission — see
    // uploadKycDocument()'s header in property-listing.actions.ts.
    // Surfaced here by name so it's never a silent gap the owner only
    // discovers when an admin asks for a document "you already sent".
    const attemptedButFailed = (
      ["aadhar", "pan", "passbook"] as const
    ).filter((field) => kycFiles[field] && !kycUploadResult?.[field]);

    return (
      <Alert variant="success">
        {accountWasCreated ? (
          <>
            Your property has been submitted for review. We&apos;ve sent a
            confirmation link to your email — verify it, then log in to see
            your listing status.{" "}
            <button
              type="button"
              onClick={() => router.push("/login?redirectTo=/hotel-owner")}
              className="font-medium underline"
            >
              Go to login
            </button>
          </>
        ) : (
          <>
            Your property has been submitted for review. Taking you to your
            dashboard…
          </>
        )}
        {attemptedButFailed.length > 0 && (
          <p className="mt-3 text-[13px] text-[var(--color-ink)]/70">
            Note: {attemptedButFailed.map(kycFieldLabel).join(", ")} could not
            be uploaded — please add{" "}
            {attemptedButFailed.length > 1 ? "them" : "it"} again from your
            dashboard once you're in.
          </p>
        )}
        {roomImagesResult?.some((r) => r.saved < r.attempted) && (
          <p className="mt-2 text-[13px] text-[var(--color-ink)]/70">
            Note: some room photos didn&apos;t upload successfully — you can
            add them again from your dashboard.
          </p>
        )}
      </Alert>
    );
  }

  const facilitiesByCategory = groupByCategory(facilities);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-10">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Section 1: Owner account */}
      <Section
        title="Your account"
        subtitle={
          initialAuth.isAuthenticated
            ? "You're signed in — this property will be added to your existing account."
            : "This creates your SafarBuddy host login."
        }
      >
        {initialAuth.isAuthenticated && (
          <p className="mb-5 rounded-xl bg-[var(--color-mist)]/40 px-3.5 py-2.5 text-[14px] text-[var(--color-ink)]/70">
            Listing as <span className="font-medium">{initialAuth.email}</span>
          </p>
        )}
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
          {!initialAuth.isAuthenticated && (
            <TextField
              id="ownerEmail"
              label="Email"
              type="email"
              required
              value={form.ownerEmail}
              onChange={(e) => handleChange("ownerEmail", e.target.value)}
            />
          )}
          {!initialAuth.isAuthenticated && (
            <>
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
            </>
          )}
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

      {/* Section 2b: Rooms */}
      <Section
        title="Rooms"
        subtitle="Add every room type you offer, with its own price, capacity, and photos. This is what guests actually book — add as many as you need."
      >
        <div className="space-y-6">
          {form.roomTypes.map((room, index) => (
            <div key={index} className="rounded-xl border border-[var(--color-mist)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Room {index + 1}
                </p>
                {form.roomTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(index)}
                    className="text-[12px] text-[var(--color-ink)]/40 underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`room-${index}-name`}
                  label="Room name"
                  required
                  value={room.roomName}
                  onChange={(e) => updateRoom(index, "roomName", e.target.value)}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
                    Room type
                  </label>
                  <select
                    value={room.roomType}
                    onChange={(e) => updateRoom(index, "roomType", e.target.value as RoomEntry["roomType"])}
                    className="w-full rounded-xl border border-[var(--color-mist)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-sky)]"
                  >
                    {ROOM_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <TextField
                  id={`room-${index}-price`}
                  label="Price per night (₹)"
                  type="number"
                  min={0}
                  required
                  value={room.basePrice}
                  onChange={(e) => updateRoom(index, "basePrice", Number(e.target.value))}
                />
                <TextField
                  id={`room-${index}-total`}
                  label="How many rooms of this type?"
                  type="number"
                  min={1}
                  required
                  value={room.totalRooms}
                  onChange={(e) => updateRoom(index, "totalRooms", Number(e.target.value))}
                />
                <TextField
                  id={`room-${index}-adults`}
                  label="Max adults"
                  type="number"
                  min={1}
                  required
                  value={room.capacityAdults}
                  onChange={(e) => updateRoom(index, "capacityAdults", Number(e.target.value))}
                />
                <TextField
                  id={`room-${index}-children`}
                  label="Max children"
                  type="number"
                  min={0}
                  value={room.capacityChildren}
                  onChange={(e) => updateRoom(index, "capacityChildren", Number(e.target.value))}
                />
                <TextField
                  id={`room-${index}-occupancy`}
                  label="Max total guests"
                  type="number"
                  min={1}
                  required
                  value={room.maxOccupancy}
                  onChange={(e) => updateRoom(index, "maxOccupancy", Number(e.target.value))}
                />
                <TextField
                  id={`room-${index}-bed`}
                  label="Bed type (optional)"
                  placeholder="e.g. 1 King Bed"
                  value={room.bedType ?? ""}
                  onChange={(e) => updateRoom(index, "bedType", e.target.value)}
                />
                <TextField
                  id={`room-${index}-size`}
                  label="Room size in sqft (optional)"
                  type="number"
                  min={0}
                  value={room.roomSizeSqft ?? ""}
                  onChange={(e) =>
                    updateRoom(
                      index,
                      "roomSizeSqft",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
                  Room photos (up to {ROOM_MAX_IMAGES_PER_ROOM})
                </label>
                <label
                  htmlFor={`room-${index}-images`}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-mist)] px-3 py-5 text-center text-[13px] text-[var(--color-ink)]/60 hover:border-[var(--color-sky)]"
                >
                  {roomImages[index]?.length > 0 ? (
                    <span>{roomImages[index].length} photo(s) selected</span>
                  ) : (
                    <span>Tap to upload photos</span>
                  )}
                  <input
                    id={`room-${index}-images`}
                    type="file"
                    accept={ROOM_IMAGE_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => handleRoomImagesChange(index, e.target.files)}
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRoom}
            className="w-full rounded-xl border border-dashed border-[var(--color-sky)] py-2.5 text-sm font-medium text-[var(--color-sky)] hover:bg-[var(--color-sky)]/5"
          >
            + Add another room
          </button>
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

      {/* Section 5: KYC documents */}
      <Section
        title="KYC documents"
        subtitle="Photos or scans are fine (JPG, PNG, or PDF, up to 5MB each). Admin verifies these before your property goes live — you can add or replace any of them later from your dashboard if you don't have all three ready now."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <FileUploadField
            id="kycAadhar"
            label="Aadhar card"
            file={kycFiles.aadhar}
            onChange={(file) => handleKycFileChange("aadhar", file)}
          />
          <FileUploadField
            id="kycPan"
            label="PAN card"
            file={kycFiles.pan}
            onChange={(file) => handleKycFileChange("pan", file)}
          />
          <FileUploadField
            id="kycPassbook"
            label="Bank passbook / cancelled cheque"
            file={kycFiles.passbook}
            onChange={(file) => handleKycFileChange("passbook", file)}
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

function kycFieldLabel(field: "aadhar" | "pan" | "passbook"): string {
  switch (field) {
    case "aadhar":
      return "Aadhar card";
    case "pan":
      return "PAN card";
    case "passbook":
      return "Bank passbook";
  }
}

function FileUploadField({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-mist)] px-3 py-5 text-center text-[13px] text-[var(--color-ink)]/60 hover:border-[var(--color-sky)]"
      >
        {file ? (
          <span className="truncate px-2 font-medium text-[var(--color-ink)]">
            {file.name}
          </span>
        ) : (
          <span>Tap to upload</span>
        )}
        <input
          id={id}
          type="file"
          accept={KYC_ACCEPT}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 text-[12px] text-[var(--color-ink)]/40 underline"
        >
          Remove
        </button>
      )}
    </div>
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


                         
