// ROOT PATH: src/lib/campaigns/send-launch-campaign.ts
// LAUNCH-MAIL-01 — sends the launch announcement to existing users, a small
// batch per run, each user at most once.
//
// Safety rules:
//  * A row is CLAIMED in campaign_sends before sending (insert, ignore
//    duplicates). Two overlapping runs can never both send to the same user.
//  * A crash after claiming leaves status "sending": it is NOT retried
//    automatically (a possible duplicate email is worse than a missed one).
//  * "failed" rows are retried up to MAX_ATTEMPTS times.
//  * Never throws for a single bad address; returns a summary instead.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/notifications/email.client";
import { getSiteUrl } from "@/lib/seo/site";
import {
  LAUNCH_CAMPAIGN_ID,
  LAUNCH_EMAIL_SUBJECT,
  buildLaunchEmailHtml,
} from "@/lib/campaigns/launch-email";

const BATCH_SIZE = 15; // Gmail-friendly and well inside the 60 s route limit
const MAX_ATTEMPTS = 3;
const USER_SCAN_LIMIT = 2000;

export interface CampaignSummary {
  campaign: string;
  claimed: number;
  sent: number;
  failed: number;
  retried: number;
  remaining: number;
}

interface Recipient {
  user_id: string;
  email: string;
  full_name: string | null;
}

function looksLikeEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
    !value.endsWith("@deleted.invalid")
  );
}

async function deliver(
  supabase: SupabaseClient,
  recipient: Recipient,
  siteUrl: string
): Promise<boolean> {
  const result = await sendEmail({
    to: recipient.email,
    subject: LAUNCH_EMAIL_SUBJECT,
    html: buildLaunchEmailHtml({ siteUrl, fullName: recipient.full_name }),
  });

  const { error } = await supabase
    .from("campaign_sends")
    .update(
      result.success
        ? { status: "sent", sent_at: new Date().toISOString(), error: null }
        : { status: "failed", error: result.error.slice(0, 500) }
    )
    .eq("campaign", LAUNCH_CAMPAIGN_ID)
    .eq("user_id", recipient.user_id);

  if (error) {
    console.error("[launch-campaign] could not record result", {
      userId: recipient.user_id,
      error,
    });
  }
  if (!result.success) {
    console.error("[launch-campaign] send failed", {
      userId: recipient.user_id,
      error: result.error,
    });
  }
  return result.success;
}

export async function sendLaunchCampaignBatch(
  supabase: SupabaseClient
): Promise<CampaignSummary> {
  const siteUrl = getSiteUrl();
  const summary: CampaignSummary = {
    campaign: LAUNCH_CAMPAIGN_ID,
    claimed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
    remaining: 0,
  };

  // 1) Everyone who can receive it.
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(USER_SCAN_LIMIT);
  if (usersError) throw usersError;

  const eligible: Recipient[] = (users ?? [])
    .filter((u) => looksLikeEmail(u.email))
    .map((u) => ({
      user_id: u.id as string,
      email: (u.email as string).trim().toLowerCase(),
      full_name: (u.full_name as string | null) ?? null,
    }));

  // 2) Who already has a row for this campaign.
  const { data: existing, error: existingError } = await supabase
    .from("campaign_sends")
    .select("user_id")
    .eq("campaign", LAUNCH_CAMPAIGN_ID)
    .limit(USER_SCAN_LIMIT);
  if (existingError) throw existingError;

  const done = new Set((existing ?? []).map((r) => r.user_id as string));
  const fresh = eligible.filter((r) => !done.has(r.user_id));
  summary.remaining = Math.max(0, fresh.length - BATCH_SIZE);

  // 3) Claim a batch (ignoreDuplicates => only rows WE inserted come back).
  const toClaim = fresh.slice(0, BATCH_SIZE);
  if (toClaim.length > 0) {
    const { data: claimed, error: claimError } = await supabase
      .from("campaign_sends")
      .upsert(
        toClaim.map((r) => ({
          campaign: LAUNCH_CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "sending",
          attempts: 1,
        })),
        { onConflict: "campaign,user_id", ignoreDuplicates: true }
      )
      .select("user_id");
    if (claimError) throw claimError;

    const mine = new Set((claimed ?? []).map((r) => r.user_id as string));
    for (const recipient of toClaim.filter((r) => mine.has(r.user_id))) {
      summary.claimed += 1;
      const ok = await deliver(supabase, recipient, siteUrl);
      if (ok) summary.sent += 1;
      else summary.failed += 1;
    }
  }

  // 4) Retry earlier failures (compare-and-set so runs cannot double-send).
  const room = BATCH_SIZE - summary.claimed;
  if (room > 0) {
    const { data: failedRows, error: failedError } = await supabase
      .from("campaign_sends")
      .select("user_id, email, attempts")
      .eq("campaign", LAUNCH_CAMPAIGN_ID)
      .eq("status", "failed")
      .lt("attempts", MAX_ATTEMPTS)
      .limit(room);
    if (failedError) throw failedError;

    for (const row of failedRows ?? []) {
      const { data: won, error: casError } = await supabase
        .from("campaign_sends")
        .update({ status: "sending", attempts: (row.attempts as number) + 1 })
        .eq("campaign", LAUNCH_CAMPAIGN_ID)
        .eq("user_id", row.user_id as string)
        .eq("status", "failed")
        .eq("attempts", row.attempts as number)
        .select("user_id");
      if (casError || !won || won.length === 0) continue;

      const person = eligible.find((r) => r.user_id === row.user_id);
      summary.retried += 1;
      const ok = await deliver(
        supabase,
        {
          user_id: row.user_id as string,
          email: row.email as string,
          full_name: person?.full_name ?? null,
        },
        siteUrl
      );
      if (ok) summary.sent += 1;
      else summary.failed += 1;
    }
  }

  return summary;
}
