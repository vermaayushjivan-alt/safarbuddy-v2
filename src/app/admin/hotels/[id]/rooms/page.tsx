import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { RoomTypeRepository } from '@/lib/repositories/room-type.repository';
import { RoomPriceManager } from '@/components/admin/rooms/RoomPriceManager';

interface AdminHotelRoomsPageProps {
  params: Promise<{
    id: string;
  }>;
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

  if (!hotelResult || hotelResult.error || !hotelResult.data) {
    notFound();
  }

  const hotel = hotelResult.data as Record<string, any>;
  const roomList = (rooms || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/hotels"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            &larr; Back to Hotels
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rooms for {String(hotel.name ?? '')}
          </h1>
          <p className="text-sm text-slate-500">
            Manage room types, images, and pricing rates for this hotel.
          </p>
        </div>
        <Link
          href={`/admin/hotels/${hotelId}/rooms/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add New Room Type
        </Link>
      </div>

      {roomList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
          No room types created for this hotel yet.
        </div>
      ) : (
        <div className="space-y-6">
          {roomList.map((room) => {
            const roomId = String(room.id ?? '');
            const roomName = String(room.room_name ?? '');
            const description = room.description ? String(room.description) : '';
            const capacityAdults = Number(room.capacity_adults ?? 0);
            const capacityChildren = Number(room.capacity_children ?? 0);
            const maxOccupancy = Number(room.max_occupancy ?? 0);
            const basePrice = Number(room.base_price ?? 0);

            return (
              <div
                key={roomId}
                className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{roomName}</h2>
                    {description && (
                      <p className="text-sm text-slate-500 mt-1">{description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600">
                      <span>Capacity: {capacityAdults} Adults, {capacityChildren} Children</span>
                      <span>Max Occupancy: {maxOccupancy}</span>
                      <span>Base Price: ₹{basePrice}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/images`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Images
                    </Link>
                    <Link
                      href={`/admin/hotels/${hotelId}/rooms/${roomId}/edit`}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* ROOM-03 Integration: Room Price / Rates Manager */}
                <div className="pt-4 border-t border-slate-100">
                  <RoomPriceManager
                    hotelId={hotelId}
                    roomId={roomId}
                    roomName={roomName}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
