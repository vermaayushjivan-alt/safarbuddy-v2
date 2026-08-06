"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPackageImagesAdmin,
  uploadPackageImageAdmin,
  setPrimaryPackageImageAdmin,
  reorderPackageImageAdmin,
  deletePackageImageAdmin,
  type PackageImageWithUrl,
} from "@/app/actions/package.actions";

interface PackageImageManagerProps {
  packageId: string;
}

export function PackageImageManager({ packageId }: PackageImageManagerProps) {
  const [images, setImages] = useState<PackageImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const data = await getPackageImagesAdmin(packageId);
    setImages(data.sort((a, b) => a.sort_order - b.sort_order));
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPackageImagesAdmin(packageId);
        if (active) setImages(data.sort((a, b) => a.sort_order - b.sort_order));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load images");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [packageId]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      try {
        await uploadPackageImageAdmin(packageId, file, images.length === 0);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        e.target.value = "";
      }
    });
  }

  function handleSetPrimary(imageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setPrimaryPackageImageAdmin(packageId, imageId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set primary");
      }
    });
  }

  function handleSortOrderChange(imageId: string, sortOrder: number) {
    setError(null);
    startTransition(async () => {
      try {
        await reorderPackageImageAdmin(imageId, sortOrder);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update sort order");
      }
    });
  }

  function handleDelete(imageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deletePackageImageAdmin(imageId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete image");
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
