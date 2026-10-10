'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMyAccountAction } from '@/app/actions/account-deletion.actions';

interface DeleteAccountFormProps {
  needsPassword: boolean;
}

export function DeleteAccountForm({ needsPassword }: DeleteAccountFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWorking(true);

    try {
      const result = await deleteMyAccountAction({
        confirmText,
        password: needsPassword ? password : undefined,
      });

      if (!result.success) {
        setError(result.error ?? 'Could not delete your account.');
        return;
      }

      router.push('/delete-account?done=1');
      router.refresh();
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-[16px] font-semibold text-deep">
        Delete my account
      </h2>
      <p className="text-[13px] leading-relaxed text-ink/60">
        This permanently removes your name, email and phone from SafarBuddy and
        you will no longer be able to log in. Past bookings, payments and
        invoices are kept without your personal details, because the law
        requires us to keep accounting records.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {needsPassword && (
            <div>
              <label htmlFor="delete-password" className="mb-1.5 block text-sm font-semibold text-deep">
                Your password
              </label>
              <input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-semibold text-deep">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              required
              className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
              placeholder="DELETE"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={working || confirmText !== 'DELETE'}
              className="focus-ring rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working ? 'Deleting...' : 'Permanently delete my account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
                setPassword('');
                setConfirmText('');
              }}
              className="focus-ring rounded-full border border-deep/15 px-5 py-2.5 text-sm font-semibold text-deep"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
