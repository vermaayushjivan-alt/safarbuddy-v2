/**
 * Environment Variable Type Declarations
 * 
 * WHY IT EXISTS:
 * - Provide TypeScript types for environment variables
 * - Enable autocomplete for process.env
 * 
 * RESPONSIBILITY:
 * - Declare all environment variable types
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: TypeScript compiler
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Node
    NODE_ENV: 'development' | 'production' | 'test';

    // App
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_APP_URL: string;

    // Database
    DATABASE_URL: string;

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

    // Cashfree
    CASHFREE_APP_ID?: string;
    CASHFREE_SECRET_KEY?: string;
    CASHFREE_API_VERSION?: string;
    NEXT_PUBLIC_CASHFREE_ENV?: 'sandbox' | 'production';

    // Email
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    GMAIL_USER?: string;
    GMAIL_APP_PASSWORD?: string;
    ADMIN_NOTIFICATION_EMAIL?: string;

    // Google OAuth
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    // AI
    OPENAI_API_KEY?: string;

    // Maps
    NEXT_PUBLIC_GOOGLE_MAPS_KEY?: string;
  }
}
