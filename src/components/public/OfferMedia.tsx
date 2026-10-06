'use client';

// LAUNCH-05 — one component for an offer's banner: a normal image OR a short
// looping video (mp4 / webm). Videos behave like a GIF: muted, looping,
// inline (no fullscreen takeover on iPhone), no controls. They respect the
// phone's "reduce motion" setting (shows the first frame instead) and
// fall back to a plain coloured block if the file cannot play.
//
// Place inside a `relative overflow-hidden` parent and pass
// className="absolute inset-0 h-full w-full object-cover".

import { useEffect, useRef, useState } from 'react';
import { isVideoUrl } from '@/lib/utils/media';

export default function OfferMedia({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const isVideo = isVideoUrl(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React does not reliably render the `muted` attribute on the server;
    // browsers only allow autoplay when it is really set.
    video.muted = true;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduceMotion) {
      video.pause();
      return;
    }

    video.play().catch(() => {
      // Autoplay blocked (e.g. data-saver mode): the first frame stays visible.
    });
  }, [src]);

  if (!isVideo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  if (failed) {
    return <div className={`${className} bg-deep`} aria-hidden />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      className={`${className} bg-deep`}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-label={alt}
      onError={() => setFailed(true)}
    />
  );
}
