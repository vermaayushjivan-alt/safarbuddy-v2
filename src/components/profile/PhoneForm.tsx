'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyPhoneAction } from '@/app/actions/profile.actions';

interface PhoneFormProps {
  initialPhone: string | null;
}

export function PhoneForm({ initialPhone }: PhoneFormProps) {
  const router = useRouter();

  const [phone, setPhone] = useState(initialPhone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const result = await updateMyPhoneAction(phone.trim());

      if (!result.success) {
        setError(result.error ?? 'Failed to update phone number.');
        return;
      }

      setSuccess(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {success && !error && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
          Phone number updated.
        </div>
      )}

      <div>
        <label
          htmlFor="phone"
          className="mb-1.5 block text-sm font-semibold text-deep"
        >
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          placeholder="+91 98765 43210"
        />
        <p className="mt-1.5 text-[12px] text-ink/50">
          Required to complete payment on bookings.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="focus-ring rounded-full bg-deep px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-deep-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save phone number'}
      </button>
    </form>
  );
}
