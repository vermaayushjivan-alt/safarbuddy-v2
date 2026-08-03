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

  // Generic database error
  return new DatabaseError(
    error.message || 'Database operation failed',
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
