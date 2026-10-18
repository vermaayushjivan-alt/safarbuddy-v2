import { describe, it, expect } from 'vitest';
import { extractJson, normalizePlan, normalizeReview, parseWork } from '@/lib/ai/team-parse';
import { TEAM_LIMITS } from '@/lib/ai/team-types';

describe('extractJson', () => {
  it('reads fenced JSON with chatter around it', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```\nbye')).toEqual({ a: 1 });
  });
  it('returns null for garbage', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{broken')).toBeNull();
  });
});

describe('normalizePlan', () => {
  it('drops unknown agents, caps tasks, keeps only backward dependencies', () => {
    const tasks = Array.from({ length: 9 }, (_, i) => ({
      id: `t${i + 1}`, agent: 'seo', title: 'x', instruction: 'do it', dependsOn: ['t1', 't9', 'nope'],
    }));
    const plan = normalizePlan({ approach: 'go', tasks: [{ id: 'z', agent: 'hacker', instruction: 'x' }, ...tasks] });
    expect(plan.tasks.length).toBe(TEAM_LIMITS.MAX_TASKS);
    expect(plan.tasks.every((t) => t.agent === 'seo')).toBe(true);
    const ids = plan.tasks.map((t) => t.id);
    plan.tasks.forEach((t, i) => t.dependsOn.forEach((d) => expect(ids.indexOf(d)).toBeLessThan(i)));
  });
  it('throws when nothing usable', () => {
    expect(() => normalizePlan(null)).toThrow();
    expect(() => normalizePlan({ tasks: [{ agent: 'seo', instruction: '' }] })).toThrow();
  });
  it('fixes duplicate ids', () => {
    const plan = normalizePlan({ tasks: [
      { id: 'a', agent: 'seo', instruction: 'one' },
      { id: 'a', agent: 'ads', instruction: 'two' },
    ] });
    expect(new Set(plan.tasks.map((t) => t.id)).size).toBe(2);
  });
});

describe('parseWork', () => {
  const reply = `===SUMMARY===\nShort.\n===DELIVERABLE===\n# Plan\nline\n===HANDOFFS===\n- ads: use the hook\n- self: ignored\n- bogus: ignored\n===ASKS===\nfinance: what is the margin?`;
  it('parses all sections and filters bad targets', () => {
    const w = parseWork(reply, 'self' as never);
    expect(w.summary).toBe('Short.');
    expect(w.deliverable).toContain('# Plan');
    expect(w.handoffs).toEqual([{ to: 'ads', note: 'use the hook' }]);
    expect(w.asks).toEqual([{ to: 'finance', question: 'what is the margin?' }]);
  });
  it('does not let an agent message itself', () => {
    expect(parseWork('===DELIVERABLE===\nx\n===ASKS===\nseo: hi', 'seo').asks).toEqual([]);
  });
  it('falls back to whole reply as deliverable', () => {
    const w = parseWork('Just some text without markers', 'seo');
    expect(w.deliverable).toBe('Just some text without markers');
    expect(w.handoffs).toEqual([]);
  });
});

describe('normalizeReview', () => {
  it('unparseable review does not block', () => {
    expect(normalizeReview(null, {}).approved).toBe(true);
  });
  it('approved only when no issues; ignores unknown task ids', () => {
    const r = normalizeReview(
      { approved: true, overall: 'x', issues: [{ taskId: 't1', problem: 'invented price' }, { taskId: 'zz', problem: 'ghost' }] },
      { t1: 'seo' }
    );
    expect(r.approved).toBe(false);
    expect(r.issues).toEqual([{ taskId: 't1', agent: 'seo', problem: 'invented price' }]);
  });
});
