import { describe, expect, it } from 'vitest';
import { hasSortOrFilter, parseHotelFilters } from '@/lib/hotels/search-params';

describe('parseHotelFilters', () => {
  it('plain list is not advanced', () => {
    const f = parseHotelFilters({});
    expect(f.advanced).toBe(false);
    expect(f.sort).toBe('newest');
  });
  it('budget option sets min/max', () => {
    const f = parseHotelFilters({ budget: '2000-5000' });
    expect([f.minPrice, f.maxPrice, f.advanced]).toEqual([2000, 5000, true]);
  });
  it('open-ended budget has no max', () => {
    const f = parseHotelFilters({ budget: '10000-' });
    expect([f.minPrice, f.maxPrice]).toEqual([10000, null]);
  });
  it('unknown or tampered values fall back to defaults', () => {
    const f = parseHotelFilters({ budget: "1;drop table", stars: '9', sort: 'evil' });
    expect([f.budget, f.stars, f.sort, f.advanced]).toEqual(['', '', 'newest', false]);
  });
  it('stars filter', () => {
    expect(parseHotelFilters({ stars: '4' }).minStars).toBe(4);
  });
  it('distance sort needs coordinates', () => {
    expect(parseHotelFilters({ sort: 'distance' }).sort).toBe('newest');
    expect(parseHotelFilters({ sort: 'distance', lat: '26.79', lng: '82.2' }).sort).toBe('distance');
  });
  it('near me defaults to nearest first, but an explicit sort wins', () => {
    expect(parseHotelFilters({ lat: '26.79', lng: '82.2' }).sort).toBe('distance');
    expect(parseHotelFilters({ lat: '26.79', lng: '82.2', sort: 'price_asc' }).sort).toBe('price_asc');
  });
  it('rejects out-of-range or non-numeric coordinates', () => {
    expect(parseHotelFilters({ lat: '99', lng: '82' }).nearMe).toBeNull();
    expect(parseHotelFilters({ lat: 'abc', lng: '82' }).nearMe).toBeNull();
    expect(parseHotelFilters({ lat: '26', lng: '' }).nearMe).toBeNull();
  });
});

describe('hasSortOrFilter', () => {
  it('ignores near-me coordinates, notices sort/filters', () => {
    expect(hasSortOrFilter({ lat: '26.79', lng: '82.2' })).toBe(false);
    expect(hasSortOrFilter({ sort: 'price_asc' })).toBe(true);
    expect(hasSortOrFilter({ budget: '0-2000' })).toBe(true);
    expect(hasSortOrFilter({ stars: '5' })).toBe(true);
  });
});

