// ROOT PATH: src/lib/hotels/search-params.ts
// GOLIVE-16 — pure helpers (no I/O, no imports) that turn the /hotels URL
// parameters into a safe, validated search. Unknown or tampered values fall
// back to the defaults. Unit-tested in verify/hotel-search-params.test.ts.

export type HotelSort = 'newest' | 'price_asc' | 'price_desc' | 'stars' | 'distance';

export const BUDGET_OPTIONS = [
  { value: '', label: 'Any budget', min: null, max: null },
  { value: '0-2000', label: 'Under ₹2,000', min: 0, max: 2000 },
  { value: '2000-5000', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { value: '5000-10000', label: '₹5,000 – ₹10,000', min: 5000, max: 10000 },
  { value: '10000-', label: '₹10,000 and above', min: 10000, max: null },
] as const;

export const STAR_OPTIONS = [
  { value: '', label: 'Any category' },
  { value: '3', label: '3 star and above' },
  { value: '4', label: '4 star and above' },
  { value: '5', label: '5 star' },
] as const;

export const SORT_LABELS: Record<HotelSort, string> = {
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  stars: 'Star category',
  distance: 'Nearest first',
};

export interface RawHotelParams {
  sort?: string;
  budget?: string;
  stars?: string;
  lat?: string;
  lng?: string;
}

export interface HotelSearchFilters {
  sort: HotelSort;
  budget: string; // one of BUDGET_OPTIONS values ('' = any)
  minPrice: number | null;
  maxPrice: number | null;
  stars: string; // '' | '3' | '4' | '5'
  minStars: number | null;
  nearMe: { lat: number; lng: number } | null;
  /** true when the request needs the advanced search (anything but the plain list) */
  advanced: boolean;
}

function parseCoordinate(value: string | undefined, min: number, max: number): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function parseHotelFilters(raw: RawHotelParams): HotelSearchFilters {
  const lat = parseCoordinate(raw.lat, -90, 90);
  const lng = parseCoordinate(raw.lng, -180, 180);
  const nearMe = lat != null && lng != null ? { lat, lng } : null;

  const budgetOption = BUDGET_OPTIONS.find((b) => b.value === (raw.budget ?? '')) ?? BUDGET_OPTIONS[0];
  const starOption = STAR_OPTIONS.find((s) => s.value === (raw.stars ?? '')) ?? STAR_OPTIONS[0];

  const allowed: HotelSort[] = ['newest', 'price_asc', 'price_desc', 'stars', 'distance'];
  let sort: HotelSort = allowed.includes(raw.sort as HotelSort) ? (raw.sort as HotelSort) : 'newest';

  if (sort === 'distance' && !nearMe) sort = 'newest'; // nothing to measure from
  if (nearMe && !raw.sort) sort = 'distance'; // "near me" defaults to nearest first

  const minPrice = budgetOption.min;
  const maxPrice = budgetOption.max;
  const minStars = starOption.value === '' ? null : Number(starOption.value);

  return {
    sort,
    budget: budgetOption.value,
    minPrice,
    maxPrice,
    stars: starOption.value,
    minStars,
    nearMe,
    advanced:
      sort !== 'newest' || minPrice != null || maxPrice != null || minStars != null || nearMe != null,
  };
}

/** Are any of the sort/filter params set? (used to keep filtered URLs out of Google) */
export function hasSortOrFilter(raw: RawHotelParams): boolean {
  const f = parseHotelFilters({ ...raw, lat: undefined, lng: undefined });
  return f.sort !== 'newest' || f.minPrice != null || f.maxPrice != null || f.minStars != null;
}
