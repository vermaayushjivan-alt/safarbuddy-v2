// ROOT PATH: src/lib/poster-photos.ts
// City-first photo picker. NO remote URLs: photos live in /public/photos/<folder>/
// Folders: lucknow, ayodhya, varanasi, prayagraj, chitrakoot, naimisharanya, sarnath, kushinagar, up (generic UP)
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(process.cwd(), 'public', 'photos');
const EXT = /\.(jpe?g|png|webp)$/i;

// Only used when the title has no single city. Never maps to non-UP places.
const MOTIF_TO_CITY: Record<string, string> = { imambara: 'lucknow', stupa: 'sarnath' };

async function listFolder(folder: string): Promise<string[]> {
  try {
    const files = (await readdir(join(ROOT, folder))).filter((f) => EXT.test(f)).sort();
    return files.map((f) => join(ROOT, folder, f));
  } catch {
    return [];
  }
}

/** Returns a data-URI JPEG (1080x1350) or null if no suitable local photo exists. */
export async function getPosterPhoto(city: string, motif: string, id: number): Promise<string | null> {
  const folders: string[] = [];
  const slug = city.toLowerCase().replace(/[^a-z]/g, '');
  if (city !== 'UP Yatra') folders.push(slug);
  else if (MOTIF_TO_CITY[motif]) folders.push(MOTIF_TO_CITY[motif]);
  folders.push('up');

  for (const f of folders) {
    const files = await listFolder(f);
    if (!files.length) continue;
    const file = files[Math.abs(id) % files.length];
    const buf = await sharp(await readFile(file)).resize(1080, 1350, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  return null; // caller shows brand gradient — better than a wrong photo
}
