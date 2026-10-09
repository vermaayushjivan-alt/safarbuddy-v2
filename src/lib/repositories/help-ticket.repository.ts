// ROOT PATH: src/lib/repositories/help-ticket.repository.ts
// SUPPORT-01 — support tickets + chat messages. Field names match
// src/db/sql/036_support01_help_tickets.sql. Always used with the SERVICE-ROLE
// client by support.actions.ts, after that file has checked who the caller is.

import type { SupabaseClientType } from './types';

export const TICKET_CATEGORIES = [
  'cancellation',
  'refund',
  'payment',
  'booking_change',
  'hotel_issue',
  'account',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'awaiting_customer',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type TicketSenderRole = 'customer' | 'support';

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  cancellation: 'Cancel my booking',
  refund: 'Refund status',
  payment: 'Payment problem',
  booking_change: 'Change my booking',
  hotel_issue: 'Issue with the hotel',
  account: 'My account',
  other: 'Something else',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  awaiting_customer: 'Waiting for you',
  resolved: 'Resolved',
  closed: 'Closed',
};

export interface HelpTicketRecord {
  id: string;
  ticket_number: string;
  customer_id: string;
  booking_id: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  last_message_at: string;
  last_sender_role: TicketSenderRole | null;
  customer_last_read_at: string | null;
  staff_last_read_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpTicketMessageRecord {
  id: string;
  ticket_id: string;
  sender_role: TicketSenderRole;
  sender_user_id: string | null;
  message_text: string;
  created_at: string;
}

export class HelpTicketRepository {
  constructor(private readonly supabase: SupabaseClientType) {}

  async getById(id: string): Promise<HelpTicketRecord | null> {
    const { data, error } = await this.supabase
      .from('help_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load ticket: ${error.message}`);
    return (data as HelpTicketRecord | null) ?? null;
  }

  async listForCustomer(customerId: string): Promise<HelpTicketRecord[]> {
    const { data, error } = await this.supabase
      .from('help_tickets')
      .select('*')
      .eq('customer_id', customerId)
      .order('last_message_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to load tickets: ${error.message}`);
    return (data ?? []) as HelpTicketRecord[];
  }

  async listAll(status?: TicketStatus | 'active'): Promise<HelpTicketRecord[]> {
    let query = this.supabase
      .from('help_tickets')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200);
    if (status === 'active') {
      query = query.in('status', ['open', 'in_progress', 'awaiting_customer']);
    } else if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load tickets: ${error.message}`);
    return (data ?? []) as HelpTicketRecord[];
  }

  async countActiveForCustomer(customerId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('help_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['open', 'in_progress', 'awaiting_customer']);
    if (error) throw new Error(`Failed to count tickets: ${error.message}`);
    return count ?? 0;
  }

  async findActiveDuplicate(
    customerId: string,
    bookingId: string | null,
    category: TicketCategory
  ): Promise<HelpTicketRecord | null> {
    let query = this.supabase
      .from('help_tickets')
      .select('*')
      .eq('customer_id', customerId)
      .eq('category', category)
      .in('status', ['open', 'in_progress', 'awaiting_customer'])
      .limit(1);
    query = bookingId ? query.eq('booking_id', bookingId) : query.is('booking_id', null);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to check tickets: ${error.message}`);
    return ((data ?? [])[0] as HelpTicketRecord | undefined) ?? null;
  }

  async createTicket(input: {
    customer_id: string;
    booking_id: string | null;
    category: TicketCategory;
    subject: string;
    priority: TicketPriority;
  }): Promise<HelpTicketRecord> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('help_tickets')
      .insert({
        ...input,
        status: 'open',
        last_message_at: now,
        last_sender_role: 'customer',
        customer_last_read_at: now,
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create ticket: ${error.message}`);
    return data as HelpTicketRecord;
  }

  async listMessages(ticketId: string): Promise<HelpTicketMessageRecord[]> {
    const { data, error } = await this.supabase
      .from('help_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) throw new Error(`Failed to load messages: ${error.message}`);
    return (data ?? []) as HelpTicketMessageRecord[];
  }

  async addMessage(input: {
    ticket_id: string;
    sender_role: TicketSenderRole;
    sender_user_id: string;
    message_text: string;
  }): Promise<HelpTicketMessageRecord> {
    const { data, error } = await this.supabase
      .from('help_ticket_messages')
      .insert(input)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to send message: ${error.message}`);
    return data as HelpTicketMessageRecord;
  }

  async updateTicket(
    id: string,
    patch: Partial<
      Pick<
        HelpTicketRecord,
        | 'status'
        | 'priority'
        | 'last_message_at'
        | 'last_sender_role'
        | 'customer_last_read_at'
        | 'staff_last_read_at'
        | 'resolved_at'
        | 'closed_at'
      >
    >
  ): Promise<void> {
    const { error } = await this.supabase
      .from('help_tickets')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update ticket: ${error.message}`);
  }
}
