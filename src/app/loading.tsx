/**
 * Global Loading State
 * 
 * WHY IT EXISTS:
 * - Show loading indicator during page transitions
 * - Provide visual feedback during data fetching
 * 
 * RESPONSIBILITY:
 * - Display loading spinner/skeleton
 * 
 * SERVER/CLIENT: Server Component
 * 
 * USED BY: Next.js during route transitions
 */

import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Logo, in place of a generic spinner */}
        <Image
          src="/brand/logo-mark.svg"
          alt="SafarBuddy"
          width={56}
          height={56}
          className="h-14 w-14 animate-pulse"
          priority
        />

        {/* Text */}
        <p className="text-sm text-[rgb(var(--color-text-muted))]">
          Loading...
        </p>
      </div>
    </main>
  );
}
