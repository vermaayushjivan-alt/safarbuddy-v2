import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { RoomTypeRepository } from '@/lib/repositories/room-type.repository';
import { getRoomInventorySummaryForHotelAdmin } from '@/app/actions/room-inventory.actions';

interface AdminHotelRoomsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default async function AdminHotelRoomsPage({ params }: AdminHotelRoomsPageProps) {
  const { id: hotelId } = await params;

  const supabase = await createClient();
  const hotelRepo = new HotelRepository(supabase);
  const roomRepo = new RoomTypeRepository(supabase);

  const [hotelResult, rooms] = await Promise.all([
    hotelRepo.getHotelById(hotelId),
    roomRepo.getRoomTypesByHotel(hotelId),
  ]);

  if (!hotelResult) {
    notFound();
  }

  const hotel = hotelResult as Record<string, any>;
  const roomList = (rooms || []) as Array<Record<string, unknown>>;

  const roomIds = roomList.map((room) => String(room.id ?? '')).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const todaysInventory = await getRoomInventorySummaryForHotelAdmin(roomIds, today);
  const inventoryByRoom = new Map(todaysInventory.map((row) => [row.room_id, row]));

  const totalRoomTypes = roomList.length;
  const activeRoomTypes = roomList.filter((r) => r.status === 'active').length;

  // "Today" totals are only meaningful for rooms that actually have an
  // inventory row for today — rooms with no inventory set yet are
  // reported separately rather than silently counted as zero.
  const roomsWithInventoryToday = todaysInventory.length;
  const availableToday = todaysInventory.reduce((sum, row) => sum + row.available_rooms, 0);
  const bookedToday = todaysInventory.reduce((sum, row) => sum + row.booked_rooms, 0);
  const blockedToday = todaysInventory.reduce((sum, row) => sum + row.blocked_rooms, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/admin/hotels"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            &larr; Back to Hotels
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {String(hotel.hotel_name ?? 'Room Management')}
          </h1>
          <p className="text-sm text-slate-500">
            Room types, images, pricing, and availability for this hotel.
          </p>
        </div>
        <Link
          href={`/admin/hotels/${hotelId}/rooms/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          + Add Room Type
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Room Types" value={totalRoomTypes} />
        <StatCard label="Active" value={activeRoomTypes} />
        <StatCard label="Available Today" value={availableToday} />
        <StatCard label="Booked Today" value={bookedToday} />
        <StatCard label="Blocked Today" value={blockedToday} />
      </div>

      {totalRoomTypes > 0 && roomsWithInventoryToday < totalRoomTypes && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {totalRoomTypes - roomsWithInventoryToday} of {totalRoomTypes} room type(s) have no
          availability set for today yet — open a room&apos;s Availability page to set it.
        </p>
      )}

      {roomList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
          No room types created for this hotel yet.
        </div>
      ) : (
        <div className="space-y-4">
          {roomList.map((room) => {
            const roomId = String(room.id ?? '');
            const roomName = String(room.room_name ?? '');
            const roomType = room.room_type ? String(room.room_type) : '';
            const bedType = room.bed_type ? String(room.bed_type) : null;
            const roomSizeSqft = room.room_size_sqft ? Number(room.room_size_sqft) : null;
            const capacityAdults = Number(room.capacity_adults ?? 0);
            const capacityChildren = Number(room.capacity_children ?? 0);
            const maxOccupancy = Number(room.max_occupancy ?? 0);
            const basePrice = Number(room.base_price ?? 0);
            const status = String(room.status ?? 'active');
            const inv = inventoryByRoom.get(roomId);

            return (
              <div
                key={roomId}
                className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{roomName}</h2>
                      <StatusBadge status={status} />
                    </div>
                    {roomType && (
                      <p className="text-xs text-slate-500 mt-0.5">{roomType}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">
                      <span>{capacityAdults} Adult{capacityAdults === 1 ? '' : 's'}{capacityChildren > 0 ? `, ${capacityChildren} Child${capacityChildren === 1 ? '' : 'ren'}` : ''}</span>
                      <span>Max Occupancy: {maxOccupancy}</span>
                      {bedType && <span>{bedType}</span>}
                      {roomSizeSqft && <span>{roomSizeSqft} sq ft</span>}
                      <span className="font-medium text-slate-900">₹{basePrice.toLocaleString('en-IN')} base</span>
                    </div>

                    <div className="mt-3 text-xs">
                      {inv ? (
                        <span className="inline-flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-slate-600">
                          <span>Today — Available: <strong className="text-slate-900">{inv.available_rooms}</strong></span>
                          <span>Booked: <strong className="text-slate-900">{inv.booked_rooms}</strong></span>
                          <span>Blocked: <strong className="text-slate-900">{inv.blocked_rooms}</strong></span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">
                          Availability not set for today
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/edit`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/images`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Images
                    </Link>
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/pricing`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Pricing
                    </Link>
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/availability`}
                      className="px-3 py-1.5 text-xs font-medium border border-transparent rounded text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Availability
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
