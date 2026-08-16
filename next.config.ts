import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chnybctlzagtdrggjjhg.supabase.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },

  // ROOM/HOTEL IMAGE UPLOAD FIX (400 on POST /admin/.../images):
  // Next.js Server Actions enforce their own request body size cap that
  // is completely separate from application-level validation. The
  // default is 1MB (see
  // https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit).
  // uploadHotelImageAdmin / uploadRoomImageAdmin (src/app/actions/
  // hotel.actions.ts, src/app/actions/room-type.actions.ts) already
  // validate and advertise a 5MB limit to the admin UI
  // (HOTEL_MAX_IMAGE_SIZE_BYTES / ROOM_MAX_IMAGE_SIZE_BYTES), but
  // without this config any upload over ~1MB was rejected by the
  // framework itself before that code ever ran — the app's own file
  // size check never even executes for such a file. This was never
  // configured, so the effective limit silently stayed at 1MB no matter
  // what the admin UI told staff. Set to comfortably cover the app's
  // stated 5MB image limit plus multipart/JSON overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
