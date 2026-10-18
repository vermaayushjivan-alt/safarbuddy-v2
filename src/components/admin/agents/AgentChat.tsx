'use client';

import { useRef, useState, useTransition, useEffect } from 'react';
import { askAdminAgent, type AdminAgentTurn } from '@/app/actions/admin-agents.actions';
import type { AdminAgentId } from '@/lib/ai/admin-agents';

const TABS: { id: AdminAgentId; label: string; hint: string }[] = [
  { id: 'growth', label: '🚀 Growth Head', hint: 'Jaise: "Is hafte ke top 3 kaam batao" (bookings ka snapshot usse khud milta hai)' },
  { id: 'partnerships', label: '🏨 Hotel Partnerships', hint: 'Jaise: "Ayodhya ke chhote hotel owner ko WhatsApp pitch + 7 din ka follow-up"' },
  { id: 'ads', label: '📣 Ads Manager', hint: 'Jaise: "Ayodhya stay ke liye Meta ad copy + ₹500/day test plan"' },
  { id: 'sales', label: '🎯 Deal Closer', hint: 'Jaise: "Reddit par stay puchne wale ko reply" ya "tempo traveller operator ko pitch"' },
  { id: 'social', label: '🎬 Social & Reels', hint: 'Jaise: "30 din ka content calendar" ya "30 sec Reel script"' },
  { id: 'seo', label: '✍️ SEO & Content', hint: 'Jaise: "Ayodhya hotels guide + meta + FAQ + JSON-LD"' },
  { id: 'planner', label: '🗺️ Trip Planner', hint: 'Jaise: "Ayodhya 2 din ka itinerary, family of 4, budget batao"' },
  { id: 'support', label: '💬 Support Drafts', hint: 'Customer ka message paste karo, reply draft milega (bhejna aap ko hai)' },
  { id: 'finance', label: '📊 Finance & Ops', hint: 'Jaise: "Pichhle 30 din ka summary" ya "commission 10% par mera margin kya"' },
  { id: 'compliance', label: '📜 Policy & Compliance', hint: 'Jaise: "Hotel partner agreement ka draft" (lawyer/CA se confirm zaroor karna)' },
];

export default function AgentChat() {
  const [agent, setAgent] = useState<AdminAgentId>('growth');
  const [threads, setThreads] = useState<Record<string, AdminAgentTurn[]>>({});
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(-1);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const turns = threads[agent] ?? [];
  const tab = TABS.find((t) => t.id === agent)!;

  // Braces matter: an effect must return nothing or a cleanup function. The old one-line arrow
  // returned scrollIntoView()'s result, which React then tried to call as a cleanup ("i is not a function").
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, pending]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const history = threads[agent] ?? [];
    setThreads((t) => ({ ...t, [agent]: [...history, { role: 'user', content: text }] }));
    setInput('');
    setError('');
    start(async () => {
      const res = await askAdminAgent(agent, history, text);
      if (res.success) setThreads((t) => ({ ...t, [agent]: [...(t[agent] ?? []), { role: 'assistant', content: res.data }] }));
      else setError(res.error);
    });
  }

  async function copy(i: number, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Virtual Team (sirf admin)</h1>
        <a href="/admin/agents/team" className="rounded-full border border-orange-600 px-3 py-1 text-sm text-orange-700">
          🚀 Auto Team mode
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => { setAgent(t.id); setError(''); }}
            className={`rounded-full border px-3 py-1 text-sm ${agent === t.id ? 'border-orange-600 bg-orange-600 text-white' : 'bg-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[50vh] space-y-3 rounded-xl border bg-white p-3">
        {turns.length === 0 && <p className="text-sm text-gray-500">{tab.hint}</p>}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[95%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left text-sm ${t.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-100'}`}>
              {t.content}
            </div>
            {t.role === 'assistant' && (
              <div><button type="button" onClick={() => copy(i, t.content)} className="mt-1 text-xs text-orange-700 underline">{copied === i ? 'Copied ✓' : 'Copy'}</button></div>
            )}
          </div>
        ))}
        {pending && <p className="text-xs text-gray-400">soch raha hai… (30-40 sec lag sakte hain)</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} maxLength={3000} rows={2} placeholder="Kaam likhiye…"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-orange-500" />
        <button disabled={pending} className="rounded-xl bg-orange-600 px-5 text-sm font-medium text-white disabled:opacity-50">Send</button>
      </form>
      <p className="text-xs text-gray-500">Reply copy-paste ke liye hai. Kuch bhi apne aap send/post nahi hota. [CONFIRM] wali cheezein khud verify karo.</p>
    </div>
  );
}
