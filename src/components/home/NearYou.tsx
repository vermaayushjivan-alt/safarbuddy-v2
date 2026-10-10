'use client';

// GOLIVE-14 — homepage "Near you" section.
// Idle state is a small card with a button: the browser's location prompt
// appears only after the visitor taps it. If they already allowed location for
// this site earlier, the row loads by itself (no prompt shown).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LocateFixed, Loader2, MapPin } from 'lucide-react';
import { getHotelsNearMe, type NearbyHotel } from '@/app/actions/near-me.actions';
import { slugify } from '@/lib/utils/format';

type Phase = 'idle' | 'locating' | 'loading' | 'done' | 'denied' | 'error';

const RADIUS_KM = 50;

function hotelHref(slug: string, id: string): string {
  const canonical = slug ? slugify(slug) : '';
  return `/hotels/${canonical.length > 0 ? canonical : id}`;
}

function formatDistance(km: number): string {
  return km < 1 ? 'Less than 1 km away' : `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

export default function NearYou() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [items, setItems] = useState<NearbyHotel[]>([]);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPhase('error');
      return;
    }

    setPhase('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // ~1 km precision is plenty and is what we put in links.
        const lat = position.coords.latitude.toFixed(2);
        const lng = position.coords.longitude.toFixed(2);
        setCoords({ lat, lng });
        setPhase('loading');

        const result = await getHotelsNearMe({
          lat: Number(lat),
          lng: Number(lng),
          radiusKm: RADIUS_KM,
          limit: 8,
        });

        if (result.ok) {
          setItems(result.hotels);
          setPhase('done');
        } else {
          setPhase('error');
        }
      },
      (error) => {
        setPhase(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  // Already allowed earlier -> load straight away; otherwise wait for a tap.
  useEffect(() => {
    let cancelled = false;
    if (!('permissions' in navigator)) return;

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === 'granted') locate();
      })
      .catch(() => {
        /* some browsers do not support this query: stay idle */
      });

    return () => {
      cancelled = true;
    };
  }, [locate]);

  const busy = phase === 'locating' || phase === 'loading';

  return (
    <section className="mx-auto max-w-7xl px-6 pt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Near you
          </span>
          <h2 className="mt-1 font-display text-2xl text-deep">Hotels close to your location</h2>
        </div>
        {phase === 'done' && coords && items.length > 0 && (
          <Link
            href={`/hotels?lat=${coords.lat}&lng=${coords.lng}`}
            className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist sm:flex"
          >
            See all near me
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>

      {(phase === 'idle' || busy || phase === 'denied' || phase === 'error') && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-deep/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[13px] leading-relaxed text-ink/65">
            {phase === 'denied'
              ? 'Location is blocked for this site. Allow it in your browser settings, or search by city above.'
              : phase === 'error'
                ? 'We could not get nearby hotels right now. Please try again or search by city.'
                : 'Share your location to see hotels around you, nearest first. We use it only to find hotels and do not store it.'}
          </p>
          <button
            type="button"
            onClick={locate}
            disabled={busy}
            className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <LocateFixed size={14} aria-hidden />
            )}
            {busy ? 'Finding hotels...' : 'Show hotels near me'}
          </button>
        </div>
      )}

      {phase === 'done' && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-deep/15 bg-mist-2 p-5 text-[13px] text-ink/65">
          No SafarBuddy hotels within {RADIUS_KM} km of you yet.{' '}
          <Link href="/hotels" className="font-medium text-deep underline">
            Browse all hotels
          </Link>
          .
        </div>
      )}

      {phase === 'done' && items.length > 0 && (
        <div
          className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
          role="list"
          aria-label="Hotels near you"
        >
          {items.map(({ hotel, distanceKm }) => {
            const hasImage = Boolean(hotel.thumbnail && hotel.thumbnail.trim().length > 0);
            return (
              <Link
                key={hotel.id}
                href={hotelHref(hotel.slug, hotel.id)}
                role="listitem"
                className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] sm:w-auto"
              >
                <div className="relative h-32 overflow-hidden">
                  {hasImage ? (
                    <Image
                      src={hotel.thumbnail as string}
                      alt={hotel.hotel_name}
                      fill
                      sizes="(max-width: 640px) 256px, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-sky to-deep" aria-hidden />
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate font-heading text-[15px] font-semibold text-deep">
                    {hotel.hotel_name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink/55">
                    <MapPin size={11} aria-hidden />
                    {formatDistance(distanceKm)}
                  </p>
                  {hotel.starting_price != null && (
                    <p className="mt-2 text-[12px] text-ink/50">
                      From{' '}
                      <span className="font-display text-lg text-orange">
                        ₹{hotel.starting_price.toLocaleString('en-IN')}
                      </span>{' '}
                      / night
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
