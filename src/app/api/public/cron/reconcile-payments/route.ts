// ROOT PATH: src/app/api/public/cron/reconcile-payments/route.ts
// GOLIVE-03 — scheduled payment reconciliation (see lib/payments/reconcile.ts).
//
// Lives under /api/public so middleware does not redirect it to /login (a
// scheduler has no session). Protected instead by a shared secret:
//   Authorization: Bearer <CRON_SECRET>
// Vercel Cron sends exactly this header automatically when the CRON_SECRET
// env var is set. Any other caller (cron-job.org, Supabase, curl) must send
// it too.
//
// RULE 30: if CRON_SECRET is not set the endpoint is switched OFF (503) and
// does nothing — it is never open by default.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { reconcilePayments } from "@/lib/payments/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tokenMatches(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[reconcile] CRON_SECRET is not set — endpoint disabled");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !tokenMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await reconcilePayments(createServiceRoleClient());
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("[reconcile] run failed", error);
    // TODO: alerting — the reconciliation run itself crashed.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
