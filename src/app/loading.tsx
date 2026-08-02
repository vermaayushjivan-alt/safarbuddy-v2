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

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[rgb(var(--color-muted))] border-t-[rgb(var(--color-primary))]" />
        
        {/* Text */}
        <p className="text-sm text-[rgb(var(--color-text-muted))]">
          Loading...
        </p>
      </div>
    </main>
  );
}
