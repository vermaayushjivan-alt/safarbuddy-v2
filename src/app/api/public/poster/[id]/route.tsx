import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import campaigns from '@/data/campaigns.json';
import { POST_SCENES } from '@/lib/poster-scene';

export const runtime = 'nodejs';
export const maxDuration = 30;

const W = 1080;
const H = 1350;

// ChalFirr official visual background mapping 
const DYNAMIC_BACKGROUNDS: Record<string, string[]> = {
  mandir: [
    "https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?q=80&w=1080&auto=format&fit=crop", // Ayodhya Ram Mandir / Temples
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1080&auto=format&fit=crop", // Vrindavan Temple Vibes
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1080&auto=format&fit=crop", // Himalayan Temple / Spiritual
  ],
  ghat: [
    "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1080&auto=format&fit=crop", // Kashi Aarti
    "https://images.unsplash.com/photo-1571536802807-30451e3955d8?q=80&w=1080&auto=format&fit=crop", // Assi Ghat Morning
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?q=80&w=1080&auto=format&fit=crop", // Ganges Evening
  ],
  imambara: [
    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1080&auto=format&fit=crop", // Lucknow Rumi Darwaza
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1080&auto=format&fit=crop", // Heritage Palaces
  ],
  boat: [
    "https://images.unsplash.com/photo-1571536802807-30451e3955d8?q=80&w=1080&auto=format&fit=crop", // River Ghat Boat
    "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?q=80&w=1080&auto=format&fit=crop", // Lake Pichola ride
  ],
  chai: [
    "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=1080&auto=format&fit=crop", // Kulhad tea corner
    "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=1080&auto=format&fit=crop", // Local Tea stall
  ],
  road: [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1080&auto=format&fit=crop", // Mountain scenic road
    "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?q=80&w=1080&auto=format&fit=crop", // Road trip Ladakh Highway
  ],
  hills: [
    "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1080&auto=format&fit=crop", // Snow hill peaks Manali
    "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=1080&auto=format&fit=crop", // Green hill valleys Nainital
  ],
  forest: [
    "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=1080&auto=format&fit=crop", // Jim Corbett Jungle Forest
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1080&auto=format&fit=crop", // Pines McLeodGanj
  ],
  stupa: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1080&auto=format&fit=crop", // Sarnath Stupa / Monastery
  ],
  route: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1080&auto=format&fit=crop", // Destination road & itinerary
  ],
  suitcase: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1080&auto=format&fit=crop", // Packing luggage, exploration gear
  ],
  coins: [
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1080&auto=format&fit=crop", // Budget mapping travel
  ],
  bridge: [
    "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1080&auto=format&fit=crop", // Bridges and landscapes
  ],
  ticket: [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1080&auto=format&fit=crop", // Travel Boarding details
  ],
  vote: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1080&auto=format&fit=crop", // Multiple Destinations choices
  ]
};

