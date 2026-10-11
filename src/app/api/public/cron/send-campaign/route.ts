// ROOT PATH: src/app/api/public/cron/send-campaign/route.ts
// LAUNCH-MAIL-01 — the "robot" that sends the launch email, a small batch at
// a time. Same protection as the payment cron: Authorization: Bearer
// <CRON_SECRET>; switched OFF (503) when CRON_SECRET is not set.
// Safe to call as often as you like: every user is emailed at most once,
// and once everyone has it the call just returns zeros.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendLaunchCampaignBatch } from "@/lib/campaigns/send-launch-campaign";

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
    console.error("[launch-campaign] CRON_SECRET is not set — endpoint disabled");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !tokenMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sendLaunchCampaignBatch(createServiceRoleClient());
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("[launch-campaign] run failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
