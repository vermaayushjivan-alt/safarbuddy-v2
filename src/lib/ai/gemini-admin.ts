import 'server-only';

// Admin-agents Gemini caller. Same model list + fallback idea as
// ai-assistant.actions.ts (left untouched), but with longer output for
// scripts / SEO / pitches. No new npm packages.

const MODELS: string[] = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL?.trim(),
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
    ].filter((m): m is string => !!m)
  )
);

let workingModel: string | null = null;
const RETRYABLE = new Set([500, 502, 503, 504]);
const SKIP_MODEL = new Set([404, 429]);
const REQUEST_TIMEOUT_MS = 40_000;
const TOTAL_BUDGET_MS = 55_000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

export async function callGemini(system: string, contents: GeminiContent[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set in Vercel env.');

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: 3500, temperature: 0.6 },
  });

  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  const started = Date.now();
  let lastStatus = 0;

  modelLoop: for (const model of order) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (Date.now() - started > TOTAL_BUDGET_MS) break modelLoop;
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );
      } catch {
        lastStatus = 0;
        if (attempt < 2) { await sleep(800); continue; }
        continue modelLoop;
      }
      if (res.ok) {
        workingModel = model;
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          promptFeedback?: { blockReason?: string };
        };
        if (data.promptFeedback?.blockReason) return 'Gemini ne yeh request block kar di. Wording badal ke try karo.';
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
        return text || 'Khaali reply aaya, dobara try karo.';
      }
      lastStatus = res.status;
      console.error(`[ADMIN AGENTS] Gemini error model=${model} status=${res.status}`);
      if (RETRYABLE.has(res.status)) {
        if (attempt < 2) { await sleep(800); continue; }
        continue modelLoop;
      }
      if (SKIP_MODEL.has(res.status)) continue modelLoop;
      break modelLoop; // 400/401/403: same on every model
    }
  }
  throw new Error(
    lastStatus === 0 || RETRYABLE.has(lastStatus) || lastStatus === 429
      ? 'Gemini abhi busy hai (ya quota khatam). Thodi der baad try karo.'
      : 'Gemini se jawab nahi mila. API key / model check karo.'
  );
}
