'use server';

// ROOT PATH: src/app/actions/support.actions.ts
// SUPPORT-01 — support tickets with a chat thread.
//
// Every read/write goes through here. Who the caller is and which ticket they
// may touch is decided on the SERVER every call (never from a client-supplied
// role). Data access uses the service-role client AFTER those checks, because
// help_tickets / help_ticket_messages have no write rights for browser users
// (see 036_support01_help_tickets.sql). Staff = admin or super_admin.

import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId, getUserRoles } from '@/lib/auth/session';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import {
  HelpTicketRepository,
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type HelpTicketMessageRecord,
  type HelpTicketRecord,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/repositories/help-ticket.repository';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { sendEmail } from '@/lib/notifications/email.client';

/* -------------------------------------------------------------------------- */
/* Caller + helpers                                                           */
/* -------------------------------------------------------------------------- */

const MAX_ACTIVE_TICKETS_PER_CUSTOMER = 5;

async function getCaller() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error('UNAUTHENTICATED');

  const supabase = await createClient();
  const userRowId = await resolvePublicUserId(supabase, authUser.id);
  const roles = await getUserRoles(userRowId);
  const isStaff = roles.includes('admin') || roles.includes('super_admin');

  return { supabase, userRowId, isStaff };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Best-effort: a failed email must never fail the customer's request.
async function emailAdmin(subject: string, body: string): Promise<void> {
  try {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!to) return;
    const result = await sendEmail({
      to,
      subject,
      html: `<p>${escapeHtml(body).replace(/\n/g, '<br/>')}</p>`,
    });
    if (!result.success) console.error('[support] admin email failed', result.error);
  } catch (error) {
    console.error('[support] admin email failed', error);
  }
}

async function loadTicketForCaller(
  repo: HelpTicketRepository,
  ticketId: string,
  caller: { userRowId: string; isStaff: boolean }
): Promise<HelpTicketRecord> {
  const ticket = await repo.getById(ticketId);
  if (!ticket) throw new Error('Request not found.');
  if (!caller.isStaff && ticket.customer_id !== caller.userRowId) {
    throw new Error('FORBIDDEN');
  }
  return ticket;
}

const createSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  bookingId: z.string().uuid().nullable().optional(),
  message: z
    .string()
    .trim()
    .min(5, 'Please describe your problem in at least 5 characters.')
    .max(2000, 'Message is too long (2000 characters max).'),
});

const messageSchema = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(2000, 'Message is too long (2000 characters max).');

/* -------------------------------------------------------------------------- */
/* Customer actions                                                           */
/* -------------------------------------------------------------------------- */

export async function createSupportTicket(
  input: unknown
): Promise<ActionResult<{ ticketId: string; reusedExisting: boolean }>> {
  return runAction(async () => {
    const parsed = createSchema.parse(input);
    const caller = await getCaller();

    // A booking can only be attached by the person who owns it. Read with the
    // customer's own session so row-level security is part of the check.
    let bookingNumber: string | null = null;
    let bookingId: string | null = null;
    if (parsed.bookingId) {
      const booking = await new BookingRepository(caller.supabase).getBookingById(
        parsed.bookingId
      );
      if (!booking || booking.customer_id !== caller.userRowId) {
        throw new Error('FORBIDDEN');
      }
      bookingNumber = booking.booking_number;
      bookingId = booking.id;
    }

    const repo = new HelpTicketRepository(createServiceRoleClient());

    // Same problem on the same booking: add to the open request instead of
    // creating a second one.
    const existing = await repo.findActiveDuplicate(
      caller.userRowId,
      bookingId,
      parsed.category
    );
    if (existing) {
      await repo.addMessage({
        ticket_id: existing.id,
        sender_role: 'customer',
        sender_user_id: caller.userRowId,
        message_text: parsed.message,
      });
      await repo.updateTicket(existing.id, {
        status: existing.status === 'awaiting_customer' ? 'open' : existing.status,
        last_message_at: new Date().toISOString(),
        last_sender_role: 'customer',
        customer_last_read_at: new Date().toISOString(),
      });
      return { ticketId: existing.id, reusedExisting: true };
    }

    const active = await repo.countActiveForCustomer(caller.userRowId);
    if (active >= MAX_ACTIVE_TICKETS_PER_CUSTOMER) {
      throw new Error(
        `You already have ${MAX_ACTIVE_TICKETS_PER_CUSTOMER} open requests. Please wait for a reply or close one first.`
      );
    }

    const subject = bookingNumber
      ? `${CATEGORY_LABELS[parsed.category]} · ${bookingNumber}`
      : CATEGORY_LABELS[parsed.category];

    const priority: TicketPriority =
      parsed.category === 'payment' || parsed.category === 'refund' ? 'high' : 'normal';

    const ticket = await repo.createTicket({
      customer_id: caller.userRowId,
      booking_id: bookingId,
      category: parsed.category,
      subject,
      priority,
    });

    await repo.addMessage({
      ticket_id: ticket.id,
      sender_role: 'customer',
      sender_user_id: caller.userRowId,
      message_text: parsed.message,
    });

    await emailAdmin(
      `New support request ${ticket.ticket_number}: ${subject}`,
      `${ticket.ticket_number} (${subject}, priority ${priority})\n\n${parsed.message}`
    );

    return { ticketId: ticket.id, reusedExisting: false };
  });
}

