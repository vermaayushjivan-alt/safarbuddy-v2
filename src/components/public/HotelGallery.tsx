'use client';

// MOBILE-03: app-style hotel photo gallery — full-width hero with back +
// share buttons, swipe / arrows, "2 / 6" counter and a scrollable
// thumbnail strip. Display only: takes the image list the page already
// loads (getHotelGalleryImages). Replaces ImageCarousel on the hotel
// detail page only (ImageCarousel is still used by the room page).

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ShareIcon } from '@/components/layout/nav-icons';

interface HotelGalleryProps {
  images: { id: string; publicUrl: string }[];
  alt: string;
  shareTitle: string;
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export default function HotelGallery({ images, alt, shareTitle }: HotelGalleryProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  function goTo(i: number) {
    if (count === 0) return;
    setIndex((i + count) % count);
  }

  // Keep the active thumbnail centred in the strip (horizontal only, so the
  // page itself never jumps vertically).
  useEffect(() => {
    const strip = stripRef.current;
    const el = thumbRefs.current[safeIndex];
    if (!strip || !el) return;
    strip.scrollTo({
      left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [safeIndex]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push('/hotels');
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: shareTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }

  const current = count > 0 ? images[safeIndex] : null;

  return (
    <div>
      <div
        className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-sky to-deep sm:h-96 sm:rounded-2xl"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (dx < -50) goTo(safeIndex + 1);
          else if (dx > 50) goTo(safeIndex - 1);
        }}
      >
        {current && (
          <Image
            key={current.id}
            src={current.publicUrl}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover"
            priority={safeIndex === 0}
          />
        )}

        {/* Top actions */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="focus-ring absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md transition active:scale-95"
        >
          <BackArrow />
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share this hotel"
          className="focus-ring absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md transition active:scale-95"
        >
          <ShareIcon className="h-5 w-5" />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => goTo(safeIndex - 1)}
              className="focus-ring absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white transition hover:bg-black/60 active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo(safeIndex + 1)}
              className="focus-ring absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white transition hover:bg-black/60 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 font-heading text-[12px] font-medium text-white">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}

        {toast && (
          <span
            role="status"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 px-3.5 py-1.5 text-[12px] font-medium text-white"
          >
            {toast}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div
          ref={stripRef}
          className="mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              type="button"
              aria-label={`Show image ${i + 1}`}
              aria-current={i === safeIndex}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl transition ${
                i === safeIndex
                  ? 'ring-2 ring-deep ring-offset-2'
                  : 'opacity-75 hover:opacity-100'
              }`}
            >
              <Image
                src={img.publicUrl}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