// Logo & Brand Colors setup matching standard
const LOGO_SVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#123a70"/><stop offset="1" stop-color="#0b2f5c"/></linearGradient><linearGradient id="path" x1="55" y1="150" x2="150" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8c52"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient></defs><circle cx="100" cy="100" r="100" fill="url(#bg)"/><path d="M 56 148 C 56 110, 90 122, 100 100 C 110 78, 96 66, 118 56" fill="none" stroke="#4f8bea" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.5 12" opacity="0.55"/><path d="M 56 148 C 56 110, 90 122, 100 100 C 110 78, 96 66, 118 56" fill="none" stroke="url(#path)" stroke-width="7" stroke-linecap="round"/><circle cx="56" cy="148" r="6.5" fill="#fbf9f4"/><g><path d="M118 30 C 132.6 30 144 41.6 144 56 C 144 75 118 96 118 96 C 118 96 92 75 92 56 C 92 41.6 103.4 30 118 30 Z" fill="#fbf9f4"/><circle cx="118" cy="56" r="12" fill="#ff6a2b"/></g></svg>`;
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`;

const CITIES: [string, string[]][] = [
  ['Ayodhya', ['ayodhya', 'ram mandir', 'saryu', 'hanuman garhi', 'kanak bhawan', 'ram ki paidi']],
  ['Lucknow', ['lucknow', 'hazratganj', 'imambara', 'gomti']],
  ['Varanasi', ['varanasi', 'kashi', 'dashashwamedh', 'assi ghat']],
  ['Prayagraj', ['prayagraj', 'sangam']],
  ['Chitrakoot', ['chitrakoot', 'mandakini']],
  ['Naimisharanya', ['naimisharanya']],
  ['Sarnath', ['sarnath']],
  ['Kushinagar', ['kushinagar']],
];

function detectCity(title: string): string {
  const t = title.toLowerCase();
  const found = CITIES.filter(([, keys]) => keys.some((k) => t.includes(k))).map(([c]) => c);
  return found.length === 1 ? found[0] : 'UP Yatra';
}

const AUDIENCE = [
  'Budget Friendly • Family Ke Saath',
  'Bus, Train Ya Bike — Sabke Liye',
  'Parivaar • Dost • Bujurg',
  'Kam Kharch, Zyada Safar',
  'Sabki Pocket Ka Safar Saathi',
  'Aam Aadmi Ka Apna Safar',
];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = Number(String(rawId).replace(/\.(jpe?g|png)$/i, ''));
  const post = (campaigns as any[]).find((c) => Number(c.id) === id);
  if (!post) return new Response('Post not found', { status: 404 });

  const [fontLatin, fontDeva] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/poppins-latin-700-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/poppins-devanagari-700-normal.woff')),
  ]);

  const sc = POST_SCENES[id] ?? { p: id % 6, motif: 'mandir', variant: id % 3 };
  
  // Background selection: high-resolution photographic background matching the motif
  const images = DYNAMIC_BACKGROUNDS[sc.motif] || DYNAMIC_BACKGROUNDS['mandir'];
  const index = Math.abs(sc.variant) % images.length;
  const scenicBgUrl = images[index];

  const full: string = post.title;
  const colon = full.indexOf(':');
  const headline = colon > 0 ? full.slice(0, colon).trim() : full;
  const sub = colon > 0 ? full.slice(colon + 1).trim() : '';
  const city = detectCity(full);
  const morning = post.slot === 'morning';
  const slotLabel = morning ? 'SUBAH' : post.slot === 'evening' ? 'SHAAM' : 'SAFAR';
  const accent = morning ? '#f2b705' : '#7fb0ff';

  const png = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          position: 'relative',
          fontFamily: 'Poppins',
          backgroundColor: '#0b1b33',
        }}
      >
        {/* Dynamic authentic background photo overlay (100% photographic replacements for the old flat SVG) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scenicBgUrl} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} />

        {/* Enhanced linear shading layer for visual contrast on texts */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: 'flex',
            backgroundImage:
              'linear-gradient(180deg, rgba(5, 13, 26, 0.75) 0%, rgba(5, 13, 26, 0.15) 30%, rgba(5, 13, 26, 0.50) 60%, rgba(5, 13, 26, 0.98) 100%)',
          }}
        />

        {/* Brand Details with top banner logic */}
        <div style={{ position: 'absolute', top: 56, left: 56, display: 'flex', alignItems: 'center' }}>
          <img src={LOGO_URI} width={84} height={84} />
          <div style={{ display: 'flex', marginLeft: 18, fontSize: 46, fontWeight: 700, color: '#fbf9f4' }}>
            Chal<span style={{ color: '#ff8c52' }}>firr</span>
          </div>
        </div>

        {/* Destination display chip */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            right: 56,
            display: 'flex',
            background: '#ff6a2b',
            color: '#ffffff',
            fontSize: 28,
            fontWeight: 700,
            padding: '12px 28px',
            borderRadius: 999,
            letterSpacing: 2,
          }}
        >
          {city.toUpperCase()}
        </div>

        {/* Bottom card content */}
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 56, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
            <div
              style={{
                display: 'flex',
                background: accent,
                color: '#0b1b33',
                fontSize: 26,
                fontWeight: 700,
                padding: '8px 22px',
                borderRadius: 10,
                letterSpacing: 3,
              }}
            >
              DIN {post.day} • {slotLabel}
            </div>
            <div style={{ display: 'flex', marginLeft: 18, color: '#e7eef7', fontSize: 26, fontWeight: 700 }}>
              {AUDIENCE[id % AUDIENCE.length]}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              color: '#ffffff',
              fontSize: headline.length > 34 ? 66 : 78,
              fontWeight: 700,
              lineHeight: 1.12,
              marginBottom: 22,
            }}
          >
            {headline}
          </div>

          <div style={{ display: 'flex', width: 120, height: 8, background: '#ff6a2b', borderRadius: 8, marginBottom: 28 }} />

          {sub ? (
            <div style={{ display: 'flex', color: '#ffd9c2', fontSize: 38, fontWeight: 700, lineHeight: 1.25, marginBottom: 34 }}>
              {sub}
            </div>
          ) : null}

          {/* Branded Foot pill (Call To Action bottom block) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              alignSelf: 'stretch',
              background: 'rgba(251,249,244,0.12)',
              border: '2px solid rgba(251,249,244,0.35)',
              borderRadius: 24,
              padding: '22px 32px',
            }}
          >
            <div style={{ display: 'flex', color: '#fbf9f4', fontSize: 32, fontWeight: 700 }}>
              Apna agla safar plan karo
            </div>
            <div
              style={{
                display: 'flex',
                background: '#ff6a2b',
                color: '#ffffff',
                fontSize: 30,
                fontWeight: 700,
                padding: '14px 30px',
                borderRadius: 16,
              }}
            >
              chalfirr.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: 'Poppins', data: fontLatin, weight: 700, style: 'normal' },
        { name: 'Poppins', data: fontDeva, weight: 700, style: 'normal' },
      ],
    }
  );

  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
