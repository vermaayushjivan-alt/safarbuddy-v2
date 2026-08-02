/**
 * Utility Functions Index
 * 
 * WHY IT EXISTS:
 * - Single entry point for all utilities
 * - Simplified imports throughout the application
 * 
 * RESPONSIBILITY:
 * - Re-export all utility modules
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All modules
 */

export * from './cn';
export * from './format';
export * from './errors';
export * from './date';
// Validation exports handled separately due to naming conflicts
export {
  // Schemas
  uuidSchema,
  emailSchema,
  passwordSchema,
  simplePasswordSchema,
  phoneSchema,
  otpSchema,
  nameSchema,
  fullNameSchema,
  slugSchema,
  urlSchema,
  optionalUrlSchema,
  dateStringSchema,
  futureDateSchema,
  dateOfBirthSchema,
  travelerCountSchema,
  passportNumberSchema,
  genderSchema,
  titleSchema,
  ratingSchema,
  reviewContentSchema,
  imageFileSchema,
  paginationSchema,
  searchQuerySchema,
  // Helper functions
  isValidEmail,
  isValidPhone,
  isValidPassword,
  getPasswordStrength,
  validate,
  formatValidationErrors,
  // Types
  type ValidationResult,
  type ValidationError as ZodValidationError,
} from './validation';
