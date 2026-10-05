import { redirect } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getMyReferralInfo } from '@/app/actions/referral.actions';
import { ReferralShare } from '@/components/referral/ReferralShare';

// REFERRAL-01 — Refer & Earn. Signed-in only: middleware.ts treats
// /referral as a protected route (it is deliberately NOT in
// PUBLIC_ROUTES). Same page shell as src/app/profile/page.tsx.

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function ReferralPage() {
  const info = await getMyReferralInfo();

  // Defensive fallback — middleware already requires a session here.
  if (!info) {
    redirect('/login?redirectTo=/referral');
  }

  const link = `${siteUrl()}/register?ref=${info.code}`;

  return (
    <main className="bg-cream">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-deep">Refer &amp; Earn</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Invite a friend. They get {info.friendPercent}% off when they join, and you get{' '}
            {info.referrerPercent}% off once their first booking is paid.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-deep/15 bg-white p-6">
            <ReferralShare
              code={info.code}
              link={link}
              friendPercent={info.friendPercent}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-deep/15 bg-white p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
                Friends joined
              </p>
              <p className="mt-1 font-display text-3xl text-deep">{info.friendsJoined}</p>
            </div>
            <div className="rounded-2xl border border-deep/15 bg-white p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
                Rewards earned
              </p>
              <p className="mt-1 font-display text-3xl text-deep">{info.friendsRewarded}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-deep/15 bg-white p-6">
            <h2 className="font-heading text-[16px] font-semibold text-deep">My coupons</h2>

            {info.coupons.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink/60">
                No coupons yet. Share your link — your reward appears here once a friend&apos;s
                first booking is paid.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {info.coupons.map((coupon) => {
                  const inactive = coupon.used || coupon.expired;
                  return (
                    <li
                      key={coupon.code}
                      className="flex items-center justify-between rounded-xl border border-deep/10 px-4 py-3"
                    >
                      <div>
                        <p
                          className={`font-heading text-[15px] font-semibold tracking-wide ${
                            inactive ? 'text-ink/40 line-through' : 'text-deep'
                          }`}
                        >
                          {coupon.code}
                        </p>
                        <p className="text-[12px] text-ink/50">
                          {coupon.discountPercent}% off
                          {coupon.maxDiscountAmount != null
                            ? ` (up to ₹${coupon.maxDiscountAmount})`
                            : ''}
                          {' · '}valid till {formatDate(coupon.validUntil)}
                        </p>
                      </div>
                      <span className="text-[12px] font-medium text-ink/50">
                        {coupon.used ? 'Used' : coupon.expired ? 'Expired' : 'Active'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-[12px] text-ink/50">
              Enter the coupon code at checkout. Each coupon works once and only on your account.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
