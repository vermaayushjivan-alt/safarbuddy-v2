"use client";

import { useState } from "react";
import Image from "next/image";

// Hero/banner image that can never crash the page: if the URL is bad or
// the image fails to load, the gradient fallback is shown instead.
// `unoptimized` skips the /_next/image proxy, so a host missing from
// next.config remotePatterns can no longer throw during render.
export function SafeImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || !src.trim() || failed) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-orange to-orange-2"
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={`object-cover ${className}`}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
