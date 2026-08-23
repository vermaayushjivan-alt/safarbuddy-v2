import { z } from "zod";
import {
  DatabaseError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/errors/database.errors";

// -----------------------------------------------------------------------
// STABILIZATION-01 — consistent safe result contract for admin Server
// Actions.
//
// Server Actions cross a serialization boundary. We keep the ActionResult
// contract stable while providing enough diagnostic information during
// development/stabilization to identify Supabase/Postgres failures.
// -----------------------------------------------------------------------

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "You must be signed in to do this.",
  FORBIDDEN: "You do not have permission to perform this action.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again shortly.",
};

// -----------------------------------------------------------------------
// ACTION RUNNER
// -----------------------------------------------------------------------

export async function runAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[SERVER ACTION ERROR]", error);

    return {
      success: false,
      error: toSafeErrorMessage(error),
    };
  }
}

// -----------------------------------------------------------------------
// ERROR NORMALIZATION
// -----------------------------------------------------------------------

export function toSafeErrorMessage(error: unknown): string {
  // ---------------------------------------------------------------------
  // ZOD
  // ---------------------------------------------------------------------

  if (error instanceof z.ZodError) {
    return (
      error.issues[0]?.message ??
      "Invalid input. Please check the form."
    );
  }

  // ---------------------------------------------------------------------
  // NOT FOUND / VALIDATION
  // ---------------------------------------------------------------------

  if (
    error instanceof NotFoundError ||
    error instanceof ValidationError
  ) {
    return error.message;
  }

  // ---------------------------------------------------------------------
  // CONFLICT
  // ---------------------------------------------------------------------

  if (error instanceof ConflictError) {
    return "This record already exists or conflicts with an existing record.";
  }

  // ---------------------------------------------------------------------
  // DATABASE ERROR
  // ---------------------------------------------------------------------

  if (error instanceof DatabaseError) {
    console.error("[DATABASE ERROR]", {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });

    /*
     * IMPORTANT:
     *
     * During Session 03 stabilization we need the actual database reason.
     *
     * DatabaseError.message is normally created by our repository/database
     * layer and therefore is much more useful than the old generic message.
     *
     * We still avoid returning stack traces.
     */

    if (error.message?.trim()) {
      return error.message;
    }

    if (error.code?.trim()) {
      return `Database error (${error.code}).`;
    }

    return "A database error occurred while saving. Please try again.";
  }

  // ---------------------------------------------------------------------
  // NORMAL ERROR / AUTH ERRORS
  // ---------------------------------------------------------------------

  if (error instanceof Error) {
    const authMessage = AUTH_ERROR_MESSAGES[error.message];

    if (authMessage) {
      return authMessage;
    }

    console.error("[ACTION ERROR]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    /*
     * For ordinary Error objects, returning the message is useful during
     * stabilization because Supabase/repository errors may arrive here
     * without being converted into DatabaseError first.
     *
     * Do NOT return stack traces.
     */

    if (error.message?.trim()) {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  }

  // ---------------------------------------------------------------------
  // UNKNOWN THROWABLE
  // ---------------------------------------------------------------------

  console.error("[ACTION ERROR - NON ERROR]", error);

  // Supabase's PostgrestError (and similar Supabase Storage/Auth errors)
  // are plain objects — not `instanceof Error` — so they always fell
  // through to the generic message below, hiding the actual DB reason
  // (RLS violation, FK violation, check constraint, etc.) that would
  // otherwise have been visible via the DatabaseError/Error branches
  // above. Duck-type them here so their real message surfaces instead.
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    const maybeCode =
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    console.error("[ACTION ERROR - DUCK-TYPED SUPABASE ERROR]", {
      message: (error as { message: string }).message,
      code: maybeCode,
      details:
        "details" in error
          ? (error as { details: unknown }).details
          : undefined,
      hint:
        "hint" in error ? (error as { hint: unknown }).hint : undefined,
    });

    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}

// -----------------------------------------------------------------------
// OPTIONAL-FIELD NORMALIZATION
// -----------------------------------------------------------------------

/**
 * Converts blank form values to null.
 *
 * Example:
 *
 * ""       -> null
 * "   "    -> null
 * "Ayodhya" -> "Ayodhya"
 */
export function emptyToNull(value: unknown): unknown {
  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  return value;
}

/**
 * Converts blank form values to undefined.
 *
 * Example:
 *
 * ""       -> undefined
 * "   "    -> undefined
 * "Ayodhya" -> "Ayodhya"
 */
export function emptyToUndefined(value: unknown): unknown {
  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return undefined;
  }

  return value;
}
