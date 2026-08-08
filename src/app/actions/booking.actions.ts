'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole, getAuthUser } from '@/lib/auth/session';
import {
  BookingRepository,
  BookingRecord,
  BookingStatus,
} from '@/lib/repositories/booking.repository';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { PackageRepository } from '@/lib/repositories/package.repository';

// --- BOOKING-01: Hotel + Package bookings, authenticated customers only ---
// Payment is NOT part of this milestone. price_snapshot is always derived
// server-side from the current hotel/package starting_price at creation
// time — never trusted from the client — and never recalculated after
// creation.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.string().regex(DATE_PATTERN, 'Invalid date (expected YYYY-MM-DD)');

const createBookingBaseSchema = z.object({
  booking_type: z.enum(['hotel', 'package']),
  hotel_id: z.string().uuid().nullable().optional(),
  package_id: z.string().uuid().nullable().optional(),
  check_in_date: dateString.nullable().optional(),
  check_out_date: dateString.nullable().optional(),
  travel_date: dateString.nullable().optional(),
  num_guests: z.number().int().min(1, 'At least 1 guest is required'),
});

const createBookingSchema = createBookingBaseSchema.superRefine((val, ctx) => {
  if (val.booking_type === 'hotel') {
    if (!val.hotel_id) {
      ctx.addIssue({ code: 'custom', path: ['hotel_id'], message: 'hotel_id is required for hotel bookings' });
    }
    if (val.package_id) {
      ctx.addIssue({ code: 'custom', path: ['package_id'], message: 'package_id must not be set for hotel bookings' });
    }
    if (!val.check_in_date) {
      ctx.addIssue({ code: 'custom', path: ['check_in_date'], message: 'check_in_date is required for hotel bookings' });
    }
    if (!val.check_out_date) {
      ctx.addIssue({ code: 'custom', path: ['check_out_date'], message: 'check_out_date is required for hotel bookings' });
    }
    if (val.check_in_date && val.check_out_date && val.check_out_date <= val.check_in_date) {
      ctx.addIssue({ code: 'custom', path: ['check_out_date'], message: 'check_out_date must be after check_in_date' });
    }
    if (val.travel_date) {
      ctx.addIssue({ code: 'custom', path: ['travel_date'], message: 'travel_date must not be set for hotel bookings' });
    }
  }

  if (val.booking_type === 'package') {
    if (!val.package_id) {
      ctx.addIssue({ code: 'custom', path: ['package_id'], message: 'package_id is required for package bookings' });
    }
    if (val.hotel_id) {
      ctx.addIssue({ code: 'custom', path: ['hotel_id'], message: 'hotel_id must not be set for package bookings' });
    }
    if (!val.travel_date) {
      ctx.addIssue({ code: 'custom', path: ['travel_date'], message: 'travel_date is required for package bookings' });
    }
    if (val.check_in_date || val.check_out_date) {
      ctx.addIssue({ code: 'custom', path: ['check_in_date'], message: 'check_in_date/check_out_date must not be set for package bookings' });
    }
  }
});

export type CreateBookingInput = z.infer<typeof createBookingBaseSchema>;

const cancelBookingSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, 'A cancellation reason is required').max(500),
});

// --- Customer actions ---

export async function createBooking(input: CreateBookingInput): Promise<BookingRecord> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const parsed = createBookingSchema.parse(input);
  const supabase = await createClient();

  let priceSnapshot: number;

  if (parsed.booking_type === 'hotel') {
    const hotelRepo = new HotelRepository(supabase);
    const hotel = await hotelRepo.getHotelById(parsed.hotel_id as string);
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    priceSnapshot = hotel.starting_price ?? 0;
  } else {
    const packageRepo = new PackageRepository(supabase);
    const pkg = await packageRepo.getPackageById(parsed.package_id as string);
    if (!pkg) {
      throw new Error('Package not found');
    }
    priceSnapshot = pkg.starting_price ?? 0;
  }

  const bookingRepo = new BookingRepository(supabase);

  return bookingRepo.createBooking({
    user_id: authUser.id,
    booking_type: parsed.booking_type,
    hotel_id: parsed.booking_type === 'hotel' ? (parsed.hotel_id as string) : null,
    package_id: parsed.booking_type === 'package' ? (parsed.package_id as string) : null,
    check_in_date: parsed.booking_type === 'hotel' ? (parsed.check_in_date as string) : null,
    check_out_date: parsed.booking_type === 'hotel' ? (parsed.check_out_date as string) : null,
    travel_date: parsed.booking_type === 'package' ? (parsed.travel_date as string) : null,
    num_guests: parsed.num_guests,
    price_snapshot: priceSnapshot,
    currency: 'INR',
    status: 'pending',
    cancellation_reason: null,
    cancelled_at: null,
    created_by: authUser.id,
    updated_by: authUser.id,
  } as Parameters<BookingRepository['createBooking']>[0]);
}

export async function getMyBookings(page: number = 1, limit: number = 20) {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const supabase = await createClient();
  const repo = new BookingRepository(supabase);
  return repo.getMyBookings(authUser.id, page, limit);
}

export async function getMyBookingById(id: string): Promise<BookingRecord | null> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const supabase = await createClient();
  const repo = new BookingRepository(supabase);
  const booking = await repo.getBookingById(id);

  if (!booking || booking.user_id !== authUser.id) {
    return null;
  }

  return booking;
}

export async function cancelMyBooking(input: { id: string; reason: string }): Promise<BookingRecord> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const parsed = cancelBookingSchema.parse(input);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);

  const existing = await repo.getBookingById(parsed.id);
  if (!existing || existing.user_id !== authUser.id) {
    throw new Error('Booking not found');
  }

  if (existing.status !== 'pending' && existing.status !== 'confirmed') {
    throw new Error('Only pending or confirmed bookings can be cancelled');
  }

  return repo.cancelBooking(parsed.id, parsed.reason);
}

// --- Admin actions ---

export async function getAllBookingsAdmin(
  page: number = 1,
  limit: number = 20,
  status?: BookingStatus
) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);
  return repo.getAllBookings(page, limit, status);
}

export async function getBookingByIdAdmin(id: string): Promise<BookingRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);
  return repo.getBookingById(id);
}

export async function confirmBookingAdmin(id: string): Promise<BookingRecord> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);

  const existing = await repo.getBookingById(id);
  if (!existing) {
    throw new Error('Booking not found');
  }
  if (existing.status !== 'pending') {
    throw new Error('Only pending bookings can be confirmed');
  }

  return repo.confirmBooking(id);
}

export async function cancelBookingAdmin(input: { id: string; reason: string }): Promise<BookingRecord> {
  await requireRole(['admin', 'super_admin']);
  const parsed = cancelBookingSchema.parse(input);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);

  const existing = await repo.getBookingById(parsed.id);
  if (!existing) {
    throw new Error('Booking not found');
  }
  if (existing.status !== 'pending' && existing.status !== 'confirmed') {
    throw new Error('Only pending or confirmed bookings can be cancelled');
  }

  return repo.cancelBooking(parsed.id, parsed.reason);
}

export async function completeBookingAdmin(id: string): Promise<BookingRecord> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new BookingRepository(supabase);

  const existing = await repo.getBookingById(id);
  if (!existing) {
    throw new Error('Booking not found');
  }
  if (existing.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be marked completed');
  }

  return repo.completeBooking(id);
}
