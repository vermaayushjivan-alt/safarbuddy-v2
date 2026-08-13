import { redirect } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getMyProfile } from '@/app/actions/profile.actions';
import { PhoneForm } from '@/components/profile/PhoneForm';

// P0 fix — PROFILE-01: closes the confirmed /profile 404 (linked from
// ProfileMenu.tsx "My Profile") and gives users a way to set the phone
// number required by initiatePayment() (src/lib/actions/payment.actions.ts).
// Scope is intentionally minimal: read-only email/name, editable phone.
// No new tables/columns — uses the existing users.phone column.
// Navbar/Footer wrapping mirrors other top-level authenticated routes
// (src/app/hotels/[slug]/book/page.tsx, src/app/packages/[id]/book/page.tsx).

export default async function ProfilePage() {
  const profile = await getMyProfile();

  // Defensive fallback — middleware already requires a session for any
  // non-public route, so this should not normally trigger.
  if (!profile) {
    redirect('/login?redirectTo=/profile');
  }

  return (
    <main className="bg-cream">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-deep">My Profile</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Manage your account details.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-deep/15 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
                Name
              </p>
              <p className="mt-1 text-sm text-deep">
                {profile.full_name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
                Email
              </p>
              <p className="mt-1 text-sm text-deep">{profile.email ?? '—'}</p>
            </div>
          </div>

          <hr className="border-deep/10" />

          <PhoneForm initialPhone={profile.phone} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
