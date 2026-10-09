'use client';

// ROOT PATH: src/components/support/NewTicketForm.tsx
// SUPPORT-01 — "Get help" form: pick what you need (cancel, refund, payment...),
// write the problem, send. Creates a ticket and opens its chat page.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupportTicket } from '@/app/actions/support.actions';
import {
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
  type TicketCategory,
} from '@/lib/repositories/help-ticket.repository';

const HINTS: Partial<Record<TicketCategory, string>> = {
  cancellation: 'Tell us why you want to cancel. We will check the cancellation rules for your booking.',
  refund: 'Tell us which payment you are asking about and when you cancelled.',
  payment: 'Money was deducted but the booking is not confirmed? Tell us the amount and time.',
};

export function NewTicketForm({
  bookingId,
  bookingNumber,
  initialCategory,
}: {
  bookingId: string | null;
  bookingNumber: string | null;
  initialCategory: TicketCategory | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory | null>(initialCategory);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!category) {
      setError('Please choose what you need help with.');
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createSupportTicket({ category, bookingId, message });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/support/${result.data.ticketId}`);
    });
  }

  return (
    <div className="space-y-5">
      {bookingNumber && (
        <p className="rounded-xl bg-mist px-3 py-2 text-[13px] text-deep">
          About booking <strong>{bookingNumber}</strong>
        </p>
      )}

      <div>
        <p className="mb-2 text-[13px] font-semibold text-deep">What do you need help with?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TICKET_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              disabled={isPending}
              className={`focus-ring rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition ${
                category === c
                  ? 'border-sky bg-sky/10 text-deep'
                  : 'border-deep/15 text-deep hover:bg-mist'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-[13px] font-semibold text-deep">
        Your message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isPending}
          rows={5}
          maxLength={2000}
          placeholder={(category && HINTS[category]) || 'Describe your problem in a few lines.'}
          className="focus-ring mt-1 w-full rounded-xl border border-deep/15 px-3 py-2.5 text-[14px] font-normal text-ink"
        />
        <span className="mt-1 block text-right text-[11px] font-normal text-ink/45">
          {message.length}/2000
        </span>
      </label>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || message.trim().length < 5 || !category}
        className="focus-ring rounded-full bg-sky px-6 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {isPending ? 'Sending…' : 'Send to support'}
      </button>
    </div>
  );
}
