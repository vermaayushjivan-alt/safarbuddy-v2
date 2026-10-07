// ROOT PATH: src/app/api/health/route.ts
// GOLIVE-03 — real health check for uptime monitors (UptimeRobot, Better
// Stack, Vercel checks...).
//
// REPLACES a stale 412-line copy of an old Cashfree webhook handler that used
// to live in this file (POST only; a monitor's GET always got 405). The real
// webhook is src/app/api/public/cashfree/webhook/route.ts and is untouched.
//
// 200 {ok:true} when the app is up and the database answers; 503 {ok:false}
// otherwise. Deliberately reveals nothing else (no versions, no error text).
// Public via PUBLIC_ROUTES in middleware.ts.

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      console.error("[health] database check failed", error);
      // TODO: alerting — health check cannot reach the database.
      return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
    }

    return NextResponse.json(
      { ok: true, time: new Date().toISOString() },
      { status: 200, headers: NO_STORE }
    );
  } catch (error) {
    console.error("[health] check threw", error);
    // TODO: alerting — health check failed.
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
}
