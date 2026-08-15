'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  RoomInventoryRepository,
  type RoomInventoryRow,
} from '@/lib/repositories/room-inventory.repository';

// Dashboard summary for /admin/hotels/[id]/rooms: one inventory row per
// room (for the given date) across every room the caller passes in.
// Rooms with no inventory row for that date are simply omitted from the
// result — the page treats a missing entry as "availability not set
// yet" rather than zero (see roomsWithInventoryToday in page.tsx).
//
// This is called directly from a Server Component, not invoked as a
// client-side form action, so — unlike the mutation actions in this
// project — it returns the raw RoomInventoryRow[] instead of an
// ActionResult. The admin layout (src/app/admin/layout.tsx) already
// gates the whole /admin subtree on requireRole(["admin","super_admin"]);
// the check here is a defense-in-depth guard consistent with the other
// read actions in this project (e.g. getRoomPricesAction), not a
// replacement for it.
export async function getRoomInventorySummaryForHotelAdmin(
  roomIds: string[],
  date: string
): Promise<RoomInventoryRow[]> {
  await requireRole(['admin', 'super_admin']);

  if (roomIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const repo = new RoomInventoryRepository(supabase);

  return repo.getInventoryForRoomsOnDate(roomIds, date);
}
