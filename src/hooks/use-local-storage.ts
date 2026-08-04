/**
 * Local Storage Hook
 *
 * WHY IT EXISTS:
 * - Persist state across page reloads
 * - Type-safe localStorage access
 * - Handle SSR safely
 *
 * RESPONSIBILITY:
 * - Read/write to localStorage
 * - Sync state across tabs
 *
 * SERVER/CLIENT: Client-only
 *
 * USED BY: Theme preference, recent searches, form drafts
 */

'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';

/**
 * Use localStorage with React state
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if not in storage
 * @returns [value, setValue, removeValue]
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Read value from localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Sync value after mount
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  // Listen for storage changes (other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      try {
        setStoredValue(JSON.parse(event.newValue) as T);
      } catch {
        setStoredValue(event.newValue as T);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  // Update value
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const newValue =
          value instanceof Function ? value(storedValue) : value;

        window.localStorage.setItem(key, JSON.stringify(newValue));

        setStoredValue(newValue);

        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(newValue),
          })
        );
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);

      setStoredValue(initialValue);

      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: null,
        })
      );
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
