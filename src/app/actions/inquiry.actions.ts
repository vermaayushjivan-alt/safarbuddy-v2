'use server';

// ROOT PATH: src/app/actions/inquiry.actions.ts
// PILOT-01 — public (no-login) enquiry from a hotel page.
//
// Flow: validate -> honeypot -> Turnstile -> rate limits -> confirm hotel is
// real + active -> save to hotel_inquiries (service role) -> email the admin.
// The email is best-effort: the row is saved FIRST, so a mail failure never
// loses a lead.

import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { verifyCaptcha } from '@/lib/security/turnstile';
import {
  firstExceeded,
  getClientIp,
  hashIdentifier,
  tooManyRequestsMessage,
  type RateLimitRule,
} from '@/lib/security/rate-limit';
import { sendEmail } from '@/lib/notifications/email.client';

// Local rules so the shared RATE_LIMITS table stays untouched.
const INQUIRY_PER_IP: RateLimitRule = { limit: 6, windowSeconds: 3_600 };
const INQUIRY_PER_PHONE: RateLimitRule = { limit: 3, windowSeconds: 86_400 };

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a valid date.');

const inquirySchema = z
  .object({
    hotelId: z.string().uuid(),
    name: z.string().trim().min(2, 'Please enter your name.').max(80),
    // Accepts "98765 43210", "+91 98765 43210", "09876543210" -> 10 digits.
    phone: z
      .string()
      .trim()
      .transform((v) => {
        const d = v.replace(/[\s\-()]/g, '');
        // Strip a country/trunk prefix ONLY when the length proves it is one —
        // a real mobile can itself start with "91" (e.g. 9198xxxxxx).
        if (d.startsWith('+91')) return d.slice(3);
        if (d.length === 12 && d.startsWith('91')) return d.slice(2);
        if (d.length === 11 && d.startsWith('0')) return d.slice(1);
        return d;
      })
      .refine((v) => /^[6-9]\d{9}$/.test(v), 'Please enter a valid 10-digit mobile number.'),
    checkIn: isoDate.optional().or(z.literal('').transform(() => undefined)),
    checkOut: isoDate.optional().or(z.literal('').transform(() => undefined)),
    guests: z.coerce.number().int().min(1).max(30).optional(),
    roomTypeId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
    message: z.string().trim().max(500).optional(),
    source: z.string().trim().max(60).optional(),
    // Honeypot: real people never see/fill this field.
    website: z.string().max(200).optional(),
  })
  .refine((v) => !(v.checkIn && v.checkOut) || v.checkOut > v.checkIn, {
    message: 'Check-out must be after check-in.',
    path: ['checkOut'],
  });

export type InquiryResult = { hotelName: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanSource(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().replace(/[^a-z0-9_/-]+/g, '').slice(0, 60);
  return v || null;
}

export async function submitHotelInquiry(
  input: unknown,
  captchaToken?: string
): Promise<ActionResult<InquiryResult>> {
  return runAction(async () => {
    const parsed = inquirySchema.parse(input);

    // Bots fill hidden fields. Pretend success, store nothing.
    if (parsed.website && parsed.website.trim() !== '') {
      return { hotelName: 'the hotel' };
    }

    const captcha = await verifyCaptcha(captchaToken);
    if (!captcha.ok) throw new Error(captcha.error);

    const exceeded = await firstExceeded([
      { scope: 'inquiry-ip', identifier: await getClientIp(), rule: INQUIRY_PER_IP },
      { scope: 'inquiry-phone', identifier: hashIdentifier(parsed.phone), rule: INQUIRY_PER_PHONE },
    ]);
    if (exceeded) {
      throw new Error(tooManyRequestsMessage(exceeded.retryAfterSeconds, 'enquiries'));
    }

    const supabase = createServiceRoleClient();

    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('id, hotel_name, city, status')
      .eq('id', parsed.hotelId)
      .maybeSingle();
    if (hotelError) throw hotelError;
    if (!hotel || hotel.status !== 'active') {
      throw new Error('This hotel is not available for enquiries right now.');
    }

    const source = cleanSource(parsed.source);

    const { data: saved, error: insertError } = await supabase
      .from('hotel_inquiries')
      .insert({
        hotel_id: hotel.id,
        hotel_name: hotel.hotel_name,
        customer_name: parsed.name,
        phone: parsed.phone,
        check_in: parsed.checkIn ?? null,
        check_out: parsed.checkOut ?? null,
        guests: parsed.guests ?? null,
        room_type_id: parsed.roomTypeId ?? null,
        message: parsed.message ? parsed.message : null,
        source,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    // Best-effort admin email — the lead is already safe in the database.
    let emailSent = false;
    try {
      const to = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (to) {
        const waText = `Namaste ${parsed.name}, ChalFirr se bol raha hoon. Aapne ${hotel.hotel_name} ke liye enquiry ki thi.`;
        const waLink = `https://wa.me/91${parsed.phone}?text=${encodeURIComponent(waText)}`;
        const rows: Array<[string, string]> = [
          ['Hotel', `${hotel.hotel_name}${hotel.city ? `, ${hotel.city}` : ''}`],
          ['Name', parsed.name],
          ['Mobile', `+91 ${parsed.phone}`],
          ['Check-in', parsed.checkIn ?? '—'],
          ['Check-out', parsed.checkOut ?? '—'],
          ['Guests', parsed.guests ? String(parsed.guests) : '—'],
          ['Note', parsed.message ?? '—'],
          ['Source', source ?? 'direct'],
        ];
        const html =
          `<h3>New enquiry — ${escapeHtml(hotel.hotel_name)}</h3>` +
          `<table cellpadding="6" style="border-collapse:collapse">` +
          rows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#666">${escapeHtml(k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`
            )
            .join('') +
          `</table>` +
          `<p><a href="${waLink}">Reply on WhatsApp</a> &nbsp;|&nbsp; <a href="tel:+91${parsed.phone}">Call</a></p>`;

        const result = await sendEmail({
          to,
          subject: `[${hotel.hotel_name}] New enquiry — ${parsed.name} (${parsed.phone})`,
          html,
        });
        emailSent = result.success;
        if (!result.success) console.error('[inquiry] admin email failed', result.error);
      } else {
        console.error('[inquiry] ADMIN_NOTIFICATION_EMAIL not configured — email skipped');
      }
    } catch (error) {
      console.error('[inquiry] admin email failed', error);
    }

    if (emailSent) {
      const { error: flagError } = await supabase
        .from('hotel_inquiries')
        .update({ email_sent: true })
        .eq('id', saved.id);
      if (flagError) console.error('[inquiry] could not flag email_sent', flagError);
    }

    return { hotelName: hotel.hotel_name };
  });
}
