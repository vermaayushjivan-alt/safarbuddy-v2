// lib/repositories/booking-message.repository.ts
// CHAT-01 — 3-way booking chat repository.
//
// Field names match public.booking_messages created by
// src/db/sql/023_chat01_booking_messages.sql.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export const SENDER_ROLE_VALUES = ['customer', 'hotel', 'admin'] as const;
export type SenderRole = (typeof SENDER_ROLE_VALUES)[number];

export interface BookingMessageRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  sender_role: SenderRole;
  sender_user_id: string | null;
  message_text: string;
  was_redacted: boolean;
  created_at: string;
}

export class BookingMessageRepository extends BaseRepository<BookingMessageRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'booking_messages',
      // No soft delete — a chat message is either there or it isn't;
      // no product requirement for "undo send" surfaced with this
      // feature, so not invented here.
      softDelete: false,
    });
  }

  async listForBooking(bookingId: string): Promise<BookingMessageRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load chat messages: ${error.message}`);
    }

    return (data ?? []) as BookingMessageRecord[];
  }

  async createMessage(data: {
    booking_id: string;
    sender_role: SenderRole;
    sender_user_id: string | null;
    message_text: string;
    was_redacted: boolean;
  }): Promise<BookingMessageRecord> {
    return this.create(data);
  }
}
