import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAllCouponsAdmin, createCouponAdmin } from '@/app/actions/coupon.actions';
import { createClient } from '@/lib/supabase/server';
import { VendorRepository } from '@/lib/repositories/vendor.repository';

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const { data: coupons, total, totalPages, hasNext, hasPrev } = await getAllCouponsAdmin(
    page,
    20
  );

  const supabase = await createClient();
  const vendorRepo = new VendorRepository(supabase);
  const { data: vendors } = await vendorRepo.getAllVendors(1, 200);

  async function handleCreate(formData: FormData) {
    'use server';

    const result = await createCouponAdmin({
      code: formData.get('code') as string,
      description: (formData.get('description') as string) || '',
      discount_type: formData.get('discount_type') as 'percentage' | 'flat',
      discount_value: Number(formData.get('discount_value')),
      max_discount_amount: Number(formData.get('max_discount_amount')) || null,
      min_booking_amount: Number(formData.get('min_booking_amount')) || null,
      scope: formData.get('scope') as 'global' | 'vendor',
      vendor_id: (formData.get('vendor_id') as string) || '',
      valid_from: (formData.get('valid_from') as string) || '',
      valid_until: (formData.get('valid_until') as string) || '',
      is_active: true,
    });

    if (!result.success) {
      redirect(`/admin/coupons?error=${encodeURIComponent(result.error)}`);
    }

    redirect('/admin/coupons');
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl text-deep">Coupons</h1>
      <p className="mt-2 text-[14px] text-ink/60">{total} coupon{total === 1 ? '' : 's'}</p>

      {params.error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-[13px] text-red-700">
          {params.error}
        </p>
      )}

      <form
        action={handleCreate}
        className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-deep/15 bg-white p-5"
      >
        <h2 className="col-span-2 font-heading text-[15px] font-semibold text-deep">
          New coupon
        </h2>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Code</span>
          <input
            type="text"
            name="code"
            required
            placeholder="SAVE20"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] uppercase text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Description (optional)</span>
          <input
            type="text"
            name="description"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Discount type</span>
          <select
            name="discount_type"
            required
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat amount (₹)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Discount value</span>
          <input
            type="number"
            name="discount_value"
            step="0.01"
            min="0.01"
            required
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">
            Max discount cap ₹ (percentage only, optional)
          </span>
          <input
            type="number"
            name="max_discount_amount"
            step="0.01"
            min="0.01"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">
            Minimum booking amount ₹ (optional)
          </span>
          <input
            type="number"
            name="min_booking_amount"
            step="0.01"
            min="0.01"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Scope</span>
          <select
            name="scope"
            required
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          >
            <option value="global">Global — all hotels &amp; packages</option>
            <option value="vendor">Specific vendor only</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">
            Vendor (only if scope = specific vendor)
          </span>
          <select
            name="vendor_id"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          >
            <option value="">— none —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Valid from (optional)</span>
          <input
            type="datetime-local"
            name="valid_from"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Valid until (optional)</span>
          <input
            type="datetime-local"
            name="valid_until"
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <button
          type="submit"
          className="focus-ring col-span-2 mt-2 rounded-lg bg-deep px-4 py-2 text-[13px] font-semibold text-cream transition hover:opacity-90"
        >
          Create Coupon
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Code</th>
              <th className="px-4 py-3 font-heading font-semibold">Discount</th>
              <th className="px-4 py-3 font-heading font-semibold">Scope</th>
              <th className="px-4 py-3 font-heading font-semibold">Used</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-b border-deep/10 last:border-0">
                  <td className="px-4 py-3 font-medium text-deep">{c.code}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {c.discount_type === 'percentage'
                      ? `${c.discount_value}%${c.max_discount_amount ? ` (up to ${formatMoney(c.max_discount_amount)})` : ''}`
                      : formatMoney(c.discount_value)}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {c.scope === 'global' ? 'Global' : c.vendor?.vendor_name ?? 'Vendor'}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{c.usageCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.is_active ? 'bg-green-100 text-green-700' : 'bg-ink/10 text-ink/50'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/coupons/${c.id}`}
                      className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/admin/coupons?page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasPrev ? 'hover:bg-mist' : 'pointer-events-none opacity-40'
            }`}
          >
            Previous
          </Link>
          <span className="text-[13px] text-ink/60">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/coupons?page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasNext ? 'hover:bg-mist' : 'pointer-events-none opacity-40'
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
