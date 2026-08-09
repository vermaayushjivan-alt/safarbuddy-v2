import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export function handleDatabaseError(error: PostgrestError): DatabaseError {
  // Unique constraint violation
  if (error.code === '23505') {
    const constraint = extractConstraintName(error.message);
    
    return new ConflictError(
      `Unique constraint violation: ${constraint}`,
      { constraint }
    );
  }

  // Foreign key violation
  if (error.code === '23503') {
    return new ValidationError(
      'Foreign key constraint violation',
      { originalError: error.message }
    );
  }

  // Not null violation
  if (error.code === '23502') {
    const column = extractColumnName(error.message);
    
    return new ValidationError(
      `Required field missing: ${column}`,
      { column }
    );
  }

  // Numeric field overflow (value doesn't fit the column's precision/scale) —
  // e.g. bookings.price_snapshot is numeric(10,2), max 99,999,999.99.
  // Message is intentionally generic and safe to show to end users; the
  // actual offending column is not always derivable from the Postgres
  // message, so we don't guess at it.
  if (error.code === '22003') {
    return new ValidationError(
      'The amount is too large. Please enter a smaller value.',
      { code: '22003' }
    );
  }

  // Generic database error. The safe/human message never includes the raw
  // Postgres message (which can contain SQL, column/table names, or other
  // internal details) — that raw text is kept in `details` for server-side
  // logging only and must never be forwarded to the client as-is.
  return new DatabaseError(
    'A database error occurred while processing your request.',
    error.code,
    {
      code: error.code,
      hint: error.hint,
      message: error.message,
    }
  );
}

function extractConstraintName(message: string): string {
  const match = message.match(/constraint "(.+?)"/);
  return match ? match[1] : 'unknown';
}

function extractColumnName(message: string): string {
  const match = message.match(/column "(.+?)"/);
  return match ? match[1] : 'unknown';
}
