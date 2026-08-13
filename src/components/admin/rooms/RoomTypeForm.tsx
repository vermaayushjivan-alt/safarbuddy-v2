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

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="roomName"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Room Name
          </label>
          <input
            id="roomName"
            name="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="Deluxe Room"
          />
        </div>

        <div>
          <label
            htmlFor="roomType"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Room Type
          </label>
          <input
            id="roomType"
            name="roomType"
            value={roomType_}
            onChange={(e) => setRoomType_(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="Deluxe, Suite, Standard..."
          />
        </div>

        <div>
          <label
            htmlFor="basePrice"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Base Price
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            min="0"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="2500"
          />
        </div>

        <div>
          <label
            htmlFor="bedType"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Bed Configuration
          </label>
          <input
            id="bedType"
            name="bedType"
            value={bedType}
            onChange={(e) => setBedType(e.target.value)}
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="1 King Bed"
          />
        </div>

        <div>
          <label
            htmlFor="capacityAdults"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Max Adults
          </label>
          <input
            id="capacityAdults"
            name="capacityAdults"
            type="number"
            min="1"
            value={capacityAdults}
            onChange={(e) => setCapacityAdults(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="capacityChildren"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Max Children
          </label>
          <input
            id="capacityChildren"
            name="capacityChildren"
            type="number"
            min="0"
            value={capacityChildren}
            onChange={(e) => setCapacityChildren(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="maxOccupancy"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Max Occupancy
          </label>
          <input
            id="maxOccupancy"
            name="maxOccupancy"
            type="number"
            min="1"
            value={maxOccupancy}
            onChange={(e) => setMaxOccupancy(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="roomSizeSqft"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Room Size (sq ft)
          </label>
          <input
            id="roomSizeSqft"
            name="roomSizeSqft"
            type="number"
            min="0"
            value={roomSizeSqft}
            onChange={(e) => setRoomSizeSqft(e.target.value)}
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="350"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as RoomTypeStatus)
            }
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

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
