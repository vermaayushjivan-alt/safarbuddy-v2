import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import campaigns from '@/data/campaigns.json';
import { sceneSvg, POST_SCENES } from '@/lib/poster-scene';

export const runtime = 'nodejs';
export const maxDuration = 30;

const W = 1080;
const H = 1350; // 4:5 portrait: Instagram + Facebook dono ke liye best

// ChalFirr logo mark (public/brand/logo-mark.svg se)
const LOGO_SVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest"> <defs> <linearGradient id="bg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse"> <stop offset="0" stop-color="#123a70"/> <stop offset="1" stop-color="#0b2f5c"/> </linearGradient> <linearGradient id="path" x1="55" y1="150" x2="150" y2="50" gradientUnits="userSpaceOnUse"> <stop offset="0" stop-color="#ff8c52"/> <stop offset="1" stop-color="#ff6a2b"/> </linearGradient> </defs> <circle cx="100" cy="100" r="100" fill="url(#bg)"/> <!-- dotted route --> <path d="M 56 148 C 56 110, 90 122, 100 100 C 110 78, 96 66, 118 56" fill="none" stroke="#4f8bea" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.5 12" opacity="0.55"/> <!-- route line (the journey / "S" shaped journey) --> <path d="M 56 148 C 56 110, 90 122, 100 100 C 110 78, 96 66, 118 56" fill="none" stroke="url(#path)" stroke-width="7" stroke-linecap="round"/> <!-- origin dot --> <circle cx="56" cy="148" r="6.5" fill="#fbf9f4"/> <!-- destination pin --> <g> <path d="M118 30 C 132.6 30 144 41.6 144 56 C 144 75 118 96 118 96 C 118 96 92 75 92 56 C 92 41.6 103.4 30 118 30 Z" fill="#fbf9f4"/> <circle cx="118" cy="56" r="12" fill="#ff6a2b"/> </g> </svg>`;
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

// Har post ke liye alag taglines: har varg, har jeb ke liye
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

  // Is post ka apna illustrated artwork (koi stock photo nahi, isliye kabhi repeat nahi)
  const sc = POST_SCENES[id] ?? { p: id % 6, motif: 'mandir', variant: id % 3 };
  const sceneUri = `data:image/svg+xml;base64,${Buffer.from(
    sceneSvg({ id, slot: post.slot, motif: sc.motif, variant: sc.variant, days: (sc as any).days, p: sc.p })
  ).toString('base64')}`;

  // "Headline: Subline" format me title todo
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
          backgroundImage: 'linear-gradient(160deg, #123a70 0%, #0b1b33 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sceneUri} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }} />

        {/* Dark gradient taaki text hamesha padha jaye */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: 'flex',
            backgroundImage:
              'linear-gradient(180deg, rgba(11,27,51,0.60) 0%, rgba(11,27,51,0.08) 30%, rgba(11,27,51,0.70) 62%, rgba(11,27,51,0.97) 100%)',
          }}
        />

        {/* Logo + brand name */}
        <div style={{ position: 'absolute', top: 56, left: 56, display: 'flex', alignItems: 'center' }}>
          <img src={LOGO_URI} width={84} height={84} />
          <div style={{ display: 'flex', marginLeft: 18, fontSize: 46, fontWeight: 700, color: '#fbf9f4' }}>
            Chal<span style={{ color: '#ff8c52' }}>firr</span>
          </div>
        </div>

        {/* City chip */}
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

        {/* Bottom content */}
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

  // Instagram sirf JPEG leta hai, isliye PNG ko JPEG me badlo
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
