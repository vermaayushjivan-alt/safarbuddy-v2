// LAUNCH-05 — tiny helper: is this banner URL a video file?
// Looks only at the path extension (query string / hash ignored), so it
// works for Supabase public URLs and for any pasted direct video link.

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const path = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|m4v|mov)$/.test(path);
}
