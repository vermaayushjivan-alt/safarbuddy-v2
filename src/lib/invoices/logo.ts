// src/lib/invoices/logo.ts
// LOGO-01 (this session) — real embedded logo for the invoice.
//
// @react-pdf/renderer's <Image> component can only rasterize PNG/JPG
// (it does not parse SVG), while the site's actual logo files
// (public/brand/logo-*.svg) are SVGs. `sharp` (added to package.json
// this session) converts the SVG to a PNG buffer at render time —
// sharp bundles its own libvips/librsvg, so this needs no system
// package beyond what `npm install` already pulls in on Vercel.
//
// NOT verified by an actual render in this session — the sandbox this
// was written in has neither network (couldn't run `npm install
// sharp`) nor a working local SVG rasterizer (checked: no
// rsvg-convert, no cairosvg, no gi.Rsvg typelib), so this could not be
// executed end-to-end here. Read the file straight from disk with
// Node's `fs` (this runs server-side only — see 'server-only' import
// in render-invoice-pdf.ts, which is this function's only caller) and
// convert with sharp, which is a standard, widely-used pattern for
// SVG-in-PDF on Vercel. Test this for real (generate one invoice PDF
// and open it) before trusting the logo actually appears — if
// anything about the SVG (its embedded C2PA metadata, seen when this
// file was first inspected) trips up sharp's SVG parser, this will
// throw, which getInvoiceLogoBase64() below catches and treats as "no
// logo" rather than failing the whole invoice.
//
// Cached at module scope after the first successful conversion —
// converted once per server instance, not once per invoice, since the
// logo file never changes at runtime.

import 'server-only';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

let cachedLogoBase64: string | null | undefined; // undefined = not yet attempted

const LOGO_SVG_PATH = path.join(process.cwd(), 'public', 'brand', 'logo-horizontal.svg');
const LOGO_PNG_WIDTH = 560; // matches the SVG's own viewBox width — no upscaling artifacts

export async function getInvoiceLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64 !== undefined) {
    return cachedLogoBase64;
  }

  try {
    const svgBuffer = await readFile(LOGO_SVG_PATH);
    const pngBuffer = await sharp(svgBuffer)
      .resize({ width: LOGO_PNG_WIDTH })
      .png()
      .toBuffer();

    cachedLogoBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (error) {
    console.error('[getInvoiceLogoBase64] failed to render logo PNG — falling back to text wordmark', error);
    cachedLogoBase64 = null;
  }

  return cachedLogoBase64;
}
