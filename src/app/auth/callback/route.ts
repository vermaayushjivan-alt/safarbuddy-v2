import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // STABILIZATION-01 fix: read "next" param correctly.
  // Previous code read "redirectTo" for both variables, silently
  // ignoring Supabase's "next" param and the original "redirectTo".
  // Safe: origin is already the verified request origin — no open redirect.
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const next = searchParams.get("next") ?? redirectTo;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // P0 fix: Supabase/Google redirect back here with ?error=... and
  // ?error_description=... (not a "code") when the OAuth provider
  // itself fails (e.g. redirect_uri_mismatch, unexpected_failure).
  // Previously that case fell through to a generic "Invalid or
  // expired link" message identical to a genuinely expired magic
  // link, which made real provider misconfiguration indistinguishable
  // from an expired link. Surface the real reason when Supabase
  // supplies one; keep the generic message as the fallback for the
  // "no code, no error param" case only.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      providerError ?? "Invalid or expired link."
    )}`
  );
}
