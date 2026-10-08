// ROOT PATH: src/lib/notifications/refund-email.ts
// GOLIVE-07b — customer email when a refund is PROCESSED (status "success").
// Best-effort: never throws, so it can never break the webhook / cron / admin
// request that triggered it. Sent at most once per refund because the caller
// only invokes it when finalize_refund reports `applied: true`.
// The admin's internal reason is NOT included in the email.

import { sendEmail } from './email.client';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import { resolveRecipient } from '@/lib/invoices/generate-invoice';
import type { SupabaseClientType } from '@/lib/repositories/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyCustomerRefundProcessed(
  supabase: SupabaseClientType,
  input: { bookingId: string; amount: number; currencyCode: string; refundId: string }
): Promise<void> {
  try {
    const booking = await new BookingRepository(supabase).getBookingById(
      input.bookingId
    );
    if (!booking) {
      console.error('[refund-email] booking not found', input.bookingId);
      return;
    }

    const recipient = await resolveRecipient(supabase, booking);
    if (!recipient.email) {
      console.error('[refund-email] no resolvable email for booking', booking.id);
      return;
    }

    const amountLabel = `${input.currencyCode} ${input.amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;

    const html = `
      <p>Hi ${escapeHtml(recipient.name)},</p>
      <p>We have processed a refund of <strong>${escapeHtml(amountLabel)}</strong> for your booking <strong>${escapeHtml(booking.booking_number)}</strong>.</p>
      <p>The amount goes back to the original payment method. Depending on your bank or card issuer, it can take a few working days to show in your account.</p>
      <p>Refund reference: ${escapeHtml(input.refundId)}</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>SafarBuddy</p>
    `;

    const result = await sendEmail({
      to: recipient.email,
      subject: `Refund processed — booking ${booking.booking_number}`,
      html,
    });

    if (!result.success) {
      console.error('[refund-email] send failed', input.refundId, result.error);
    }
  } catch (error) {
    console.error('[refund-email] failed', input.refundId, error);
  }
}
