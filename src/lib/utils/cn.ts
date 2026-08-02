/**
 * Class Name Utility
 * 
 * WHY IT EXISTS:
 * - Merges Tailwind CSS classes intelligently
 * - Handles conditional classes cleanly
 * - Resolves class conflicts (e.g., p-2 vs p-4)
 * 
 * RESPONSIBILITY:
 * - Merge multiple class strings/arrays
 * - Handle conditional classes
 * - Resolve Tailwind class conflicts
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All components for className props
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind conflict resolution
 * 
 * @example
 * cn('p-2 bg-red-500', isActive && 'bg-blue-500', className)
 * // If isActive is true, outputs: "p-2 bg-blue-500"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
