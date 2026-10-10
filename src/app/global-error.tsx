'use client';

// GOLIVE-18 — last-resort error screen. src/app/error.tsx handles errors
// inside pages; this one handles a crash in the ROOT layout itself, where no
// providers, fonts or Tailwind classes can be trusted — so it uses plain inline
// styles and its own <html>/<body>.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf7f2',
          color: '#0b2f5c',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 24px', opacity: 0.7, lineHeight: 1.5 }}>
            SafarBuddy hit an unexpected problem. Please try again. If it keeps
            happening, contact support and we will help.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0b2f5c',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
