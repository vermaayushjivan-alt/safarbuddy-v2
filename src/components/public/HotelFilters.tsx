'use client';

// GOLIVE-16 — sort + filter bar for the /hotels page. Plain selects (easy on
// phones). Changing one updates the URL and keeps the city, dates, guests and
// "near me" location; page is reset to 1.

import { useRouter } from 'next/navigation';
import {
  BUDGET_OPTIONS,
  SORT_LABELS,
  STAR_OPTIONS,
  type HotelSort,
} from '@/lib/hotels/search-params';

export interface HotelFilterState {
  city: string;
  checkin: string;
  checkout: string;
  guests: string;
  lat: string;
  lng: string;
  sort: HotelSort;
  budget: string;
  stars: string;
}

const SELECT_CLASS =
  'focus-ring w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-[13px] text-deep outline-none';

export function HotelFilters({
  current,
  hasLocation,
}: {
  current: HotelFilterState;
  hasLocation: boolean;
}) {
  const router = useRouter();

  function go(overrides: Partial<HotelFilterState>) {
    const next: Record<string, string> = { ...current, ...overrides };
    const qs = new URLSearchParams();

    for (const key of ['city', 'checkin', 'checkout', 'guests', 'lat', 'lng'] as const) {
      if (next[key]) qs.set(key, next[key]);
    }
    // 'newest' is the default, so it is not written into the URL
    if (next.sort && next.sort !== 'newest') qs.set('sort', next.sort);
    if (next.budget) qs.set('budget', next.budget);
    if (next.stars) qs.set('stars', next.stars);

    const query = qs.toString();
    router.push(query ? `/hotels?${query}` : '/hotels');
  }

  const sortOptions = (Object.keys(SORT_LABELS) as HotelSort[]).filter(
    (s) => s !== 'distance' || hasLocation
  );

  const filtersActive =
    current.budget !== '' ||
    current.stars !== '' ||
    (current.sort !== 'newest' && !(hasLocation && current.sort === 'distance'));

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">
          Sort by
        </span>
        <select
          className={SELECT_CLASS}
          value={current.sort}
          onChange={(e) => go({ sort: e.target.value as HotelSort })}
        >
          {sortOptions.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">
          Budget (per night)
        </span>
        <select
          className={SELECT_CLASS}
          value={current.budget}
          onChange={(e) => go({ budget: e.target.value })}
        >
          {BUDGET_OPTIONS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/50">
          Star category
        </span>
        <select
          className={SELECT_CLASS}
          value={current.stars}
          onChange={(e) => go({ stars: e.target.value })}
        >
          {STAR_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {filtersActive && (
        <button
          type="button"
          onClick={() => go({ sort: hasLocation ? 'distance' : 'newest', budget: '', stars: '' })}
          className="focus-ring self-end rounded-xl border border-deep/15 px-4 py-2.5 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
