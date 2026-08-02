/**
 * Error Utilities
 * 
 * WHY IT EXISTS:
 * - Standardized error handling across the application
 * - Type-safe error classes with error codes
 * - Consistent error response format
 * 
 * RESPONSIBILITY:
 * - Define custom error classes
 * - Provide error code constants
 * - Format error responses
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All API routes, services, and error boundaries
 */

/**
 * Error codes for consistent error identification
 */
export const ErrorCode = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // Booking errors
  BOOKING_NOT_AVAILABLE: 'BOOKING_NOT_AVAILABLE',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  CANCELLATION_NOT_ALLOWED: 'CANCELLATION_NOT_ALLOWED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes from programming errors
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    code: ErrorCodeType = ErrorCode.UNAUTHORIZED
  ) {
    super(message, code, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests. Please try again later.',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Payment error
 */
export class PaymentError extends AppError {
  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.PAYMENT_FAILED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details);
    this.name = 'PaymentError';
  }
}

/**
 * Booking error
 */
export class BookingError extends AppError {
  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.BOOKING_NOT_AVAILABLE,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details);
    this.name = 'BookingError';
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      originalError ? { originalMessage: originalError.message } : undefined
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCodeType;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

/**
 * Check if error is an operational error (expected)
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Safe error message for client (hides internal details)
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again later.';
}
