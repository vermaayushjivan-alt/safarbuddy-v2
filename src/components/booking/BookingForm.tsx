// PATH: src/components/booking/BookingForm.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import {
  createBooking,
  type CreateBookingInput,
} from '@/app/actions/booking.actions';
import {
  getBookableRoomsForHotel,
  type BookableRoom,
} from '@/app/actions/room-availability.actions';

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
}: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [numGuests, setNumGuests] = useState(1);

  // ROOM-05 Phase J: room selection state (hotel bookings only).
  const [rooms, setRooms] = useState<BookableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const today = getTodayDateString();
  const minimumCheckOutDate = getNextDateString(checkInDate);

  // Fetch bookable rooms whenever a complete, valid date range is
  // selected. This is a preview only — createBooking() re-validates
  // availability/price server-side at submit time regardless of what
  // this fetch returns, so a stale list here can't let a bad booking
  // through.
  useEffect(() => {
    if (mode !== 'hotel') {
      return;
    }

    const hasValidRange =
      Boolean(checkInDate) &&
      Boolean(checkOutDate) &&
      checkOutDate > checkInDate;

    let cancelled = false;

    async function loadRooms() {
      if (!hasValidRange) {
        setRooms([]);
        setSelectedRoomId(null);
        setRoomsError(null);
        return;
      }

      setRoomsLoading(true);
      setRoomsError(null);
      setSelectedRoomId(null);

      try {
        const result = await getBookableRoomsForHotel(
          targetId,
          checkInDate,
          checkOutDate
        );

        if (!cancelled) {
          setRooms(result);
        }
      } catch (err) {
        if (!cancelled) {
          setRooms([]);
          setRoomsError(
            err instanceof Error
              ? err.message
              : 'Could not load rooms for these dates.'
          );
        }
      } finally {
        if (!cancelled) {
          setRoomsLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [mode, targetId, checkInDate, checkOutDate]);

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

      if (!selectedRoomId) {
        setError('Please select a room.');
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
      room_id: mode === 'hotel' ? selectedRoomId : null,
      package_id: mode === 'package' ? targetId : null,
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

  const selectedRoom =
    rooms.find((room) => room.room_id === selectedRoomId) ?? null;

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
          {mode === 'hotel' ? 'Starting from, per night' : 'Starting price'}
        </p>

        <p className="mt-1 font-display text-2xl text-orange">
          ₹{formatPrice(startingPrice)}
        </p>

        <p className="mt-1 text-[13px] text-ink/60">
          {targetName}
        </p>
      </div>

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

      {mode === 'hotel' && checkInDate && checkOutDate && checkOutDate > checkInDate && (
        <Field label="Select a room" required>
          {roomsLoading && (
            <p className="text-[13px] text-ink/60">
              Checking room availability…
            </p>
          )}

          {!roomsLoading && roomsError && (
            <p className="text-[13px] text-red-700">
              {roomsError}
            </p>
          )}

          {!roomsLoading && !roomsError && rooms.length === 0 && (
            <p className="text-[13px] text-ink/60">
              No rooms are configured for this hotel yet.
            </p>
          )}

          {!roomsLoading && !roomsError && rooms.length > 0 && (
            <div className="space-y-2.5">
              {rooms.map((room) => {
                const isSelected = selectedRoomId === room.room_id;

                return (
                  <label
                    key={room.room_id}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${
                      !room.available
                        ? 'cursor-not-allowed border-deep/10 opacity-50'
                        : isSelected
                          ? 'border-orange bg-orange/5'
                          : 'border-deep/15 hover:border-deep/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="room_id"
                        className="mt-1"
                        disabled={!room.available}
                        checked={isSelected}
                        onChange={() =>
                          setSelectedRoomId(room.room_id)
                        }
                      />

                      <div>
                        <p className="font-heading text-[13px] font-semibold text-deep">
                          {room.room_name}
                        </p>

                        <p className="mt-0.5 text-[12px] capitalize text-ink/60">
                          {room.room_type}
                          {room.bed_type ? ` · ${room.bed_type}` : ''} · up to{' '}
                          {room.max_occupancy} guests
                        </p>

                        {!room.available && room.unavailable_reason && (
                          <p className="mt-0.5 text-[11px] text-red-600">
                            {room.unavailable_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="whitespace-nowrap font-display text-[14px] text-deep">
                      {room.total_price != null
                        ? `₹${formatPrice(room.total_price)}`
                        : '—'}
                    </p>
                  </label>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {mode === 'hotel' && selectedRoom && selectedRoom.total_price != null && (
        <div className="rounded-xl bg-deep/5 px-3.5 py-3">
          <p className="text-[11px] text-ink/45">Total for your stay</p>
          <p className="mt-0.5 font-display text-xl text-deep">
            ₹{formatPrice(selectedRoom.total_price)}
          </p>
        </div>
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
          disabled={isPending || (mode === 'hotel' && !selectedRoomId)}
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
