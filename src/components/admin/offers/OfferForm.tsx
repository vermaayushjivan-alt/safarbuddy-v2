"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOfferAdmin,
  updateOfferAdmin,
  uploadOfferImageAdmin,
  type OfferInput,
} from "@/app/actions/offer.actions";
import type { OfferRecord } from "@/lib/repositories/offer.repository";

interface OfferFormProps {
  mode: "create" | "edit";
  offer?: OfferRecord;
}

function OfferForm({ mode, offer }: OfferFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OfferInput>({
    title: offer?.title ?? "",
    description: offer?.description ?? "",
    discount: offer?.discount ?? "",
    start_date: offer?.start_date ?? "",
    end_date: offer?.end_date ?? "",
    status: (offer?.status ?? "ACTIVE").toUpperCase(),
    banner_image: offer?.banner_image ?? "",
  });

  function handleChange<K extends keyof OfferInput>(
    key: K,
    value: OfferInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    startTransition(async () => {
      try {
        const result = await uploadOfferImageAdmin(file);
        if (!result.success) {
          throw new Error(result.error);
        }
        handleChange("banner_image", result.data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setIsUploading(false);
        input.value = "";
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOfferAdmin(form)
          : offer
            ? await updateOfferAdmin(offer.id, form)
            : null;

      if (!result) return;

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/offers");
      router.refresh();
    });
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5"
    >

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}


      <Field label="Title" required>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) =>
            handleChange("title", e.target.value)
          }
          className={inputClass}
        />
      </Field>


      <Field label="Description">
        <textarea
          value={form.description ?? ""}
          onChange={(e) =>
            handleChange("description", e.target.value)
          }
          rows={4}
          className={inputClass}
        />
      </Field>


      <Field label="Discount">
        <input
          type="text"
          value={form.discount ?? ""}
          onChange={(e) =>
            handleChange("discount", e.target.value)
          }
          placeholder="e.g. 20% OFF"
          className={inputClass}
        />
      </Field>


      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

        <Field label="Start Date">
          <input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) =>
              handleChange("start_date", e.target.value)
            }
            className={inputClass}
          />
        </Field>


        <Field label="End Date">
          <input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) =>
              handleChange("end_date", e.target.value)
            }
            className={inputClass}
          />
        </Field>

      </div>


      <Field label="Status" required>
        <select
          required
          value={form.status}
          onChange={(e) =>
            handleChange("status", e.target.value)
          }
          className={inputClass}
        >
          <option value="ACTIVE">ACTIVE (shows on homepage)</option>
          <option value="INACTIVE">INACTIVE (hidden)</option>
        </select>
      </Field>


      <Field label="Banner Image">
        {form.banner_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.banner_image}
            alt="Offer banner preview"
            className="mb-2 h-24 w-full rounded-xl border border-deep/15 object-cover"
          />
        ) : null}
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={isUploading}
          className="block w-full text-[13px] text-ink/70"
        />
        <p className="mt-1 text-[12px] text-ink/45">
          {isUploading
            ? "Uploading..."
            : "jpg, jpeg, png, or webp. Max 5MB. Wide images look best in the card's top banner."}
        </p>
        <input
          type="text"
          placeholder="Or paste an image URL directly"
          value={form.banner_image ?? ""}
          onChange={(e) =>
            handleChange("banner_image", e.target.value)
          }
          className={`${inputClass} mt-2`}
        />
      </Field>


      <div className="flex gap-3 pt-2">

        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-xl bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {
            isPending
              ? "Saving..."
              : mode === "create"
                ? "Create Offer"
                : "Save Changes"
          }
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

        {
          required && (
            <span className="text-orange">
              {" "}
              *
            </span>
          )
        }

      </label>


      {children}

    </div>
  );
}


export default OfferForm;
