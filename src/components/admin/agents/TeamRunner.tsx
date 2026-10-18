'use client';

import { useRef, useState } from 'react';
import { teamStep } from '@/app/actions/admin-team.actions';
import {
  SPEAKER_META,
  TEAM_LIMITS,
  type BoardEntry,
  type PlanTask,
  type ReviewResult,
  type Speaker,
  type TeamAgentId,
  type TeamMessage,
  type TeamStepInput,
  type TeamStepResult,
} from '@/lib/ai/team-types';

type Status = 'pending' | 'running' | 'done' | 'revised';
type Phase = 'idle' | 'planning' | 'working' | 'reviewing' | 'finalizing' | 'done' | 'stopped' | 'error';

const EXAMPLES = [
  'Ayodhya Ram Navami season ke liye 30 din ka launch plan: SEO, reels, ads aur hotel partnerships ke saath.',
  'Chhote hotel owners ko SafarBuddy par onboard karne ka poora outreach system banao.',
  'Mobile booking funnel me drop-offs kam karne ka 2 hafte ka action plan banao.',
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const name = (s: Speaker) => `${SPEAKER_META[s].emoji} ${SPEAKER_META[s].label}`;

export default function TeamRunner() {
  const [goal, setGoal] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [approach, setApproach] = useState('');
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [chat, setChat] = useState<TeamMessage[]>([]);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [finalText, setFinalText] = useState('');
  const [activity, setActivity] = useState('');
  const [calls, setCalls] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const stopRef = useRef(false);
  const callsRef = useRef(0);

  const running = phase === 'planning' || phase === 'working' || phase === 'reviewing' || phase === 'finalizing';

  async function call(input: TeamStepInput): Promise<TeamStepResult> {
    if (stopRef.current) throw new Error('STOPPED');
    if (callsRef.current >= TEAM_LIMITS.MAX_CALLS) throw new Error('Call limit reach ho gayi. Jo bana hai wo neeche hai.');
    callsRef.current += 1;
    setCalls(callsRef.current);

    let lastError = 'Something went wrong.';
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await teamStep(input);
      if (res.success) return res.data;
      lastError = res.error;
      if (/permission|signed in/i.test(lastError) || stopRef.current) break;
      if (attempt < 2) await sleep(3000);
    }
    throw new Error(lastError);
  }

  async function run() {
    const text = goal.trim();
    if (text.length < 5 || running) return;

    stopRef.current = false;
    callsRef.current = 0;
    setCalls(0);
    setError('');
    setApproach('');
    setTasks([]);
    setStatus({});
    setBoard([]);
    setChat([]);
    setReview(null);
    setFinalText('');

    // Local mirrors so each step sees the latest state (React state updates are async).
    let plan: PlanTask[] = [];
    let entries: BoardEntry[] = [];
    let messages: TeamMessage[] = [];
    let reviewResult: ReviewResult | null = null;
    let consultsUsed = 0;

    const setEntry = (e: BoardEntry) => {
      entries = [...entries.filter((x) => x.taskId !== e.taskId), e];
      setBoard(entries);
    };
    const addMessage = (m: TeamMessage) => {
      messages = [...messages, m];
      setChat(messages);
    };
    const mark = (id: string, s: Status) => setStatus((prev) => ({ ...prev, [id]: s }));

    try {
      // 1) Manager plans
      setPhase('planning');
      setActivity(`${name('manager')} plan bana raha hai…`);
      const planRes = await call({ step: 'plan', goal: text });
      if (planRes.step !== 'plan') throw new Error('Unexpected plan response.');
      plan = planRes.tasks;
      setApproach(planRes.approach);
      setTasks(plan);
      setStatus(Object.fromEntries(plan.map((t) => [t.id, 'pending' as Status])));

      // 2) Specialists work in order; they hand off notes and ask each other questions
      setPhase('working');
      for (const task of plan) {
        mark(task.id, 'running');
        setActivity(`${name(task.agent)}: ${task.title}`);
        const inbox = messages.filter((m) => m.to === task.agent && m.kind === 'handoff');

        const work = await call({ step: 'work', goal: text, task, board: entries, inbox });
        if (work.step !== 'work') throw new Error('Unexpected work response.');
        setEntry({ taskId: task.id, agent: task.agent, title: task.title, summary: work.summary, deliverable: work.deliverable });
        mark(task.id, 'done');

        for (const h of work.handoffs) addMessage({ from: task.agent, to: h.to, kind: 'handoff', text: h.note });

        const answers: string[] = [];
        for (const ask of work.asks) {
          if (consultsUsed >= TEAM_LIMITS.MAX_CONSULTS) break;
          consultsUsed += 1;
          addMessage({ from: task.agent, to: ask.to, kind: 'ask', text: ask.question });
          setActivity(`${name(ask.to)} ${name(task.agent)} ke sawal ka jawab de raha hai…`);
          const ans = await call({
            step: 'consult',
            goal: text,
            from: task.agent,
            to: ask.to as TeamAgentId,
            question: ask.question,
            context: work.summary,
          });
          if (ans.step !== 'consult') throw new Error('Unexpected consult response.');
          addMessage({ from: ask.to, to: task.agent, kind: 'answer', text: ans.answer });
          answers.push(`${SPEAKER_META[ask.to].label} ka jawab: ${ans.answer}`);
        }

        if (answers.length) {
          setActivity(`${name(task.agent)} teammates ke jawab ke baad kaam improve kar raha hai…`);
          const rev = await call({
            step: 'revise',
            goal: text,
            task,
            previous: work.deliverable,
            feedback: `Teammates ke jawab, inhe apne kaam me use karo:\n${answers.join('\n')}`,
            feedbackFrom: 'manager',
            board: entries,
          });
          if (rev.step !== 'revise') throw new Error('Unexpected revise response.');
          setEntry({ taskId: task.id, agent: task.agent, title: task.title, summary: rev.summary, deliverable: rev.deliverable });
          mark(task.id, 'revised');
        }
      }

      // 3) QA reviewer checks, flagged specialists fix once
      setPhase('reviewing');
      setActivity(`${name('reviewer')} sab ka kaam check kar raha hai…`);
      const rv = await call({ step: 'review', goal: text, tasks: plan, board: entries, chat: messages });
      if (rv.step !== 'review') throw new Error('Unexpected review response.');
      reviewResult = { approved: rv.approved, overall: rv.overall, issues: rv.issues };
      setReview(reviewResult);

      for (const issue of reviewResult.issues.slice(0, TEAM_LIMITS.MAX_REVISIONS)) {
        const task = plan.find((t) => t.id === issue.taskId);
        const current = entries.find((e) => e.taskId === issue.taskId);
        if (!task || !current) continue;
        mark(task.id, 'running');
        setActivity(`${name(task.agent)} QA feedback fix kar raha hai…`);
        const rev = await call({
          step: 'revise',
          goal: text,
          task,
          previous: current.deliverable,
          feedback: issue.problem,
          feedbackFrom: 'reviewer',
          board: entries,
        });
        if (rev.step !== 'revise') throw new Error('Unexpected revise response.');
        setEntry({ ...current, summary: rev.summary, deliverable: rev.deliverable });
        mark(task.id, 'revised');
      }

      // 4) Manager compiles the final result
      setPhase('finalizing');
      setActivity(`${name('manager')} final report bana raha hai…`);
      const fin = await call({ step: 'final', goal: text, board: entries, chat: messages, review: reviewResult });
      if (fin.step !== 'final') throw new Error('Unexpected final response.');
      setFinalText(fin.text);
      setPhase('done');
      setActivity('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      if (msg === 'STOPPED') {
        setPhase('stopped');
      } else {
        setError(msg);
        setPhase('error');
      }
      setActivity('');
    }
  }

  function stop() {
    stopRef.current = true;
    setActivity('Rok raha hu… current step khatam hone do.');
  }

  const fullReport = () =>
    [
      `# Goal\n${goal.trim()}`,
      finalText && `# Final report\n${finalText}`,
      `# Specialist work\n${board.map((e) => `## ${SPEAKER_META[e.agent].label}: ${e.title}\n${e.deliverable}`).join('\n\n')}`,
    ]
      .filter(Boolean)
      .join('\n\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(finalText || fullReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: ignore */
    }
  }

  function download() {
    const blob = new Blob([fullReport()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const icon = (s: Status | undefined) => (s === 'done' ? '✅' : s === 'revised' ? '✨' : s === 'running' ? '⏳' : '⚪');

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white p-3">
        <label htmlFor="team-goal" className="mb-1 block text-sm font-medium">
          Team ko kya karna hai? (goal likho, baaki team khud karegi)
        </label>
        <textarea
          id="team-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={running}
          maxLength={TEAM_LIMITS.MAX_GOAL}
          rows={4}
          placeholder="Jaise: Ayodhya ke liye next month ka booking-growth plan banao"
          className="w-full rounded border p-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={running}
              onClick={() => setGoal(ex)}
              className="rounded-full border px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              {ex.slice(0, 42)}…
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={running || goal.trim().length < 5}
            className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {running ? 'Team kaam kar rahi hai…' : '🚀 Team ko kaam do'}
          </button>
          {running && (
            <button type="button" onClick={stop} className="rounded border px-4 py-2 text-sm">
              ⏹ Stop
            </button>
          )}
          <span className="ml-auto text-xs text-gray-500">
            AI calls: {calls}/{TEAM_LIMITS.MAX_CALLS} • poora run me 3-6 minute lag sakte hain, tab band mat karna
          </span>
        </div>
        {activity && <p className="mt-2 text-sm text-orange-700">{activity}</p>}
        {phase === 'stopped' && <p className="mt-2 text-sm text-gray-600">Run roka gaya. Jo ban chuka hai wo neeche dikh raha hai.</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {tasks.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <h2 className="mb-1 font-semibold">🧑‍💼 Manager ka plan</h2>
          {approach && <p className="mb-2 text-sm text-gray-700">{approach}</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id}>
                {icon(status[t.id])} <b>{name(t.agent)}</b>: {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {chat.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <h2 className="mb-2 font-semibold">💬 Team chat (aapas me baat)</h2>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
            {chat.map((m, i) => (
              <div key={i} className={`rounded p-2 ${m.kind === 'ask' ? 'bg-amber-50' : m.kind === 'answer' ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500">
                  {name(m.from)} → {name(m.to)} • {m.kind === 'ask' ? 'sawal' : m.kind === 'answer' ? 'jawab' : 'handoff note'}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {review && (
        <div className={`rounded-lg border p-3 text-sm ${review.approved ? 'bg-green-50' : 'bg-amber-50'}`}>
          <h2 className="mb-1 font-semibold">🧪 QA Review: {review.approved ? 'Approved' : 'Fixes maange gaye'}</h2>
          <p>{review.overall}</p>
          {review.issues.map((i) => (
            <p key={i.taskId} className="mt-1">
              • {name(i.agent)}: {i.problem}
            </p>
          ))}
        </div>
      )}

      {finalText && (
        <div className="rounded-lg border-2 border-orange-600 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-semibold">📦 Final report</h2>
            <button type="button" onClick={copy} className="ml-auto rounded border px-3 py-1 text-xs">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <button type="button" onClick={download} className="rounded border px-3 py-1 text-xs">
              Download .md
            </button>
          </div>
          <div className="whitespace-pre-wrap text-sm">{finalText}</div>
        </div>
      )}

      {board.length > 0 && (
        <div className="rounded-lg border bg-white p-3">
          <h2 className="mb-2 font-semibold">📂 Specialists ka poora kaam</h2>
          <div className="flex flex-col gap-2">
            {board.map((e) => (
              <details key={e.taskId} className="rounded border p-2">
                <summary className="cursor-pointer text-sm font-medium">
                  {name(e.agent)}: {e.title}
                </summary>
                <p className="mt-1 text-xs text-gray-500">{e.summary}</p>
                <div className="mt-2 whitespace-pre-wrap text-sm">{e.deliverable}</div>
              </details>
            ))}
          </div>
          {!finalText && phase !== 'idle' && !running && (
            <button type="button" onClick={download} className="mt-2 rounded border px-3 py-1 text-xs">
              Download .md (jo ban chuka hai)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
