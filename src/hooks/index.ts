/**
 * Hooks Index
 * 
 * WHY IT EXISTS:
 * - Single entry point for all custom hooks
 * - Simplified imports
 * 
 * RESPONSIBILITY:
 * - Re-export all hooks
 * 
 * SERVER/CLIENT: Client
 * 
 * USED BY: All client components
 */

export * from './use-debounce';
export * from './use-media-query';
export * from './use-local-storage';