export interface MyTicketRow extends HelpTicketRecord {
  unread: boolean;
  booking_number: string | null;
}

export async function listMyTickets(): Promise<ActionResult<MyTicketRow[]>> {
  return runAction(async () => {
    const caller = await getCaller();
    const admin = createServiceRoleClient();
    const tickets = await new HelpTicketRepository(admin).listForCustomer(
      caller.userRowId
    );

    const bookingIds = [
      ...new Set(tickets.map((t) => t.booking_id).filter((v): v is string => !!v)),
    ];
    const numbers = new Map<string, string>();
    if (bookingIds.length > 0) {
      const { data } = await admin
        .from('bookings')
        .select('id, booking_number')
        .in('id', bookingIds);
      for (const b of data ?? []) numbers.set(b.id as string, b.booking_number as string);
    }

    return tickets.map((t) => ({
      ...t,
      booking_number: t.booking_id ? numbers.get(t.booking_id) ?? null : null,
      unread:
        t.last_sender_role === 'support' &&
        (!t.customer_last_read_at ||
          new Date(t.customer_last_read_at) < new Date(t.last_message_at)),
    }));
  });
}

/* -------------------------------------------------------------------------- */
/* Thread (customer or staff)                                                 */
/* -------------------------------------------------------------------------- */

export interface TicketThread {
  viewerRole: 'customer' | 'support';
  ticket: HelpTicketRecord;
  messages: HelpTicketMessageRecord[];
  bookingNumber: string | null;
  // Shown to staff only, so they can jump straight to the refund screen.
  paymentId: string | null;
  customerLabel: string | null;
}

export async function getTicketThread(
  ticketId: string
): Promise<ActionResult<TicketThread>> {
  return runAction(async () => {
    const caller = await getCaller();
    const admin = createServiceRoleClient();
    const repo = new HelpTicketRepository(admin);

    const ticket = await loadTicketForCaller(repo, ticketId, caller);
    const messages = await repo.listMessages(ticket.id);

    // Mark as read for whoever is looking.
    const now = new Date().toISOString();
    if (caller.isStaff) {
      await repo.updateTicket(ticket.id, { staff_last_read_at: now });
    } else {
      await repo.updateTicket(ticket.id, { customer_last_read_at: now });
    }

    let bookingNumber: string | null = null;
    let paymentId: string | null = null;
    if (ticket.booking_id) {
      const { data: booking } = await admin
        .from('bookings')
        .select('booking_number')
        .eq('id', ticket.booking_id)
        .maybeSingle();
      bookingNumber = (booking?.booking_number as string | undefined) ?? null;

      if (caller.isStaff) {
        const { data: payment } = await admin
          .from('payments')
          .select('id')
          .eq('booking_id', ticket.booking_id)
          .in('status', ['success', 'partially_refunded', 'refunded'])
          .order('initiated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentId = (payment?.id as string | undefined) ?? null;
      }
    }

    let customerLabel: string | null = null;
    if (caller.isStaff) {
      const { data: user } = await admin
        .from('users')
        .select('*')
        .eq('id', ticket.customer_id)
        .maybeSingle();
      const row = (user ?? {}) as Record<string, unknown>;
      const pick = (k: string) => (typeof row[k] === 'string' ? (row[k] as string) : null);
      customerLabel = pick('full_name') ?? pick('name') ?? pick('email') ?? null;
    }

    return {
      viewerRole: caller.isStaff ? 'support' : 'customer',
      ticket,
      messages,
      bookingNumber,
      paymentId,
      customerLabel,
    } as TicketThread;
  });
}

export async function sendTicketMessage(
  ticketId: string,
  messageText: string
): Promise<ActionResult<HelpTicketMessageRecord>> {
  return runAction(async () => {
    const text = messageSchema.parse(messageText);
    const caller = await getCaller();
    const repo = new HelpTicketRepository(createServiceRoleClient());

    const ticket = await loadTicketForCaller(repo, ticketId, caller);
    if (ticket.status === 'closed') {
      throw new Error('This request is closed. Please start a new request.');
    }

    const senderRole = caller.isStaff ? 'support' : 'customer';
    const message = await repo.addMessage({
      ticket_id: ticket.id,
      sender_role: senderRole,
      sender_user_id: caller.userRowId,
      message_text: text,
    });

    const now = new Date().toISOString();
    if (senderRole === 'customer') {
      // A reply re-opens a request that was waiting on them or marked resolved.
      const reopen =
        ticket.status === 'awaiting_customer' || ticket.status === 'resolved';
      await repo.updateTicket(ticket.id, {
        status: reopen ? 'open' : ticket.status,
        resolved_at: reopen ? null : ticket.resolved_at,
        last_message_at: now,
        last_sender_role: 'customer',
        customer_last_read_at: now,
      });
      await emailAdmin(
        `New reply on ${ticket.ticket_number}: ${ticket.subject}`,
        `${ticket.ticket_number}\n\n${text}`
      );
    } else {
      await repo.updateTicket(ticket.id, {
        status: ticket.status === 'open' ? 'awaiting_customer' : ticket.status,
        last_message_at: now,
        last_sender_role: 'support',
        staff_last_read_at: now,
      });
    }

    return message;
  });
}

// Customer: "My problem is solved".
export async function markMyTicketResolved(
  ticketId: string
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const caller = await getCaller();
    const repo = new HelpTicketRepository(createServiceRoleClient());
    const ticket = await loadTicketForCaller(repo, ticketId, caller);
    if (ticket.status === 'closed' || ticket.status === 'resolved') return { ok: true as const };

    await repo.updateTicket(ticket.id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    });
    return { ok: true as const };
  });
}

