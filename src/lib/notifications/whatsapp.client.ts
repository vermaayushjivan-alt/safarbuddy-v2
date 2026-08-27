// CONTACT-01: WhatsApp notification client — INERT STUB.
//
// No WhatsApp provider has been selected yet. AiSensy requires its
// paid Basic plan (~₹999-1500/month) for API/template sending, and
// Chat Mitra likewise requires its ₹999/month Pro plan for API
// access — neither works on a free tier despite marketing claims.
// Decided (2026-08-27): ship with email + dashboard alert only for
// now, revisit WhatsApp once a provider is actually paid for.
//
// dispatch.ts already gates every call to sendWhatsApp() behind
// `process.env.AISENSY_API_KEY` being set, so in the current
// deployment this function is never actually invoked — this file
// exists purely so the import in dispatch.ts resolves and the build
// passes. When a provider is chosen: implement the real API call
// here (this function's signature/return type must not change), set
// its key in .env.example + serverEnvSchema (RULE 29), and nothing
// in dispatch.ts needs to change.

export interface SendWhatsAppInput {
  to: string;
  recipientName: string;
  templateParams: string[];
}

export type SendWhatsAppResult =
  | { success: true }
  | { success: false; error: string };

export async function sendWhatsApp(
  _input: SendWhatsAppInput
): Promise<SendWhatsAppResult> {
  return {
    success: false,
    error:
      'WhatsApp provider not configured yet — no provider has been selected/paid for (see CONTACT-01 notes).',
  };
}
