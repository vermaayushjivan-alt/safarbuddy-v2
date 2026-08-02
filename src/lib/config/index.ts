/**
 * Configuration Exports
 * 
 * WHY IT EXISTS:
 * - Provides a single entry point for all configuration
 * - Simplifies imports throughout the application
 * 
 * RESPONSIBILITY:
 * - Re-export all configuration modules
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All modules
 */

export * from './constants';
// Note: env.ts should be imported directly where needed
// to avoid client-side exposure of server variables
