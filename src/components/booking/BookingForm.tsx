// ROOT PATH: src/components/booking/BookingForm.tsx
// PATH: src/components/booking/BookingForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import {
  createBooking,
  type CreateBookingInput,
} from '@/app/actions/booking.actions';
import type { BookableRoom } from '@/app/actions/room-type.actions';

interface BookingFormProps {
  mode: 'hotel' | 'package';
  targetId: string;
  targetName: string;
  startingPrice: number | null;
  // ROOM-05: optional so the existing package booking flow
  // (src/app/packages/[id]/book/page.tsx) is untouched.
  rooms?: BookableRoom[];
  preselectedRoomId?: string | null;
  // HOME-HOTEL-SEARCH-01: prefill from the dates/guests picked at
  // search time (homepage hero or /hotels search bar), instead of
  // making the visitor re-enter what they already chose.
  initialCheckInDate?: string;
  initialCheckOutDate?: string;
  initialNumGuests?: number;
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';

  return price.toLocaleString('en-IN');
}

function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getNextDateString(dateString: string): string {
  if (!dateString) return '';

  return format(addDays(parseISO(dateString), 1), 'yyyy-MM-dd');
}

export default function BookingForm({
  mode,
  targetId,
  targetName,
  startingPrice,
  rooms = [],
  preselectedRoomId = null,
  initialCheckInDate = '',
  initialCheckOutDate = '',
  initialNumGuests = 1,
}: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [checkInDate, setCheckInDate] = useState(initialCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOutDate);
  const [travelDate, setTravelDate] = useState('');
  const [numGuests, setNumGuests] = useState(initialNumGuests);
  const [roomId, setRoomId] = useState<string>(
    preselectedRoomId && rooms.some((r) => r.id === preselectedRoomId)
      ? preselectedRoomId
      : ''
  );

  const selectedRoom = rooms.find((r) => r.id === roomId) ?? null;
  const displayPrice = selectedRoom ? selectedRoom.price : startingPrice;

  const today = getTodayDateString();
  const minimumCheckOutDate = getNextDateString(checkInDate);

  function handleCheckInChange(value: string) {
    setCheckInDate(value);

    /*
     * A hotel stay must contain at least one night.
     * If the currently selected checkout date becomes invalid
     * after changing check-in, clear it.
     */
    if (checkOutDate && value && checkOutDate <= value) {
      setCheckOutDate('');
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === 'hotel') {
      if (rooms.length > 0 && !roomId) {
        setError('Please select a room.');
        return;
      }

      if (!checkInDate || !checkOutDate) {
        setError(
          'Please select both check-in and check-out dates.'
        );
        return;
      }

      if (checkOutDate <= checkInDate) {
        setError(
          'Check-out must be at least one day after check-in.'
        );
        return;
      }
    }

    if (mode === 'package' && !travelDate) {
      setError('Please select a travel date.');
      return;
    }

    if (numGuests < 1) {
      setError('Number of guests must be at least 1.');
      return;
    }

    const input: CreateBookingInput = {
      booking_type: mode,
      hotel_id: mode === 'hotel' ? targetId : null,
      package_id: mode === 'package' ? targetId : null,
      // ROOM-05: only sent for hotel bookings, and only when the visitor
      // actually picked a room — createBooking falls back to
      // hotel.starting_price when this is null, same as before.
      room_id: mode === 'hotel' && roomId ? roomId : null,
      check_in_date: mode === 'hotel' ? checkInDate : null,
      check_out_date: mode === 'hotel' ? checkOutDate : null,
      travel_date: mode === 'package' ? travelDate : null,
      num_guests: numGuests,
    };

    startTransition(async () => {
      try {
        const booking = await createBooking(input);

        // router.refresh() removed: it was invalidating and re-fetching
        // the *current* (booking form) route's data immediately before
        // navigating away from it via router.push(), which is a wasted
        // round trip — the destination page (/dashboard/bookings) already
        // fetches its own fresh data on navigation as a Server Component.
        router.push(
          `/dashboard/bookings?created=${booking.id}`
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while creating the booking.'
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-5 rounded-2xl border border-deep/15 bg-white p-6"
    >
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
          ₹{formatPrice(displayPrice)}
        </p>

        <p className="mt-1 text-[13px] text-ink/60">
          {targetName}
        </p>
      </div>

      {mode === 'hotel' && rooms.length > 0 && (
        <Field label="Room" required>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select a room
            </option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_name} — ₹{formatPrice(room.price)}/night
              </option>
            ))}
          </select>
        </Field>
      )}

      {mode === 'hotel' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Check-in" required>
            <input
              type="date"
              required
              min={today}
              value={checkInDate}
              onChange={(e) =>
                handleCheckInChange(e.target.value)
              }
              className={inputClass}
            />
          </Field>

          <Field label="Check-out" required>
            <input
              type="date"
              required
              min={minimumCheckOutDate || today}
              value={checkOutDate}
              onChange={(e) =>
                setCheckOutDate(e.target.value)
              }
              disabled={!checkInDate}
              className={`${inputClass} ${
                !checkInDate
                  ? 'cursor-not-allowed opacity-60'
                  : ''
              }`}
            />

            {!checkInDate && (
              <p className="mt-1 text-[11px] text-ink/45">
                Select your check-in date first.
              </p>
            )}
          </Field>
        </div>
      ) : (
        <Field label="Travel date" required>
          <input
            type="date"
            required
            min={today}
            value={travelDate}
            onChange={(e) =>
              setTravelDate(e.target.value)
            }
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
          onChange={(e) =>
            setNumGuests(Number(e.target.value))
          }
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
        {required && (
          <span className="text-orange"> *</span>
        )}
      </label>

      {children}
    </div>
  );
    }

                
