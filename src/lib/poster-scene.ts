// ChalFirr Brand Elements & Dynamic Poster System
export type SceneOpts = { id: number; motif: string; slot: string; variant: number; days?: number; p?: number };

const W = 1080;
const H = 1350;

// ChalFirr official branding badge SVG
export const CHALFIRR_BRAND_MARK = `
<g id="chalfirr-badge" transform="translate(60, 60)">
  <!-- Logo Circle -->
  <circle cx="50" cy="50" r="46" fill="#0b2347" stroke="#ffffff" stroke-width="2"/>
  <!-- Pin Icon -->
  <path d="M50,22 C40,22 32,30 32,40 C32,53 50,74 50,74 C50,74 68,53 68,40 C68,30 60,22 50,22 Z" fill="#ffffff"/>
  <circle cx="50" cy="38" r="7" fill="#ff6a2b"/>
  <!-- Route Line -->
  <path d="M30,68 Q38,58 46,62" fill="none" stroke="#ff6a2b" stroke-width="4" stroke-linecap="round"/>
  <!-- Brand Text -->
  <text x="110" y="48" font-family="'Inter', 'Montserrat', sans-serif" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="0.5">Chal<tspan fill="#ff6a2b">firr</tspan></text>
  <text x="112" y="70" font-family="'Inter', sans-serif" font-size="14" font-weight="500" fill="#d0d7e2" letter-spacing="1">YOUR TRAVEL COMPANION</text>
</g>
`;

// Har motif ke liye authentic high-resolution cinematic background images
const MOTIF_BACKGROUNDS: Record<string, string[]> = {
  mandir: [
    "https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?q=80&w=1080&auto=format&fit=crop", // Ram Mandir / Ayodhya
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1080&auto=format&fit=crop", // Vrindavan Temple
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1080&auto=format&fit=crop", // Himalayan Temple
  ],
  ghat: [
    "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1080&auto=format&fit=crop", // Varanasi Aarti
    "https://images.unsplash.com/photo-1571536802807-30451e3955d8?q=80&w=1080&auto=format&fit=crop", // Assi Ghat Morning
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?q=80&w=1080&auto=format&fit=crop", // Ganga River Dusk
    "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1080&auto=format&fit=crop", // Ganga banks
  ],
  imambara: [
    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1080&auto=format&fit=crop", // Lucknow Rumi Darwaza / Imambara
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1080&auto=format&fit=crop", // Mughal Architectural arches
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1080&auto=format&fit=crop", // Heritage Architecture
  ],
  boat: [
    "https://images.unsplash.com/photo-1571536802807-30451e3955d8?q=80&w=1080&auto=format&fit=crop", // Morning Boat Ride
    "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?q=80&w=1080&auto=format&fit=crop", // Lake Pichola Boat
  ],
  chai: [
    "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=1080&auto=format&fit=crop", // Kulhad Chai street
    "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=1080&auto=format&fit=crop", // Indian Tea morning
    "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1080&auto=format&fit=crop", // Street tea stall vibes
  ],
  road: [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1080&auto=format&fit=crop", // Mountain Highway
    "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?q=80&w=1080&auto=format&fit=crop", // Ladakh Highway
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1080&auto=format&fit=crop", // Coastal Drive
  ],
  hills: [
    "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1080&auto=format&fit=crop", // Manali snow mountains
    "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=1080&auto=format&fit=crop", // Nainital green hills
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1080&auto=format&fit=crop", // Snowy peaks
  ],
  forest: [
    "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=1080&auto=format&fit=crop", // Corbett Forest
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1080&auto=format&fit=crop", // Pine Forest Kasol
  ],
  stupa: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1080&auto=format&fit=crop", // Buddhist Monastery / Stupa
    "https://images.unsplash.com/photo-1600100397608-f010f443b7e7?q=80&w=1080&auto=format&fit=crop", // Ancient Stupa Sarnath
  ],
  route: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1080&auto=format&fit=crop", // Scenic Route
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1080&auto=format&fit=crop", // Rajasthan Tour Route
    "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=1080&auto=format&fit=crop", // Himachal Route
  ],
  suitcase: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1080&auto=format&fit=crop", // Travel packing / luggage
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?q=80&w=1080&auto=format&fit=crop", // Backpack on mountains
  ],
  coins: [
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1080&auto=format&fit=crop", // Budget Travel map
  ],
  vote: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1080&auto=format&fit=crop", // Road trip choice
  ],
  ticket: [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1080&auto=format&fit=crop", // Boarding pass & journey
  ],
  bridge: [
    "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1080&auto=format&fit=crop", // Ram Jhula / Suspension bridge
  ]
};

