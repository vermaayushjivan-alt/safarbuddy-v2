'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking, type CreateBookingInput } from '@/app/actions/booking.actions';

interface BookingFormProps {
  mode: 'hotel' | 'package';
  targetId: string;
  targetName: string;
  startingPrice: number | null;
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return price.toLocaleString('en-IN');
}

export default function BookingForm({ mode, targetId, targetName, startingPrice }: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [numGuests, setNumGuests] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreateBookingInput = {
      booking_type: mode,
      hotel_id: mode === 'hotel' ? targetId : null,
      package_id: mode === 'package' ? targetId : null,
      check_in_date: mode === 'hotel' ? checkInDate : null,
      check_out_date: mode === 'hotel' ? checkOutDate : null,
      travel_date: mode === 'package' ? travelDate : null,
      num_guests: numGuests,
    };

    startTransition(async () => {
      try {
        const booking = await createBooking(input);
        router.push(`/dashboard/bookings?created=${booking.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5 rounded-2xl border border-deep/15 bg-white p-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div>
        <p className="text-[11px] text-ink/45">
          {mode === 'hotel' ? 'Per night' : 'Starting price'}
        </p>
        <p className="mt-1 font-display text-2xl text-orange">
          ₹{formatPrice(startingPrice)}
        </p>
        <p className="mt-1 text-[13px] text-ink/60">{targetName}</p>
      </div>

      {mode === 'hotel' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Check-in" required>
            <input
              type="date"
              required
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Check-out" required>
            <input
              type="date"
              required
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      ) : (
        <Field label="Travel date" required>
          <input
            type="date"
            required
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className={inputClass}
          />
        </Field>
      )}

      <Field label="Number of guests" required>
        <input
          type="number"
          required
          min={1}
          value={numGuests}
          onChange={(e) => setNumGuests(Number(e.target.value))}
          className={inputClass}
        />
      </Field>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring w-full rounded-xl bg-deep py-2.5 text-center font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-50"
        >
          {isPending ? 'Booking...' : 'Confirm Booking'}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink/45">
          Payment is not required to place this booking.
        </p>
      </div>
    </form>
  );
}

const inputClass =
  'focus-ring w-full rounded-xl border border-deep/15 px-3.5 py-2.5 text-[14px] text-deep outline-none transition focus:border-deep/40';

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
        {required && <span className="text-orange"> *</span>}
      </label>
      {children}
    </div>
  );
}
