import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCouponByIdAdmin, updateCouponAdmin, setCouponActiveAdmin } from '@/app/actions/coupon.actions';
import { createClient } from '@/lib/supabase/server';
import { VendorRepository } from '@/lib/repositories/vendor.repository';

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

export default async function AdminEditCouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const coupon = await getCouponByIdAdmin(id);
  if (!coupon) notFound();

  // Captured as a plain const so the hoisted `'use server'` function
  // declarations below don't need TypeScript to narrow `coupon` past
  // notFound() across a closure boundary — see handleUpdate/
  // handleToggleActive.
  const currentIsActive = coupon.is_active;

  const supabase = await createClient();
  const vendorRepo = new VendorRepository(supabase);
  const { data: vendors } = await vendorRepo.getAllVendors(1, 200);

  async function handleUpdate(formData: FormData) {
    'use server';

    const result = await updateCouponAdmin(id, {
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
      is_active: currentIsActive,
    });

    if (!result.success) {
      redirect(`/admin/coupons/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect('/admin/coupons');
  }

  async function handleToggleActive() {
    'use server';
    await setCouponActiveAdmin(id, !currentIsActive);
    redirect('/admin/coupons');
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin/coupons" className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline">
        ← All coupons
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-deep">{coupon.code}</h1>
        <form action={handleToggleActive}>
          <button
            type="submit"
            className={`focus-ring rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
              coupon.is_active
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            {coupon.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <form
        action={handleUpdate}
        className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-deep/15 bg-white p-5"
      >
        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Code</span>
          <input
            type="text"
            name="code"
            defaultValue={coupon.code}
            required
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] uppercase text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Description (optional)</span>
          <input
            type="text"
            name="description"
            defaultValue={coupon.description ?? ''}
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Discount type</span>
          <select
            name="discount_type"
            defaultValue={coupon.discount_type}
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
            defaultValue={coupon.discount_value}
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
            defaultValue={coupon.max_discount_amount ?? ''}
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
            defaultValue={coupon.min_booking_amount ?? ''}
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Scope</span>
          <select
            name="scope"
            defaultValue={coupon.scope}
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
            defaultValue={coupon.vendor_id ?? ''}
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
            defaultValue={toDatetimeLocal(coupon.valid_from)}
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-deep">Valid until (optional)</span>
          <input
            type="datetime-local"
            name="valid_until"
            defaultValue={toDatetimeLocal(coupon.valid_until)}
            className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
          />
        </label>

        <button
          type="submit"
          className="focus-ring col-span-2 mt-2 rounded-lg bg-deep px-4 py-2 text-[13px] font-semibold text-cream transition hover:opacity-90"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