/* -------------------------------------------------------------------------- */
/* Staff actions                                                              */
/* -------------------------------------------------------------------------- */

export interface AdminTicketRow extends HelpTicketRecord {
  booking_number: string | null;
  customer_label: string | null;
  needs_reply: boolean;
}

export async function listTicketsAdmin(
  filter: TicketStatus | 'active' = 'active'
): Promise<ActionResult<AdminTicketRow[]>> {
  return runAction(async () => {
    const caller = await getCaller();
    if (!caller.isStaff) throw new Error('FORBIDDEN');

    const admin = createServiceRoleClient();
    const tickets = await new HelpTicketRepository(admin).listAll(filter);

    const bookingIds = [
      ...new Set(tickets.map((t) => t.booking_id).filter((v): v is string => !!v)),
    ];
    const userIds = [...new Set(tickets.map((t) => t.customer_id))];

    const numbers = new Map<string, string>();
    if (bookingIds.length > 0) {
      const { data } = await admin
        .from('bookings')
        .select('id, booking_number')
        .in('id', bookingIds);
      for (const b of data ?? []) numbers.set(b.id as string, b.booking_number as string);
    }

    const labels = new Map<string, string>();
    if (userIds.length > 0) {
      const { data } = await admin.from('users').select('*').in('id', userIds);
      for (const u of (data ?? []) as Record<string, unknown>[]) {
        const pick = (k: string) => (typeof u[k] === 'string' ? (u[k] as string) : null);
        const label = pick('full_name') ?? pick('name') ?? pick('email');
        if (label) labels.set(u.id as string, label);
      }
    }

    return tickets.map((t) => ({
      ...t,
      booking_number: t.booking_id ? numbers.get(t.booking_id) ?? null : null,
      customer_label: labels.get(t.customer_id) ?? null,
      needs_reply:
        t.last_sender_role === 'customer' &&
        (t.status === 'open' || t.status === 'in_progress'),
    }));
  });
}

export async function getOpenTicketCountAdmin(): Promise<number> {
  try {
    const caller = await getCaller();
    if (!caller.isStaff) return 0;
    const { count } = await createServiceRoleClient()
      .from('help_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('last_sender_role', 'customer')
      .in('status', ['open', 'in_progress']);
    return count ?? 0;
  } catch {
    return 0;
  }
}

const adminUpdateSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});

export async function updateTicketAdmin(
  input: unknown
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = adminUpdateSchema.parse(input);
    const caller = await getCaller();
    if (!caller.isStaff) throw new Error('FORBIDDEN');

    const repo = new HelpTicketRepository(createServiceRoleClient());
    const ticket = await repo.getById(parsed.ticketId);
    if (!ticket) throw new Error('Request not found.');

    const now = new Date().toISOString();
    await repo.updateTicket(ticket.id, {
      ...(parsed.priority ? { priority: parsed.priority } : {}),
      ...(parsed.status
        ? {
            status: parsed.status,
            resolved_at: parsed.status === 'resolved' ? now : null,
            closed_at: parsed.status === 'closed' ? now : null,
          }
        : {}),
    });
    return { ok: true as const };
  });
}
