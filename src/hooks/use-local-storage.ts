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
  // Get value from localStorage or use initial value
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

  // Update state when localStorage changes (in other tabs)
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          setStoredValue(event.newValue as T);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // Set value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
        
        // Dispatch event for other components on same page
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(newValue),
        }));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
