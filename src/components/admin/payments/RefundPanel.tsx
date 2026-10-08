'use client';

// ROOT PATH: src/components/admin/payments/RefundPanel.tsx
// GOLIVE-07b — admin refund form. Admin-initiated only (D4). Calls
// requestRefundAdmin(); all money rules are enforced server-side and in SQL,
// this component only collects input and shows the result.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestRefundAdmin } from '@/app/actions/payment-refund.actions';

interface RefundPanelProps {
  paymentId: string;
  currency: string;
  refundable: number; // paid - refunded - in progress (computed by the page)
  suggestedAmount: number;
  suggestionReason: string;
}

function inr(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function RefundPanel({
  paymentId,
  currency,
  refundable,
  suggestedAmount,
  suggestionReason,
}: RefundPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<string>(
    suggestedAmount > 0 ? String(suggestedAmount) : ''
  );
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (refundable <= 0) {
    return (
      <p className="px-4 py-6 text-center text-[13px] text-ink/50">
        Nothing left to refund on this payment.
      </p>
    );
  }

  const parsed = Number(amount);
  const amountOk = Number.isFinite(parsed) && parsed > 0 && parsed <= refundable;

  function submit() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await requestRefundAdmin({
        payment_id: paymentId,
        amount: parsed,
        reason: reason.trim(),
      });

      setConfirming(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { outcome, message } = result.data;
      if (outcome === 'success') setNotice('Refund processed.');
      else if (outcome === 'pending')
        setNotice('Refund accepted by Cashfree. Final status will update automatically.');
      else if (outcome === 'unknown')
        setNotice(message ?? 'No answer from Cashfree yet. Do not retry; it is checked automatically.');
      else setError(message ?? 'Cashfree rejected this refund. Nothing was refunded.');

      setReason('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-xl bg-mist px-3 py-2 text-[12px] text-deep">
        <p>
          Can still refund: <strong>{currency} {inr(refundable)}</strong>
        </p>
        <p className="mt-1 text-ink/60">
          Policy suggestion: {currency} {inr(suggestedAmount)}. {suggestionReason}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setAmount(String(refundable))}
          className="focus-ring rounded-full border border-deep/15 px-3 py-1 text-[12px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
        >
          Full ({inr(refundable)})
        </button>
        <button
          type="button"
          disabled={isPending || suggestedAmount <= 0}
          onClick={() => setAmount(String(suggestedAmount))}
          className="focus-ring rounded-full border border-deep/15 px-3 py-1 text-[12px] font-semibold text-deep transition hover:bg-mist disabled:opacity-50"
        >
          Policy ({inr(suggestedAmount)})
        </button>
      </div>

      <label className="block text-[12px] font-semibold text-ink/60">
        Amount ({currency})
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setConfirming(false);
          }}
          disabled={isPending}
          className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px] text-deep"
        />
      </label>

      <label className="block text-[12px] font-semibold text-ink/60">
        Reason (shown in the refund history)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          rows={2}
          maxLength={300}
          className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px] text-deep"
        />
      </label>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {notice && <p className="text-[13px] text-deep">{notice}</p>}

      {!confirming ? (
        <button
          type="button"
          disabled={isPending || !amountOk || reason.trim().length < 3}
          onClick={() => setConfirming(true)}
          className="focus-ring rounded-full bg-deep px-5 py-2 text-[13px] font-semibold text-cream transition disabled:opacity-40"
        >
          Refund {amountOk ? `${currency} ${inr(parsed)}` : ''}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-red-600">
            This sends real money back to the customer and cannot be undone.
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="focus-ring rounded-full bg-red-600 px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {isPending ? 'Processing…' : 'Yes, refund'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirming(false)}
            className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
