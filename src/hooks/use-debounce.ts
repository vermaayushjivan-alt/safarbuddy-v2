/**
 * Debounce Hook
 * 
 * WHY IT EXISTS:
 * - Delay execution of rapidly changing values
 * - Optimize search inputs and API calls
 * - Prevent excessive re-renders
 * 
 * RESPONSIBILITY:
 * - Debounce any value with configurable delay
 * 
 * SERVER/CLIENT: Client-only
 * 
 * USED BY: Search inputs, filters, real-time validation
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce a value by a specified delay
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 * 
 * useEffect(() => {
 *   // This runs 300ms after the user stops typing
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
