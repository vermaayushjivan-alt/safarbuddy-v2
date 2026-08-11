import { PostgrestError } from "@supabase/supabase-js";

/**
 * Base database error used by repositories and server actions.
 *
 * details intentionally contains the original database diagnostics so that
 * the server can log the real Supabase/Postgres failure.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);

    this.name = "DatabaseError";

    // Required when extending Error in some JS/TS runtimes.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DatabaseError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, "NOT_FOUND", details);

    this.name = "NotFoundError";
  }
}

export class ConflictError extends DatabaseError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, "CONFLICT", details);

    this.name = "ConflictError";
  }
}

export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_ERROR", details);

    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// HELPERS -- kept top-level and typed strictly so TypeScript narrowing works
// correctly even when the underlying PostgrestError field is unknown at the
// call site.
// ---------------------------------------------------------------------------

/**
 * Safely converts an unknown value to a trimmed string.
 * Returns "" for anything that is not a non-empty string.
 *
 * This exists because PostgrestError.details / .hint / .message have
 * historically been typed loosely (string | null | unknown depending on
 * the @supabase/supabase-js version), which breaks in-place
 * `typeof x === "string" ? x.trim() : ""` narrowing under strict TS.
 */
function safeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function extractConstraintName(message: string): string {
  if (!message) {
    return "unknown";
  }

  const match = message.match(/constraint "(.+?)"/i);

  return match?.[1] ?? "unknown";
}

function extractColumnName(message: string): string {
  if (!message) {
    return "unknown";
  }

  const match = message.match(/column "(.+?)"/i);

  return match?.[1] ?? "unknown";
}

/**
 * Converts a Supabase/PostgREST error into one of our application errors.
 *
 * During stabilization we preserve the actual Postgres diagnostics in
 * `details` and also return a useful diagnostic message.
 *
 * IMPORTANT:
 * This is intentionally diagnostic-friendly so the current hotel-create
 * failure can be identified. Once Session 03 is completely stable, the
 * messages can be made more generic again if desired.
 */
export function handleDatabaseError(error: PostgrestError): DatabaseError {
  const code = error.code ?? "UNKNOWN";

  // Use safeString() rather than inline `typeof x === "string" ? x.trim() : ""`
  // so that narrowing survives even when the field type is `unknown`.
  const rawMessage = safeString(error.message);
  const rawDetails = safeString(error.details);
  const rawHint = safeString(error.hint);

  // -----------------------------------------------------------------------
  // UNIQUE CONSTRAINT
  // PostgreSQL: 23505
  // -----------------------------------------------------------------------

  if (code === "23505") {
    const constraint = extractConstraintName(rawMessage);

    return new ConflictError(
      `A record with the same value already exists. Constraint: ${constraint}`,
      {
        code,
        constraint,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // FOREIGN KEY
  // PostgreSQL: 23503
  // -----------------------------------------------------------------------

  if (code === "23503") {
    const constraint = extractConstraintName(rawMessage);

    return new ValidationError(
      `Foreign key constraint failed${
        constraint !== "unknown" ? `: ${constraint}` : "."
      }`,
      {
        code,
        constraint,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // NOT NULL
  // PostgreSQL: 23502
  // -----------------------------------------------------------------------

  if (code === "23502") {
    const column = extractColumnName(rawMessage);

    return new ValidationError(
      `Required field is missing${
        column !== "unknown" ? `: ${column}` : "."
      }`,
      {
        code,
        column,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // CHECK CONSTRAINT
  // PostgreSQL: 23514
  // -----------------------------------------------------------------------

  if (code === "23514") {
    const constraint = extractConstraintName(rawMessage);

    return new ValidationError(
      `The submitted value violates a database rule${
        constraint !== "unknown" ? `: ${constraint}` : "."
      }`,
      {
        code,
        constraint,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // INVALID TEXT REPRESENTATION
  // PostgreSQL: 22P02
  // -----------------------------------------------------------------------

  if (code === "22P02") {
    return new ValidationError(
      "One of the submitted values has an invalid format.",
      {
        code,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // NUMERIC VALUE OUT OF RANGE
  // PostgreSQL: 22003
  // -----------------------------------------------------------------------

  if (code === "22003") {
    return new ValidationError(
      "The amount or numeric value is too large. Please enter a smaller value.",
      {
        code,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // STRING DATA TOO LONG
  // PostgreSQL: 22001
  // -----------------------------------------------------------------------

  if (code === "22001") {
    return new ValidationError(
      "One of the entered values is too long.",
      {
        code,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // INVALID DATETIME / DATE / TIME
  // -----------------------------------------------------------------------

  if (code === "22007" || code === "22008") {
    return new ValidationError(
      "One of the date or time values is invalid.",
      {
        code,
        message: rawMessage,
        details: rawDetails,
        hint: rawHint,
      }
    );
  }

  // -----------------------------------------------------------------------
  // GENERIC DATABASE ERROR
  // -----------------------------------------------------------------------

  return new DatabaseError(
    rawMessage || "A database error occurred while processing your request.",
    code,
    {
      code,
      message: rawMessage,
      details: rawDetails,
      hint: rawHint,
    }
  );
}
