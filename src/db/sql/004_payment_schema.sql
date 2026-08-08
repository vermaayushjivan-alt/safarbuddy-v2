-- SafarBuddy — PAY-01
-- Creates the `payments` table.
--
-- Approved schema specification: PAY-01 Final Approved Schema Document.
-- Additive only — does not modify bookings, users, or any existing table.
-- BOOKING-01 remains completely untouched.
--
-- Relationship:
--   payments.booking_id → bookings.id  (ON DELETE RESTRICT)
--   payments.user_id    → users.id     (ON DELETE RESTRICT)
--
-- Multiple payment attempts per booking are supported (retry model).
-- Refunds are explicitly out of scope for PAY-01.
--
-- Run once against the Supabase project SQL editor,
-- identical to 003_booking01_schema.sql execution method.

create table if not exists public.payments (
  id                  uuid          primary key default gen_random_uuid(),

  -- Booking reference — many payments may exist per booking (retry support)
  booking_id          uuid          not null
                                    references public.bookings(id)
                                    on delete restrict,

  -- Authenticated customer who owns this payment
  user_id             uuid          not null
                                    references public.users(id)
                                    on delete restrict,

  -- Cashfree identifiers
  -- cf_order_id: merchant-supplied order ID sent to Cashfree on order creation.
  --   Format: SF-{first8charsOfBookingId}-{unixTimestampMs}
  --   Max 45 chars, alphanumeric + hyphen only, unique per merchant account.
  -- cf_payment_id: Cashfree-assigned payment ID, populated on webhook receipt.
  cf_order_id         varchar(100)  not null,
  cf_payment_id       varchar(100),

  -- Cashfree payment session token returned on order/session creation.
  -- Used to redirect the customer to Cashfree hosted checkout.
  payment_session_id  text,

  -- Amount and currency.
  -- amount is a snapshot of bookings.price_snapshot at initiation time.
  -- Never recalculated. Never accepted from the client.
  amount              numeric(10,2) not null,
  currency            varchar(3)    not null  default 'INR',

  -- Application-layer payment status.
  -- initiated  = Cashfree order created server-side; customer not yet redirected.
  -- processing = Customer redirected to Cashfree hosted checkout; also set by
  --              webhook PENDING (async payment methods still in progress).
  -- paid       = Webhook verified; Cashfree payment_status = SUCCESS only.
  -- failed     = Webhook verified; Cashfree payment_status = FAILED,
  --              CANCELLED, or USER_DROPPED.
  -- flagged    = Webhook verified; Cashfree payment_status = FLAGGED;
  --              admin manual review required.
  status              varchar(30)   not null  default 'initiated',

  -- Raw Cashfree payment_status string received in webhook payload.
  -- Stored for audit/reconciliation only.
  -- Application always acts on `status`, never directly on cf_payment_status.
  cf_payment_status   varchar(50),

  -- Payment method reported by Cashfree webhook.
  -- e.g. upi, card, netbanking, wallet
  payment_method      varchar(50),

  -- Human-readable failure message from Cashfree webhook payload
  -- (data.payment.payment_message) when status = 'failed'.
  -- Used for customer-facing display and admin audit.
  failure_reason      text,

  -- Lifecycle timestamps
  initiated_at        timestamptz   not null  default now(),
  completed_at        timestamptz,            -- set when status → paid or failed

  -- Standard audit columns (consistent with all SafarBuddy tables)
  created_at          timestamptz   not null  default now(),
  updated_at          timestamptz   not null  default now(),
  deleted_at          timestamptz,
  created_by          uuid,
  updated_by          uuid,

  -- Constraints

  constraint payments_status_check
    check (status in (
      'initiated',
      'processing',
      'paid',
      'failed',
      'flagged'
    )),

  constraint payments_cf_order_id_unique
    unique (cf_order_id)
);

-- Indexes

create index if not exists payments_booking_id_idx
  on public.payments(booking_id);

create index if not exists payments_user_id_idx
  on public.payments(user_id);

create index if not exists payments_status_idx
  on public.payments(status);

create index if not exists payments_cf_order_id_idx
  on public.payments(cf_order_id);

create index if not exists payments_cf_payment_id_idx
  on public.payments(cf_payment_id);
