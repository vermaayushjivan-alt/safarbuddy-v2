"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getHotelImagesAdmin,
  uploadHotelImageAdmin,
  setPrimaryHotelImageAdmin,
  reorderHotelImageAdmin,
  deleteHotelImageAdmin,
  type HotelImageWithUrl,
} from "@/app/actions/hotel.actions";

interface HotelImageManagerProps {
  hotelId: string;
}

export function HotelImageManager({ hotelId }: HotelImageManagerProps) {
  const [images, setImages] = useState<HotelImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // SESSION 03: all image server actions now return ActionResult<T>.
  // Client no longer relies on thrown errors — we always check
  // result.success and surface result.error to the user.

  async function refresh() {
    const result = await getHotelImagesAdmin(hotelId);
    if (result.success) {
      setImages(result.data.sort((a, b) => a.sort_order - b.sort_order));
    } else {
      setError(result.error);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await getHotelImagesAdmin(hotelId);
      if (!active) return;
      if (result.success) {
        setImages(result.data.sort((a, b) => a.sort_order - b.sort_order));
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [hotelId]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const result = await uploadHotelImageAdmin(
        hotelId,
        file,
        images.length === 0
      );
      if (result.success) {
        await refresh();
      } else {
        setError(result.error);
      }
      e.target.value = "";
    });
  }

  function handleSetPrimary(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPrimaryHotelImageAdmin(hotelId, imageId);
      if (result.success) {
        await refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleSortOrderChange(imageId: string, sortOrder: number) {
    setError(null);
    startTransition(async () => {
      const result = await reorderHotelImageAdmin(imageId, sortOrder);
      if (result.success) {
        await refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteHotelImageAdmin(imageId);
      if (result.success) {
        await refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block font-heading text-[13px] font-semibold text-deep">
          Upload Image
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleUpload}
          disabled={isPending}
          className="block w-full text-[13px] text-ink/70"
        />
        <p className="mt-1 text-[12px] text-ink/45">
          jpg, jpeg, png, or webp. Max 5MB.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-ink/50">Loading images...</p>
      ) : images.length === 0 ? (
        <p className="text-[13px] text-ink/50">No images uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="overflow-hidden rounded-2xl border border-deep/15 bg-white"
            >
              <div className="relative h-40 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.publicUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {img.is_primary && (
                  <span className="absolute left-2 top-2 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-ink/60">Sort order</label>
                  <input
                    type="number"
                    value={img.sort_order}
                    onChange={(e) =>
                      handleSortOrderChange(img.id, Number(e.target.value))
                    }
                    disabled={isPending}
                    className="w-16 rounded-lg border border-deep/15 px-2 py-1 text-[12px]"
                  />
                </div>
                <div className="flex gap-2">
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img.id)}
                      disabled={isPending}
                      className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    disabled={isPending}
                    className="focus-ring rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
