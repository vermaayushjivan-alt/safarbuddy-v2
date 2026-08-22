// src/app/debug/room-availability/page.tsx
//
// TEMPORARY DIAGNOSTIC PAGE — ROOM-05. Delete this file (and
// RoomAvailabilityDebugClient.tsx in this folder, and
// src/app/actions/_debug-room-availability.actions.ts) once the
// empty-room-picker issue is root-caused and fixed.
//
// Server Component wrapper only. `dynamic = "force-dynamic"` cannot be
// exported from a "use client" file, so the actual UI lives in
// RoomAvailabilityDebugClient.tsx and this file just renders it. This
// forces every request to this path to run fresh instead of being
// served from Vercel's edge cache — without it, the very first
// (pre-deploy) 404 response for this path got cached and kept being
// served even after the real page was deployed.

export const dynamic = "force-dynamic";

import RoomAvailabilityDebugClient from "./RoomAvailabilityDebugClient";

export default function RoomAvailabilityDebugPage() {
  return <RoomAvailabilityDebugClient />;
}
