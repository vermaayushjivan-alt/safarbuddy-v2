"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRoomTypeAdmin,
  updateRoomTypeAdmin,
} from "@/app/actions/room-type.actions";
import type {
  RoomTypeRecord,
  RoomTypeStatus,
} from "@/lib/repositories/room-type.repository";

interface RoomTypeFormProps {
  mode: "create" | "edit";
  hotelId: string;
  roomType?: RoomTypeRecord;
}

// Common room-type presets for the datalist below. This is a UI
// convenience only — room_type remains a free-text column on hotel_rooms
// (no enum/constraint has been confirmed live), so any custom value the
// admin types is still accepted. See DEVELOPMENT_BIBLE RULE 8 — never
// invent a DB enum.
const ROOM_TYPE_PRESETS = [
  "Standard",
  "Deluxe",
  "Superior",
  "Executive",
  "Suite",
  "Family",
  "Premium",
  "Dormitory",
];

const BED_TYPE_PRESETS = [
  "1 King Bed",
  "1 Queen Bed",
  "2 Double Beds",
  "2 Single Beds",
  "2 Twin Beds",
  "1 King Bed + 1 Sofa Bed",
  "1 Queen Bed + 1 Extra Bed",
];

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-deep/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="font-heading text-base font-semibold text-deep">{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] text-ink/55">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-deep"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-ink/45">{hint}</p>}
    </div>
  );
}

const inputClass =
  "focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none";

