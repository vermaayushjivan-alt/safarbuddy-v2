import AgentChat from '@/components/admin/agents/AgentChat';

// Protected by src/app/admin/layout.tsx (requireRole admin/super_admin);
// the server action re-checks the role on every call.
export const maxDuration = 60;

export default function Page() {
  return <AgentChat />;
}
