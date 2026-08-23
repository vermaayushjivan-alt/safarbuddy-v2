'use client';

// PUBLIC-02 — minimal dependency-free image carousel.
//
// Root cause this fixes: the public hotel detail page rendered a single
// <Image src={hotel.thumbnail}> and nothing else — no matter how many
// images an admin uploaded via HotelImageManager, only the one marked
// is_primary ever reached the public page (see getHotelGalleryImages in
// hotel.actions.ts for the read-side fix). This component is the
// display side: given a list of image URLs, it renders one at a time
// with prev/next controls and dot indicators, swappable via click/tap.

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: { id: string; publicUrl: string }[];
  alt: string;
  heightClassName?: string;
}

export default function ImageCarousel({
  images,
  alt,
  heightClassName = 'h-72 sm:h-96',
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sky to-deep ${heightClassName}`}
        aria-hidden
      />
    );
  }

  const current = images[Math.min(index, images.length - 1)];

  function goTo(i: number) {
    setIndex((i + images.length) % images.length);
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${heightClassName}`}>
      <Image
        src={current.publicUrl}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 960px"
        className="object-cover"
        priority={index === 0}
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => goTo(index - 1)}
            className="focus-ring absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            aria-label="Next image"
            onClick={() => goTo(index + 1)}
            className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
