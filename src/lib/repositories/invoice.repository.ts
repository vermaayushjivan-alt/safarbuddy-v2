// src/lib/repositories/invoice.repository.ts
// INVOICE-01 Step 3a — data layer only (RULE 3: no side effects/business
// logic here — snapshot resolution lives in src/lib/invoices/generate-invoice.ts,
// same split notifyBookingCreated/dispatch.ts already uses for CONTACT-02).
//
// One row per booking (booking_id UNIQUE — see migration
// 015_invoice01_invoices.sql). invoice_seq/invoice_number are DB-generated
// (bigserial + generated column, same pattern as
// vendor_settlements.receipt_number) and are therefore never part of
// CreateInvoiceInput below — Postgres fills them in on insert.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface InvoiceRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  payment_id: string | null;
  vendor_id: string | null;

  invoice_seq: number;
  invoice_number: string;

  booking_number: string;
  booking_type: 'hotel' | 'package';

  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;

  item_name: string;
  item_location: string | null;
  vendor_name: string | null;

  check_in_date: string | null;
  check_out_date: string | null;
  travel_date: string | null;
  num_guests: number;

  currency: string;
  subtotal: number | null;
  taxes: number | null;
  discount: number | null;
  coupon_code: string | null;
  coupon_discount_amount: number | null;
  amount_paid: number;

  generated_at: string;
  created_at: string;
  deleted_at: string | null;
}

// Everything the caller must supply. invoice_seq/invoice_number are
// DB-generated (see header); generated_at defaults to now() in the
// schema, so it's optional here rather than required.
export interface CreateInvoiceInput {
  booking_id: string;
  payment_id: string | null;
  vendor_id: string | null;

  booking_number: string;
  booking_type: 'hotel' | 'package';

  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;

  item_name: string;
  item_location: string | null;
  vendor_name: string | null;

  check_in_date: string | null;
  check_out_date: string | null;
  travel_date: string | null;
  num_guests: number;

  currency: string;
  subtotal: number | null;
  taxes: number | null;
  discount: number | null;
  coupon_code: string | null;
  coupon_discount_amount: number | null;
  amount_paid: number;

  generated_at?: string;
}

export class InvoiceRepository extends BaseRepository<InvoiceRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'invoices',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // Called exactly once per booking — from generate-invoice.ts, itself
  // called only from the Cashfree webhook right after confirmBooking()
  // (PAY-02 idempotency already guarantees that call site runs once per
  // successful payment). A duplicate call still can't create a second
  // row: booking_id is UNIQUE at the DB level (migration 015), so a
  // race surfaces as a 23505 -> ConflictError from BaseRepository.create(),
  // which the caller treats as "already generated," not a failure.
  async createInvoice(data: CreateInvoiceInput): Promise<InvoiceRecord> {
    return this.create(data as unknown as Parameters<
      BaseRepository<InvoiceRecord>['create']
    >[0]);
  }

  async getInvoiceById(id: string): Promise<InvoiceRecord | null> {
    return this.findById(id);
  }

  async getInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null> {
    return this.findOne([
      { column: 'booking_id', operator: 'eq', value: bookingId },
    ]);
  }
}

