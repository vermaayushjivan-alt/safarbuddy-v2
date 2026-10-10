'use client';

// GOLIVE-14 — "Near me" button for the /hotels page. Location permission is
// asked ONLY when the visitor taps it (never on page load: browsers punish
// unprompted prompts and a "Block" is remembered). Coordinates are rounded to
// 2 decimals (~1 km) before going into the URL.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LocateFixed } from 'lucide-react';

export function NearMeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);

    if (!('geolocation' in navigator)) {
      setMessage('Your browser does not support location. Please search by city.');
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(2);
        const lng = position.coords.longitude.toFixed(2);
        router.push(`/hotels?lat=${lat}&lng=${lng}`);
      },
      (error) => {
        setBusy(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location is blocked for this site. Allow it in your browser settings, or search by city.'
            : 'We could not get your location. Please search by city.'
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="focus-ring inline-flex items-center gap-2 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <LocateFixed size={14} aria-hidden />
        )}
        Hotels near me
      </button>
      {message && <p className="mt-2 text-[12px] text-ink/60">{message}</p>}
    </div>
  );
}
