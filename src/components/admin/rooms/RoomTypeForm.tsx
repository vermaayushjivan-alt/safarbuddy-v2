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

  const [name, setName] = useState(roomType?.name ?? "");
  const [description, setDescription] = useState(
    roomType?.description ?? ""
  );
  const [basePrice, setBasePrice] = useState(
    roomType?.base_price?.toString() ?? ""
  );
  const [maxAdults, setMaxAdults] = useState(
    roomType?.max_adults?.toString() ?? "2"
  );
  const [maxChildren, setMaxChildren] = useState(
    roomType?.max_children?.toString() ?? "0"
  );
  const [bedConfig, setBedConfig] = useState(roomType?.bed_config ?? "");
  const [roomSizeSqft, setRoomSizeSqft] = useState(
    roomType?.room_size_sqft?.toString() ?? ""
  );
  const [status, setStatus] = useState<RoomTypeStatus>(
    roomType?.status ?? "active"
  );
  const [displayOrder, setDisplayOrder] = useState(
    roomType?.display_order?.toString() ?? "0"
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
        name: name.trim(),
        description: description.trim() || null,
        base_price: Number(basePrice),
        max_adults: Number(maxAdults),
        max_children: Number(maxChildren),
        bed_config: bedConfig.trim() || null,
        room_size_sqft: roomSizeSqft ? Number(roomSizeSqft) : null,
        status,
        display_order: Number(displayOrder),
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
        <div className="md:col-span-2">
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Room Type Name
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="Deluxe Room"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="Describe the room type..."
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
            htmlFor="bedConfig"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Bed Configuration
          </label>
          <input
            id="bedConfig"
            name="bedConfig"
            value={bedConfig}
            onChange={(e) => setBedConfig(e.target.value)}
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
            placeholder="1 King Bed"
          />
        </div>

        <div>
          <label
            htmlFor="maxAdults"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Max Adults
          </label>
          <input
            id="maxAdults"
            name="maxAdults"
            type="number"
            min="1"
            value={maxAdults}
            onChange={(e) => setMaxAdults(e.target.value)}
            required
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="maxChildren"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Max Children
          </label>
          <input
            id="maxChildren"
            name="maxChildren"
            type="number"
            min="0"
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
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

        <div>
          <label
            htmlFor="displayOrder"
            className="mb-1.5 block text-sm font-semibold text-deep"
          >
            Display Order
          </label>
          <input
            id="displayOrder"
            name="displayOrder"
            type="number"
            min="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          />
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
