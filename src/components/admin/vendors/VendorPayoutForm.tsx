"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getVendorPayoutDetailsAdmin,
  upsertVendorPayoutDetailsAdmin,
} from "@/app/actions/vendor-payout.actions";

interface VendorPayoutFormProps {
  vendorId: string;
}

const emptyForm = {
  bank_account_number: "",
  bank_ifsc: "",
  upi_id: "",
};

export function VendorPayoutForm({ vendorId }: VendorPayoutFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const existing = await getVendorPayoutDetailsAdmin(vendorId);
        if (active && existing) {
          setForm({
            bank_account_number: existing.bank_account_number ?? "",
            bank_ifsc: existing.bank_ifsc ?? "",
            upi_id: existing.upi_id ?? "",
          });
          setPayoutStatus(existing.payout_status);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load payout details"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [vendorId]);

  function handleChange(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await upsertVendorPayoutDetailsAdmin(vendorId, form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setPayoutStatus(result.data.payout_status);
      setSuccess(true);
    });
  }

  if (loading) {
    return <p className="text-[14px] text-ink/60">Loading payout details…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {payoutStatus && (
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
          Payout status: {payoutStatus}
        </p>
      )}

      <div>
        <label className="mb-1 block text-[13px] font-semibold text-deep">
          Bank account number
        </label>
        <input
          type="text"
          value={form.bank_account_number}
          onChange={(e) => handleChange("bank_account_number", e.target.value)}
          className="w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[13px] font-semibold text-deep">
          IFSC code
        </label>
        <input
          type="text"
          value={form.bank_ifsc}
          onChange={(e) =>
            handleChange("bank_ifsc", e.target.value.toUpperCase())
          }
          placeholder="e.g. HDFC0001234"
          className="w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px]"
        />
      </div>

      <div className="text-center text-[13px] text-ink/40">— or —</div>

      <div>
        <label className="mb-1 block text-[13px] font-semibold text-deep">
          UPI ID
        </label>
        <input
          type="text"
          value={form.upi_id}
          onChange={(e) => handleChange("upi_id", e.target.value)}
          placeholder="name@bank"
          className="w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px]"
        />
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {success && (
        <p className="text-[13px] text-green-700">Payout details saved.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="focus-ring rounded-full bg-deep px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-deep/90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save payout details"}
      </button>

      <p className="text-[12px] text-ink/40">
        Cashfree beneficiary registration is not yet automated — this only
        saves the details for now (see PAY-04).
      </p>
    </form>
  );
}

