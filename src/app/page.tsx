/**
 * Homepage (Placeholder)
 * 
 * WHY IT EXISTS:
 * - Default landing page
 * - Required by Next.js App Router
 * 
 * RESPONSIBILITY:
 * - Display placeholder content until homepage is built
 * 
 * SERVER/CLIENT: Server Component
 * 
 * USED BY: Root route (/)
 */

import { APP } from '@/lib/config/constants';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-[rgb(var(--color-surface))] p-10 shadow-lg">
        {/* Logo Placeholder */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[rgb(var(--color-primary))]">
          <span className="text-2xl font-bold text-white">SB</span>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">
          {APP.NAME}
        </h1>
        
        {/* Tagline */}
        <p className="mt-2 text-lg text-[rgb(var(--color-text-secondary))]">
          {APP.TAGLINE}
        </p>
        
        {/* Description */}
        <p className="mt-4 text-[rgb(var(--color-text-muted))]">
          {APP.DESCRIPTION}
        </p>
        
        {/* Status Badge */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-primary-light))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-primary))]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--color-primary))] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--color-primary))]"></span>
          </span>
          Sprint 1: Foundation Complete
        </div>
        
        {/* Info */}
        <div className="mt-8 rounded-lg bg-[rgb(var(--color-muted))] p-4 text-sm text-[rgb(var(--color-text-secondary))]">
          <p className="font-medium">Project Status:</p>
          <ul className="mt-2 space-y-1">
            <li>✅ Project structure created</li>
            <li>✅ Design tokens configured</li>
            <li>✅ Utility functions ready</li>
            <li>✅ TypeScript configured</li>
            <li>⏳ Design System (Sprint 2)</li>
            <li>⏳ Authentication (Sprint 2)</li>
          </ul>
        </div>
        
        {/* Version */}
        <p className="mt-8 text-xs text-[rgb(var(--color-text-muted))]">
          Version {APP.VERSION} • Built with Next.js 16 + React 19
        </p>
      </div>
    </main>
  );
}
