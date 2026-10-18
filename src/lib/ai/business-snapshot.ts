import 'server-only';
import { and, gte, isNull, sql } from 'drizzle-orm';
import { db, bookings } from '@/db';

// READ-ONLY numbers for the Growth and Finance agents. Only call this after
// requireRole(['admin','super_admin']) (the DB connection bypasses RLS).
// Only aggregates from `bookings`: no names, phones, emails or payment data.

export async function getBusinessSnapshot(): Promise<string> {
  try {
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const since14 = new Date(Date.now() - 14 * 86_400_000);
    const notDeleted = isNull(bookings.deletedAt);

    const byStatus = await db
      .select({
        status: bookings.status,
        type: bookings.bookingType,
        n: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${bookings.priceSnapshot}), 0)::text`,
      })
      .from(bookings)
      .where(and(gte(bookings.createdAt, since30), notDeleted))
      .groupBy(bookings.status, bookings.bookingType);

    const daily = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${bookings.createdAt}), 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(and(gte(bookings.createdAt, since14), notDeleted))
      .groupBy(sql`date_trunc('day', ${bookings.createdAt})`)
      .orderBy(sql`date_trunc('day', ${bookings.createdAt})`);

    const lines: string[] = ['BUSINESS SNAPSHOT (read-only, from bookings table; booking created_at; last 30 days):'];
    if (!byStatus.length) lines.push('- No bookings in the last 30 days.');
    for (const r of byStatus) lines.push(`- ${r.type} / ${r.status}: ${r.n} bookings, price_snapshot sum = ${r.total}`);
    lines.push('Daily new bookings (last 14 days): ' + (daily.length ? daily.map((d) => `${d.day}=${d.n}`).join(', ') : 'none'));
    lines.push(
      'NOTE: price_snapshot is booking value as stored, NOT Chalfirr commission/profit. Whether it is per night or per stay is not verified here. Treat small counts as noisy; do not claim causes without evidence.'
    );
    return lines.join('\n');
  } catch (e) {
    console.error('[ADMIN AGENTS] snapshot failed', e);
    return 'BUSINESS SNAPSHOT: unavailable right now (database read failed). Say so; do not guess numbers.';
  }
}
