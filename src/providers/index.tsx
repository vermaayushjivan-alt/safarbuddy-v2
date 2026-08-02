/**
 * Application Providers
 * 
 * WHY IT EXISTS:
 * - Wraps the app with all necessary providers
 * - Centralized provider management
 * - Clean root layout
 * 
 * RESPONSIBILITY:
 * - Compose all context providers
 * - Provide theme, auth, and other global contexts
 * 
 * SERVER/CLIENT: Client (providers typically need client-side features)
 * 
 * USED BY: Root layout (app/layout.tsx)
 */

'use client';

import { type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root providers wrapper
 * Add new providers here as they are created
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {/* 
        Providers will be added here as needed:
        - AuthProvider (Sprint 2)
        - ToastProvider (Sprint 2)
        - ThemeProvider (Future)
        - QueryClientProvider (if using React Query)
      */}
      {children}
    </>
  );
}
