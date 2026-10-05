import type { MetadataRoute } from 'next';

// MOBILE-01: lets phones "Add to Home screen" / install SafarBuddy so it
// opens full-screen like an app. Uses the valid -2 icons (public/icon-192.png
// and icon-512.png were empty files in the uploaded project).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SafarBuddy - Your Travel Companion',
    short_name: 'SafarBuddy',
    description: 'Book hotels, resorts, homestays and holiday packages with SafarBuddy.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbf9f4',
    theme_color: '#0b2f5c',
    icons: [
      { src: '/icon-192-2.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512-2.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
