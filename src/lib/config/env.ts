/**
 * Environment Variables Configuration
 * 
 * WHY IT EXISTS:
 * - Validates all required environment variables at build/startup time
 * - Provides type-safe access to environment variables
 * - Prevents runtime errors from missing configuration
 * 
 * RESPONSIBILITY:
 * - Define and validate all environment variables
 * - Export typed env object for use throughout the app
 * 
 * SERVER/CLIENT: Server-only (contains secrets)
 * 
 * USED BY: All modules that need configuration (auth, payments, email, etc.)
 */

import { z } from 'zod';

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Cashfree
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_API_VERSION: z.string().default('2023-08-01'),
  
  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().default('noreply@safarbuddy.com'),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // AI
  OPENAI_API_KEY: z.string().optional(),
});

/**
 * Client-side environment variables schema
 * Only NEXT_PUBLIC_ prefixed variables are available on the client
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('SafarBuddy'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: z.string().optional(),
});

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  // On the server, validate all variables
  if (typeof window === 'undefined') {
    const parsed = serverEnvSchema.safeParse(process.env);
    
    if (!parsed.success) {
      console.error('❌ Invalid environment variables:');
      console.error(parsed.error.flatten().fieldErrors);
      throw new Error('Invalid environment variables');
    }
    
    return parsed.data;
  }
  
  // On the client, only validate public variables
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CASHFREE_ENV: process.env.NEXT_PUBLIC_CASHFREE_ENV,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
  });
  
  if (!parsed.success) {
    console.error('❌ Invalid client environment variables');
    throw new Error('Invalid client environment variables');
  }
  
  return parsed.data;
}

/**
 * Validated environment variables
 * Use this instead of process.env directly
 */
export const env = validateEnv();

/**
 * Type-safe environment variable access
 */
export type Env = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