export function RoomTypeForm({
  mode,
  hotelId,
  roomType,
}: RoomTypeFormProps) {
  const router = useRouter();

  const [roomName, setRoomName] = useState(roomType?.room_name ?? "");
  const [roomType_, setRoomType_] = useState(roomType?.room_type ?? "");
  const [basePrice, setBasePrice] = useState(
    roomType?.base_price?.toString() ?? ""
  );
  const [capacityAdults, setCapacityAdults] = useState(
    roomType?.capacity_adults?.toString() ?? "2"
  );
  const [capacityChildren, setCapacityChildren] = useState(
    roomType?.capacity_children?.toString() ?? "0"
  );
  const [maxOccupancy, setMaxOccupancy] = useState(
    roomType?.max_occupancy?.toString() ?? "2"
  );
  const [bedType, setBedType] = useState(roomType?.bed_type ?? "");
  const [roomSizeSqft, setRoomSizeSqft] = useState(
    roomType?.room_size_sqft?.toString() ?? ""
  );
  const [status, setStatus] = useState<RoomTypeStatus>(
    roomType?.status ?? "active"
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const adultsNum = Number(capacityAdults) || 0;
  const childrenNum = Number(capacityChildren) || 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSaving(true);

    try {
      const payload = {
        hotel_id: hotelId,
        room_name: roomName.trim(),
        room_type: roomType_.trim(),
        base_price: Number(basePrice),
        capacity_adults: Number(capacityAdults),
        capacity_children: Number(capacityChildren),
        max_occupancy: Number(maxOccupancy),
        bed_type: bedType.trim() || null,
        room_size_sqft: roomSizeSqft ? Number(roomSizeSqft) : null,
        status,
      };

      const result =
        mode === "edit" && roomType
          ? await updateRoomTypeAdmin(roomType.id, payload)
          : await createRoomTypeAdmin(payload);

      if (!result.success) {
        setError(result.error ?? "Failed to save room type.");
        return;
      }

      router.push(`/admin/hotels/${hotelId}/rooms`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* --- Basic Room Information --- */}
      <FormSection
        title="Basic Information"
        description="How this room appears to hotel staff and, once published, to guests."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Room Name" htmlFor="roomName">
            <input
              id="roomName"
              name="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className={inputClass}
              placeholder="Deluxe Room"
            />
          </Field>

          <Field
            label="Room Type"
            htmlFor="roomType"
            hint="Pick a common type or type your own."
          >
            <input
              id="roomType"
              name="roomType"
              list="roomTypePresets"
              value={roomType_}
              onChange={(e) => setRoomType_(e.target.value)}
              required
              className={inputClass}
              placeholder="Deluxe, Suite, Standard..."
            />
            <datalist id="roomTypePresets">
              {ROOM_TYPE_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Base Price (per night)"
            htmlFor="basePrice"
            hint="Used as the default when no dated rate has been set in Pricing."
          >
            <input
              id="basePrice"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className={inputClass}
              placeholder="2500"
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as RoomTypeStatus)
              }
              className={inputClass}
            >
              <option value="active">Active — bookable</option>
              <option value="inactive">Inactive — hidden</option>
            </select>
          </Field>
        </div>
      </FormSection>

      {/* --- Guest Capacity --- */}
      <FormSection
        title="Guest Capacity"
        description="How many guests this room accommodates."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Max Adults" htmlFor="capacityAdults">
            <input
              id="capacityAdults"
              name="capacityAdults"
              type="number"
              min="1"
              value={capacityAdults}
              onChange={(e) => setCapacityAdults(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Max Children" htmlFor="capacityChildren">
            <input
              id="capacityChildren"
              name="capacityChildren"
              type="number"
              min="0"
              value={capacityChildren}
              onChange={(e) => setCapacityChildren(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field
            label="Max Occupancy"
            htmlFor="maxOccupancy"
            hint="Total guests allowed at once, regardless of the adult/child split above."
          >
            <input
              id="maxOccupancy"
              name="maxOccupancy"
              type="number"
              min="1"
              value={maxOccupancy}
              onChange={(e) => setMaxOccupancy(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <p className="mt-4 rounded-xl bg-mist px-4 py-2.5 text-[13px] text-deep">
          {adultsNum} Adult{adultsNum === 1 ? "" : "s"}
          {childrenNum > 0 && `, ${childrenNum} Child${childrenNum === 1 ? "" : "ren"}`}
          {" · "}Max Occupancy: {maxOccupancy || 0}
        </p>
      </FormSection>

      {/* --- Bed Configuration & Room Size --- */}
      <FormSection
        title="Bed Configuration & Size"
        description="hotel_rooms stores a single bed_type value and room_size_sqft — a structured multi-bed table isn't part of the live schema, so this stays a single free-text field rather than inventing persistence for one."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Bed Configuration"
            htmlFor="bedType"
            hint="Pick a common layout or type your own."
          >
            <input
              id="bedType"
              name="bedType"
              list="bedTypePresets"
              value={bedType ?? ""}
              onChange={(e) => setBedType(e.target.value)}
              className={inputClass}
              placeholder="1 King Bed"
            />
            <datalist id="bedTypePresets">
              {BED_TYPE_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
          </Field>

          <Field label="Room Size (sq ft)" htmlFor="roomSizeSqft">
            <input
              id="roomSizeSqft"
              name="roomSizeSqft"
              type="number"
              min="0"
              value={roomSizeSqft ?? ""}
              onChange={(e) => setRoomSizeSqft(e.target.value)}
              className={inputClass}
              placeholder="350"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Amenities"
        description="hotel_rooms has no amenities column or table in the live schema (confirmed — DATABASE_BIBLE.md RULE: never invent columns). Adding a checklist here would either silently fail to save or require a real migration, so amenities aren't editable from this form yet."
      >
        <div className="rounded-xl border border-dashed border-deep/20 bg-mist/40 px-4 py-3 text-[13px] text-ink/70">
          <p className="font-medium text-deep">Not yet supported by the database</p>
          <p className="mt-1">
            To add amenities properly, the safest path is a dedicated migration — e.g. a
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-[12px]">room_amenities</code>
            join table (room_id → hotel_rooms.id, amenity_id → a small
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-[12px]">amenities</code>
            lookup table), matching the existing repository pattern used for
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-[12px]">hotel_room_images</code>.
            This needs explicit sign-off before it&apos;s built (DEVELOPMENT_BIBLE RULE 15/RULE 20)
            — it is not implemented in this pass.
          </p>
        </div>
      </FormSection>

      <FormSection
        title="Photos"
        description="Room photos are managed on a dedicated page, connected to this exact room."
      >
        {mode === "edit" && roomType ? (
          <a
            href={`/admin/hotels/${hotelId}/rooms/${roomType.id}/images`}
            className="focus-ring inline-flex items-center rounded-full border border-deep/15 px-4 py-2.5 text-sm font-semibold text-deep transition hover:bg-mist"
          >
            Manage Photos for {roomType.room_name}
          </a>
        ) : (
          <p className="text-[13px] text-ink/60">
            Save this room first — photo management opens once the room exists.
          </p>
        )}
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-deep/10 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving}
          className="focus-ring rounded-full border border-deep/15 px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="focus-ring rounded-full bg-deep px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-deep-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : mode === "edit"
              ? "Update Room Type"
              : "Create Room Type"}
        </button>
      </div>
    </form>
  );
}
