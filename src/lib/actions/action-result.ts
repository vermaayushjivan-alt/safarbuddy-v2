import { z } from 'zod';
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors/database.errors';

// -----------------------------------------------------------------------
// STABILIZATION-01 — consistent safe result contract for admin Server
// Actions. Server Actions cross a serialization boundary; thrown errors
// (stack traces, raw Postgres/Supabase messages, etc.) become opaque or
// leak internal details on the client. Every admin mutation should return
// an ActionResult<T> instead of throwing, so the client always gets a
// human-readable, safe message on failure.
// -----------------------------------------------------------------------

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'You must be signed in to do this.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SERVICE_UNAVAILABLE:
    'The service is temporarily unavailable. Please try again shortly.',
};

/**
 * Runs a Server Action body and converts any thrown error into a safe,
 * human-readable message. Never rejects — callers always get back an
 * ActionResult.
 */
export async function runAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toSafeErrorMessage(error) };
  }
}

/**
 * Converts any error thrown from an admin action into a message that is
 * safe to show a user — never a stack trace, raw SQL, connection string,
 * or other internal detail. Unexpected errors are logged server-side
 * (with full detail) and reduced to a generic message on the client.
 */
export function toSafeErrorMessage(error: unknown): string {
  // Zod validation errors: first issue's message is already written to be
  // user-facing (see each schema's messages).
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? 'Invalid input.';
  }

  // NotFoundError / ValidationError messages are already written to be
  // safe and human-readable (see database.errors.ts).
  if (error instanceof NotFoundError || error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof ConflictError) {
    return 'This already exists or conflicts with an existing record.';
  }

  if (error instanceof DatabaseError) {
    // Generic/unclassified database error — details may contain raw
    // Postgres internals, so only log them server-side.
    console.error('[db error]', error.code, error.details);
    return 'A database error occurred while saving. Please try again.';
  }

  if (error instanceof Error) {
    if (error.message in AUTH_ERROR_MESSAGES) {
      return AUTH_ERROR_MESSAGES[error.message];
    }
    console.error('[action error]', error);
    return 'Something went wrong. Please try again.';
  }

  console.error('[action error] non-Error thrown:', error);
  return 'Something went wrong. Please try again.';
}

// -----------------------------------------------------------------------
// Optional-field normalization helpers (P1 — "" is neither null nor
// undefined, so optional/nullable zod validators reject blank form
// inputs). Use as z.preprocess(emptyToNull, ...) on optional/nullable
// string, uuid, numeric, and date fields across admin forms.
// -----------------------------------------------------------------------

export function emptyToNull(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}

export function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}
