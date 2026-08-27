import nodemailer from 'nodemailer';

// CONTACT-01: sends via Gmail SMTP (Nodemailer) instead of Resend.
// Decided 2026-08-27 — Resend needs a verified domain to email anyone
// other than the account owner, and no domain exists yet. This is an
// interim provider: sendEmail()'s interface is unchanged, so swapping
// back to Resend (or any other provider) later only means rewriting
// this file, not dispatch.ts or anything that calls it.
//
// Requires a Gmail Account with 2-Step Verification enabled, and an
// **App Password** (not the normal Gmail password) generated at
// myaccount.google.com/apppasswords. Set GMAIL_USER (the Gmail
// address) and GMAIL_APP_PASSWORD (the 16-character app password) in
// .env.local — see .env.example.
//
// Gmail's free sending limit is ~500 emails/day, and mail will show
// the GMAIL_USER address as the sender — fine for current volume, but
// worth revisiting once a real domain + Resend (or similar) is set up.
//
// Reads process.env directly (same pattern as cashfree.client.ts) —
// src/lib/config/env.ts's `env` export is typed as a server/client
// union, which loses server-only fields. Both vars are already
// declared in the validated serverEnvSchema and in src/types/env.d.ts.
//
// Every caller must handle sendEmail() returning { success: false } —
// this must never throw into a caller that isn't expecting it (see
// dispatch.ts).

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return {
      success: false,
      error:
        'GMAIL_USER/GMAIL_APP_PASSWORD is not configured. Set both in .env.local (see .env.example).',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: gmailUser,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error sending email via Gmail SMTP',
    };
  }
}

