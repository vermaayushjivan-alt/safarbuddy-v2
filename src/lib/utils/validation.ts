/**
 * Validation Utilities
 * 
 * WHY IT EXISTS:
 * - Reusable validation schemas with Zod
 * - Common validation patterns for forms and APIs
 * - Type-safe validation with inferred types
 * 
 * RESPONSIBILITY:
 * - Define common validation schemas
 * - Provide validation helper functions
 * - Email, phone, password validation patterns
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All forms, API routes for input validation
 */

import { z } from 'zod';
import { AUTH, REVIEW, UPLOAD } from '@/lib/config/constants';

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
  .max(100, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Simple password (for login, no complexity requirements)
 */
export const simplePasswordSchema = z
  .string()
  .min(1, 'Password is required');

/**
 * Phone number validation (Indian)
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
  .transform((val) => val.replace(/\D/g, ''));

/**
 * OTP validation
 */
export const otpSchema = z
  .string()
  .length(AUTH.OTP_LENGTH, `OTP must be ${AUTH.OTP_LENGTH} digits`)
  .regex(/^\d+$/, 'OTP must contain only numbers');

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

/**
 * Full name validation (for profiles)
 */
export const fullNameSchema = z
  .string()
  .min(2, 'Full name is required')
  .max(200, 'Name is too long')
  .trim();

/**
 * Slug validation
 */
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(200, 'Slug is too long')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .toLowerCase();

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2000, 'URL is too long');

/**
 * Optional URL
 */
export const optionalUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2000, 'URL is too long')
  .optional()
  .or(z.literal(''));

// ============================================
// DATE SCHEMAS
// ============================================

/**
 * Date string validation (ISO format)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid date');

/**
 * Future date validation
 */
export const futureDateSchema = dateStringSchema.refine(
  (val) => new Date(val) > new Date(),
  'Date must be in the future'
);

/**
 * Date of birth validation
 */
export const dateOfBirthSchema = dateStringSchema.refine(
  (val) => {
    const dob = new Date(val);
    const today = new Date();
    const maxAge = 120;
    const minDate = new Date(today.getFullYear() - maxAge, 0, 1);
    return dob > minDate && dob < today;
  },
  'Invalid date of birth'
);

// ============================================
// TRAVEL SCHEMAS
// ============================================

/**
 * Traveler count validation
 */
export const travelerCountSchema = z.object({
  adults: z
    .number()
    .int()
    .min(1, 'At least 1 adult is required')
    .max(9, 'Maximum 9 adults allowed'),
  children: z
    .number()
    .int()
    .min(0)
    .max(9, 'Maximum 9 children allowed')
    .default(0),
  infants: z
    .number()
    .int()
    .min(0)
    .max(9, 'Maximum 9 infants allowed')
    .default(0),
}).refine(
  (data) => data.infants <= data.adults,
  'Number of infants cannot exceed number of adults'
);

/**
 * Passport number validation
 */
export const passportNumberSchema = z
  .string()
  .min(6, 'Invalid passport number')
  .max(20, 'Invalid passport number')
  .regex(/^[A-Z0-9]+$/i, 'Invalid passport number format')
  .toUpperCase();

/**
 * Gender validation
 */
export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

/**
 * Traveler title validation
 */
export const titleSchema = z.enum(['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Master']);

// ============================================
// REVIEW SCHEMAS
// ============================================

/**
 * Rating validation
 */
export const ratingSchema = z
  .number()
  .int()
  .min(REVIEW.MIN_RATING, `Minimum rating is ${REVIEW.MIN_RATING}`)
  .max(REVIEW.MAX_RATING, `Maximum rating is ${REVIEW.MAX_RATING}`);

/**
 * Review content validation
 */
export const reviewContentSchema = z
  .string()
  .min(10, 'Review must be at least 10 characters')
  .max(REVIEW.MAX_CONTENT_LENGTH, `Review cannot exceed ${REVIEW.MAX_CONTENT_LENGTH} characters`);

// ============================================
// FILE SCHEMAS
// ============================================

/**
 * Image file validation
 */
export const imageFileSchema = z.object({
  name: z.string(),
  size: z.number().max(UPLOAD.MAX_IMAGE_SIZE, 'Image file is too large'),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

// ============================================
// PAGINATION SCHEMAS
// ============================================

/**
 * Pagination params validation
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// SEARCH SCHEMAS
// ============================================

/**
 * Search query validation
 */
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query is required')
  .max(200, 'Search query is too long')
  .trim();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

/**
 * Get password strength (0-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  return Math.min(strength, 4);
}

/**
 * Validation error type
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Parse and validate with Zod schema
 * Returns { success, data, errors } object
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { 
    success: false, 
    errors: result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: ValidationError[]
): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const error of errors) {
    if (!formatted[error.path]) {
      formatted[error.path] = error.message;
    }
  }
  
  return formatted;
}
