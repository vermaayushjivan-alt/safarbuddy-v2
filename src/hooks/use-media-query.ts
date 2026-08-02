/**
 * Media Query Hook
 * 
 * WHY IT EXISTS:
 * - Detect screen size changes in JavaScript
 * - Enable responsive logic in components
 * - Match Tailwind breakpoints in JS
 * 
 * RESPONSIBILITY:
 * - Track media query matches
 * - Provide responsive state
 * 
 * SERVER/CLIENT: Client-only
 * 
 * USED BY: Mobile navigation, responsive layouts, conditional rendering
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Tailwind breakpoint values
 */
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Check if a media query matches
 * 
 * @param query - CSS media query string
 * @returns Whether the media query matches
 * 
 * @example
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Check if screen is at or above a breakpoint
 * 
 * @param breakpoint - Tailwind breakpoint name
 * @returns Whether the screen is at or above the breakpoint
 * 
 * @example
 * const isDesktop = useBreakpoint('lg');
 * const isTablet = useBreakpoint('md');
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]})`);
}

/**
 * Check if screen is below a breakpoint
 * 
 * @param breakpoint - Tailwind breakpoint name
 * @returns Whether the screen is below the breakpoint
 * 
 * @example
 * const isMobile = useIsMobile(); // Below 768px
 */
export function useIsMobile(): boolean {
  return !useBreakpoint('md');
}

/**
 * Get current breakpoint name
 * 
 * @returns Current breakpoint name
 * 
 * @example
 * const breakpoint = useCurrentBreakpoint();
 * // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useCurrentBreakpoint(): 'xs' | Breakpoint {
  const is2xl = useBreakpoint('2xl');
  const isXl = useBreakpoint('xl');
  const isLg = useBreakpoint('lg');
  const isMd = useBreakpoint('md');
  const isSm = useBreakpoint('sm');

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}
