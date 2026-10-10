import type { Metadata } from 'next';
import LegalPage, { GRIEVANCE_OFFICER_NAME } from '@/components/legal/LegalPage';
import { footerContact } from '@/data/home';

// GOLIVE-12 — public "how to delete your account" page. App stores and DPDP
// require a way to request deletion WITHOUT being logged in.

export const metadata: Metadata = {
  title: 'Delete your SafarBuddy account',
  description:
    'How to delete your SafarBuddy account and personal data, and what we keep and why.',
};

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;

  const intro =
    done === '1'
      ? 'Your account has been deleted and you have been logged out. Thank you for using SafarBuddy.'
      : 'You can delete your SafarBuddy account and personal data yourself, or ask us to do it.';

  return (
    <LegalPage
      title="Delete your account"
      intro={intro}
      sections={[
        {
          heading: 'Delete it yourself (fastest)',
          body: (
            <>
              <p>
                Log in, open <strong>Profile</strong> from the menu, and choose{' '}
                <strong>Delete my account</strong>. You will be asked for your password (or a fresh
                Google sign-in) and to type DELETE.
              </p>
              <p>
                An account with a pending or confirmed booking, or a refund still being processed,
                cannot be deleted until that is finished. Hotel, vendor and staff accounts are
                closed through support.
              </p>
            </>
          ),
        },
        {
          heading: 'Cannot log in? Ask us to delete it',
          body: (
            <p>
              Email{' '}
              <a className="font-medium text-deep underline" href={`mailto:${footerContact.supportEmail}`}>
                {footerContact.supportEmail}
              </a>{' '}
              from the email address on the account, with the subject &quot;Delete my account&quot;
              {GRIEVANCE_OFFICER_NAME ? ` (addressed to ${GRIEVANCE_OFFICER_NAME}, Grievance Officer)` : ''}.
              We may ask you to confirm it is really you. We acknowledge requests within 48 hours and
              complete them within one month.
            </p>
          ),
        },
        {
          heading: 'What is deleted',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Your name, email address and phone number.</li>
              <li>Your login. You will not be able to sign in again with this account.</li>
              <li>Your name, email and phone on your invoices.</li>
            </ul>
          ),
        },
        {
          heading: 'What we keep, and why',
          body: (
            <p>
              Booking, payment, invoice and settlement records are kept without your personal
              details, because Indian tax and accounting law requires businesses to keep them for
              several years. Support conversations about a booking may also be kept as a record of
              what was agreed. After deletion these records can no longer be linked to you by name,
              email or phone.
            </p>
          ),
        },
      ]}
    />
  );
}
