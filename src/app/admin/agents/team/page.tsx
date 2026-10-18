import Link from 'next/link';
import TeamRunner from '@/components/admin/agents/TeamRunner';

// Protected by src/app/admin/layout.tsx (requireRole admin/super_admin);
// the server action re-checks the role on every call.
// maxDuration applies to each single team step (one Gemini call per step).
export const maxDuration = 60;

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Virtual Team: auto mode (sirf admin)</h1>
        <Link href="/admin/agents" className="text-sm text-orange-700 underline">
          Single agent chat
        </Link>
      </div>
      <TeamRunner />
    </div>
  );
}
