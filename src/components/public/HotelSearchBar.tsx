"use client";

// HOME-HOTEL-SEARCH-01: single reusable hotel search form (RULE 1 — no
// duplicate search-box implementations). Used by:
//   - components/home/Hero.tsx (homepage, dark "boarding pass" variant)
//   - app/hotels/page.tsx (listing page, light card variant, also acts
//     as the on-page re-search/filter control)
// Both read the current `city`/`checkin`/`checkout`/`guests` state and
// navigate to /hotels with those as query params on submit — the single
// source of truth for "how a hotel search is triggered" in the app.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

interface HotelSearchBarProps {
  initialCity?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
  variant?: "hero" | "listing";
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HotelSearchBar({
  initialCity = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "",
  variant = "listing",
}: HotelSearchBarProps) {
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests || "2");
  const [searching, setSearching] = useState(false);

  const today = todayString();
  const minCheckOut = checkIn || today;

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    if (checkOut && value && checkOut <= value) {
      setCheckOut("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);

    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (checkIn) params.set("checkin", checkIn);
    if (checkOut) params.set("checkout", checkOut);
    if (guests) params.set("guests", guests);

    const query = params.toString();
    router.push(`/hotels${query ? `?${query}` : ""}`);
  }

  const isHero = variant === "hero";

  const labelClass = isHero
    ? "text-[11px] font-medium uppercase tracking-wide text-ink/45"
    : "text-[11px] font-medium uppercase tracking-wide text-ink/45";

  const inputClass = isHero
    ? "focus-ring mt-1 w-full border-b border-ink/15 bg-transparent pb-2 font-heading text-[15px] font-medium text-ink outline-none focus:border-orange"
    : "focus-ring mt-1 w-full rounded-lg border border-deep/15 bg-white px-3 py-2 font-heading text-[14px] font-medium text-ink outline-none focus:border-orange";

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isHero
          ? "grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-7 lg:grid-cols-5"
          : "grid grid-cols-1 gap-4 rounded-2xl border border-deep/15 bg-mist-2 p-5 sm:grid-cols-2 lg:grid-cols-5"
      }
    >
      <div className="lg:col-span-2">
        <label htmlFor="hotel-city" className={labelClass}>
          Destination
        </label>
        <input
          id="hotel-city"
          name="city"
          type="text"
          placeholder="City — e.g. Goa, Jaipur, Manali"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="hotel-checkin" className={labelClass}>
          Check-in
        </label>
        <input
          id="hotel-checkin"
          name="checkin"
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => handleCheckInChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="hotel-checkout" className={labelClass}>
          Check-out
        </label>
        <input
          id="hotel-checkout"
          name="checkout"
          type="date"
          min={minCheckOut}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          disabled={!checkIn}
          className={`${inputClass} ${!checkIn ? "cursor-not-allowed opacity-60" : ""}`}
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="hotel-guests" className={labelClass}>
            Guests
          </label>
          <input
            id="hotel-guests"
            name="guests"
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={searching}
          aria-busy={searching}
          className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-orange px-5 py-2.5 font-heading text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,43,0.8)] transition hover:bg-orange-2 active:scale-[0.98] disabled:opacity-80"
        >
          {searching ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <Search size={16} aria-hidden />
          )}
          <span className="hidden sm:inline">
            {searching ? "Searching…" : "Search"}
          </span>
        </button>
      </div>
    </form>
  );
}

