// MOBILE-03: "Location" block for the public hotel page — embedded map,
// address, and "Open in Maps" / "Directions" buttons. Server component, no
// API key, no new dependency.
//
// Map source, in priority order:
//   1. hotels.latitude / longitude  -> OpenStreetMap embed with a pin
//      (exact; set in the admin hotel form)
//   2. address / city / state       -> Google Maps embed by text search
//      (approximate: Google picks the best match for the text)
//   3. nothing usable               -> no map, address text only
// hotels.google_maps_url (the pasted share link) is used only as the
// "Open in Maps" button target — share links can't be embedded.

import { MapPin, Compass } from 'lucide-react';

interface HotelMapProps {
  hotelName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
}

const isFiniteNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

// Only http(s) links are allowed as a button target (owner-entered text).
const isHttpUrl = (u: string | null): u is string =>
  !!u && /^https?:\/\//i.test(u.trim());

export default function HotelMap({
  hotelName,
  address,
  city,
  state,
  latitude,
  longitude,
  googleMapsUrl,
}: HotelMapProps) {
  const hasCoords =
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0);

  const textQuery = [hotelName, address, city, state].filter(Boolean).join(', ');
  const hasText = !!(address || city);

  // Narrowed once here so the rest of the file never touches a nullable.
  const coords = hasCoords
    ? { lat: latitude as number, lon: longitude as number }
    : null;

  let embedSrc: string | null = null;
  if (coords) {
    const dLon = 0.008;
    const dLat = 0.005;
    const bbox = [
      coords.lon - dLon,
      coords.lat - dLat,
      coords.lon + dLon,
      coords.lat + dLat,
    ].join(',');
    embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      bbox
    )}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`;
  } else if (hasText) {
    embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(textQuery)}&output=embed`;
  }

  const openUrl = isHttpUrl(googleMapsUrl)
    ? googleMapsUrl.trim()
    : coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
      : hasText
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(textQuery)}`
        : null;

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`
    : hasText
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(textQuery)}`
      : null;

  if (!embedSrc && !address && !openUrl) return null;

  const placeLine = [city, state].filter(Boolean).join(', ');

  return (
    <section aria-labelledby="hotel-location-heading" className="mt-8">
      <h2
        id="hotel-location-heading"
        className="font-heading text-[16px] font-semibold text-deep"
      >
        Location
      </h2>

      {(address || placeLine) && (
        <p className="mt-2 flex items-start gap-2 text-[14px] leading-relaxed text-ink/70">
          <MapPin size={16} className="mt-0.5 shrink-0 text-orange" aria-hidden />
          <span>{[address, placeLine].filter(Boolean).join(', ')}</span>
        </p>
      )}

      {embedSrc && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-deep/10 bg-mist">
          <iframe
            title={`Map showing ${hotelName}`}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-56 w-full border-0 sm:h-72"
          />
        </div>
      )}

      {(openUrl || directionsUrl) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex items-center justify-center gap-2 rounded-xl border border-deep/15 bg-white py-2.5 font-heading text-[13px] font-semibold text-deep transition active:scale-[0.98]"
            >
              <MapPin size={15} aria-hidden />
              View on map
            </a>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-deep py-2.5 font-heading text-[13px] font-semibold text-cream transition active:scale-[0.98]"
            >
              <Compass size={15} aria-hidden />
              Directions
            </a>
          )}
        </div>
      )}
    </section>
  );
}
