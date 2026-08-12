"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRoomTypeAdmin,
  updateRoomTypeAdmin,
  type RoomTypeInput,
} from "@/app/actions/room-type.actions";
import type {
  RoomTypeRecord,
  RoomTypeStatus,
} from "@/lib/repositories/room-type.repository";

interface RoomTypeFormProps {
  hotelId: string;
  roomType?: RoomTypeRecord | null;
}

export function RoomTypeForm({
  hotelId,
  roomType = null,
}: RoomTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(roomType);

  const [name, setName] = useState(roomType?.name ?? "");
  const [description, setDescription] = useState(
    roomType?.description ?? ""
  );
  const [basePrice, setBasePrice] = useState(
    roomType?.base_price?.toString() ?? ""
  );
  const [maxAdults, setMaxAdults] = useState(
    roomType?.max_adults?.toString() ?? "1"
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedBasePrice = Number(basePrice);
    const parsedMaxAdults = Number(maxAdults);
    const parsedMaxChildren = Number(maxChildren);
    const parsedRoomSize = roomSizeSqft
      ? Number(roomSizeSqft)
      : undefined;
    const parsedDisplayOrder = displayOrder
      ? Number(displayOrder)
      : undefined;

    if (!name.trim()) {
      setError("Room type name is required.");
      return;
    }

    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setError("Please enter a valid base price.");
      return;
    }

    if (!Number.isInteger(parsedMaxAdults) || parsedMaxAdults < 1) {
      setError("At least 1 adult is required.");
      return;
    }

    if (!Number.isInteger(parsedMaxChildren) || parsedMaxChildren < 0) {
      setError("Children count cannot be negative.");
      return;
    }

    if (
      parsedRoomSize !== undefined &&
      (!Number.isInteger(parsedRoomSize) || parsedRoomSize <= 0)
    ) {
      setError("Room size must be a positive whole number.");
      return;
    }

    if (
      parsedDisplayOrder !== undefined &&
      (!Number.isInteger(parsedDisplayOrder) || parsedDisplayOrder < 0)
    ) {
      setError("Display order cannot be negative.");
      return;
    }

    const input: RoomTypeInput = {
      hotel_id: hotelId,
      name: name.trim(),
      description: description.trim() || null,
      base_price: parsedBasePrice,
      max_adults: parsedMaxAdults,
      max_children: parsedMaxChildren,
      bed_config: bedConfig.trim() || null,
      room_size_sqft: parsedRoomSize ?? null,
      status,
      display_order: parsedDisplayOrder ?? 0,
    };

    startTransition(async () => {
      try {
        const result = isEditing && roomType
          ? await updateRoomTypeAdmin(roomType.id, input)
          : await createRoomTypeAdmin(input);

        if (!result.success) {
          setError(result.error);
          return;
        }

        router.push(`/admin/hotels/${hotelId}/rooms`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="room-name"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Room Type Name
          </label>

          <input
            id="room-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deluxe Room"
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="room-description"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Description
          </label>

          <textarea
            id="room-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this room type..."
            rows={4}
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="base-price"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Base Price
          </label>

          <input
            id="base-price"
            type="number"
            min="0"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="2500"
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="room-status"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Status
          </label>

          <select
            id="room-status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as RoomTypeStatus)
            }
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="max-adults"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Maximum Adults
          </label>

          <input
            id="max-adults"
            type="number"
            min="1"
            step="1"
            value={maxAdults}
            onChange={(e) => setMaxAdults(e.target.value)}
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="max-children"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Maximum Children
          </label>

          <input
            id="max-children"
            type="number"
            min="0"
            step="1"
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="bed-config"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Bed Configuration
          </label>

          <input
            id="bed-config"
            type="text"
            value={bedConfig}
            onChange={(e) => setBedConfig(e.target.value)}
            placeholder="1 King Bed"
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="room-size"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Room Size (sq ft)
          </label>

          <input
            id="room-size"
            type="number"
            min="1"
            step="1"
            value={roomSizeSqft}
            onChange={(e) => setRoomSizeSqft(e.target.value)}
            placeholder="350"
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>

        <div>
          <label
            htmlFor="display-order"
            className="mb-1.5 block font-heading text-[13px] font-semibold text-deep"
          >
            Display Order
          </label>

          <input
            id="display-order"
            type="number"
            min="0"
            step="1"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            disabled={isPending}
            className="w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none transition focus:border-deep/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-deep/10 pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-full bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Update Room Type"
              : "Create Room Type"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/admin/hotels/${hotelId}/rooms`)}
          disabled={isPending}
          className="focus-ring rounded-full border border-deep/15 px-5 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