// Return direct high quality image URL for the scene
export function getSceneImageUrl(o: SceneOpts): string {
  const images = MOTIF_BACKGROUNDS[o.motif] || MOTIF_BACKGROUNDS['mandir'];
  const index = Math.abs(o.variant) % images.length;
  return images[index];
}

// Generates dynamic poster SVG with real photo + ChalFirr branding overlays
export function sceneSvg(o: SceneOpts): string {
  const imgUrl = getSceneImageUrl(o);
  const isEvening = o.slot === 'evening';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Dark gradient for readability -->
    <linearGradient id="overlayGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050d1a" stop-opacity="0.8"/>
      <stop offset="25%" stop-color="#050d1a" stop-opacity="0.2"/>
      <stop offset="65%" stop-color="#050d1a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#050d1a" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Real Background Image -->
  <image href="${imgUrl}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" />

  <!-- Vignette / Lighting Overlay -->
  <rect width="${W}" height="${H}" fill="url(#overlayGrad)" />

  <!-- ChalFirr Branding (Top Left) -->
  ${CHALFIRR_BRAND_MARK}

  <!-- Slot Tag (Top Right) -->
  <g transform="translate(860, 70)">
    <rect width="160" height="42" rx="21" fill="${isEvening ? '#ff6a2b' : '#0b2347'}" opacity="0.9"/>
    <text x="80" y="26" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
      ${isEvening ? 'EVENING' : 'MORNING'}
    </text>
  </g>

  <!-- Bottom CTA Pill Footer -->
  <g transform="translate(60, 1220)">
    <rect width="960" height="64" rx="32" fill="#0b2347" opacity="0.85" stroke="#ff6a2b" stroke-width="1.5"/>
    <text x="480" y="38" font-family="'Inter', sans-serif" font-size="18" font-weight="600" fill="#ffffff" text-anchor="middle">
      Hotels • Resorts • Homestays • Holiday Packages | Compare &amp; Book on ChalFirr
    </text>
  </g>
</svg>`;
}

// 30 posts mapping (Claude ka original data untouched)
export const POST_SCENES: Record<number, { p: number; motif: string; variant: number; days?: number }> = {
  1: { p: 1, motif: 'mandir', variant: 0 },
  2: { p: 2, motif: 'ghat', variant: 1 },
  3: { p: 3, motif: 'route', variant: 0, days: 3 },
  4: { p: 4, motif: 'chai', variant: 1 },
  5: { p: 5, motif: 'mandir', variant: 2 },
  6: { p: 0, motif: 'imambara', variant: 1 },
  7: { p: 1, motif: 'imambara', variant: 2 },
  8: { p: 2, motif: 'chai', variant: 2 },
  9: { p: 3, motif: 'boat', variant: 0 },
  10: { p: 4, motif: 'ghat', variant: 2 },
  11: { p: 5, motif: 'forest', variant: 0 },
  12: { p: 0, motif: 'vote', variant: 0 },
  13: { p: 1, motif: 'hills', variant: 1 },
  14: { p: 2, motif: 'hills', variant: 2 },
  15: { p: 4, motif: 'boat', variant: 1 },
  16: { p: 5, motif: 'chai', variant: 0 },
  17: { p: 5, motif: 'road', variant: 0 },
  18: { p: 0, motif: 'road', variant: 2 },
  19: { p: 1, motif: 'stupa', variant: 1 },
  20: { p: 3, motif: 'ghat', variant: 0 },
  21: { p: 3, motif: 'mandir', variant: 1 },
  22: { p: 5, motif: 'ghat', variant: 3 },
  23: { p: 5, motif: 'suitcase', variant: 1 },
  24: { p: 0, motif: 'coins', variant: 0 },
  25: { p: 1, motif: 'route', variant: 1, days: 2 },
  26: { p: 2, motif: 'bridge', variant: 0 },
  27: { p: 3, motif: 'stupa', variant: 2 },
  28: { p: 4, motif: 'suitcase', variant: 2 },
  29: { p: 5, motif: 'route', variant: 2, days: 5 },
  30: { p: 0, motif: 'ticket', variant: 0 },
};
