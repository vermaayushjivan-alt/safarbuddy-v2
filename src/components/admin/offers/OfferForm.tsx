"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOfferAdmin,
  updateOfferAdmin,
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
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OfferInput>({
    title: offer?.title ?? "",
    description: offer?.description ?? "",
    discount: offer?.discount ?? "",
    start_date: offer?.start_date ?? "",
    end_date: offer?.end_date ?? "",
    status: offer?.status ?? "",
    image: offer?.image ?? "",
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createOfferAdmin(form);
        } else if (offer) {
          await updateOfferAdmin(offer.id, form);
        }

        router.push("/admin/offers");
        router.refresh();

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );

      }
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
        <input
          type="text"
          required
          value={form.status}
          onChange={(e) =>
            handleChange("status", e.target.value)
          }
          placeholder="e.g. ACTIVE"
          className={inputClass}
        />
      </Field>


      <Field label="Image URL">
        <input
          type="text"
          value={form.image ?? ""}
          onChange={(e) =>
            handleChange("image", e.target.value)
          }
          className={inputClass}
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
