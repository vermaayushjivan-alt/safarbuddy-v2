/**
 * Application Constants
 * 
 * WHY IT EXISTS:
 * - Single source of truth for all app-wide constants
 * - Prevents magic numbers/strings scattered throughout code
 * - Easy to update values in one place
 * 
 * RESPONSIBILITY:
 * - Define all constant values used across the application
 * - Organize constants by category for easy discovery
 * 
 * SERVER/CLIENT: Both (no secrets)
 * 
 * USED BY: All modules throughout the application
 */

/**
 * Application metadata
 */
export const APP = {
  NAME: 'SafarBuddy',
  TAGLINE: 'Your Travel Companion',
  DESCRIPTION: 'Book flights, hotels, holiday packages and more with SafarBuddy',
  VERSION: '0.1.0',
  COMPANY: 'SafarBuddy Technologies',
  SUPPORT_EMAIL: 'support@safarbuddy.com',
  SUPPORT_PHONE: '+91 1800-xxx-xxxx',
} as const;

/**
 * API configuration
 */
export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Authentication constants
 */
export const AUTH = {
  SESSION_EXPIRY: 60 * 60, // 1 hour in seconds
  REFRESH_THRESHOLD: 5 * 60, // 5 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  OTP_EXPIRY: 10 * 60, // 10 minutes
  OTP_LENGTH: 6,
} as const;

/**
 * Booking constants
 */
export const BOOKING = {
  PRICE_LOCK_DURATION: 10 * 60, // 10 minutes
  MIN_BOOKING_LEAD_TIME: 2 * 60 * 60, // 2 hours before departure
  MAX_TRAVELERS_PER_BOOKING: 9,
  MAX_ROOMS_PER_BOOKING: 5,
  BOOKING_NUMBER_PREFIX: 'SB',
} as const;

/**
 * Payment constants
 */
export const PAYMENT = {
  CURRENCY: 'INR',
  MIN_AMOUNT: 100, // ₹100
  MAX_AMOUNT: 10000000, // ₹1 crore
  CONVENIENCE_FEE_PERCENTAGE: 0, // Currently free
  GST_PERCENTAGE: 18,
} as const;

/**
 * Wallet constants
 */
export const WALLET = {
  MAX_BALANCE: 100000, // ₹1 lakh
  MIN_ADD_AMOUNT: 100, // ₹100
  MAX_ADD_AMOUNT: 50000, // ₹50,000
  KYC_THRESHOLD: 10000, // KYC required above ₹10,000
} as const;

/**
 * File upload constants
 */
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  MAX_IMAGES_PER_REVIEW: 5,
} as const;

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * Cache durations (in seconds)
 */
export const CACHE = {
  SHORT: 60, // 1 minute
  MEDIUM: 5 * 60, // 5 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Rate limiting
 */
export const RATE_LIMIT = {
  ANONYMOUS: {
    REQUESTS: 60,
    WINDOW: 60, // per minute
  },
  AUTHENTICATED: {
    REQUESTS: 200,
    WINDOW: 60, // per minute
  },
  AUTH_ENDPOINTS: {
    REQUESTS: 5,
    WINDOW: 15 * 60, // per 15 minutes
  },
} as const;

/**
 * Travel-specific constants
 */
export const TRAVEL = {
  CHILD_MIN_AGE: 2,
  CHILD_MAX_AGE: 11,
  INFANT_MAX_AGE: 2,
  SENIOR_MIN_AGE: 60,
  PASSPORT_MIN_VALIDITY_MONTHS: 6,
} as const;

/**
 * Cancellation policy windows (in hours before travel)
 */
export const CANCELLATION = {
  FULL_REFUND_WINDOW: 72, // 72 hours
  PARTIAL_REFUND_WINDOW: 24, // 24 hours
  NO_REFUND_WINDOW: 0, // after this, no refund
} as const;

/**
 * Review constants
 */
export const REVIEW = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_TITLE_LENGTH: 100,
  MAX_CONTENT_LENGTH: 2000,
  EDIT_WINDOW_DAYS: 7,
} as const;

/**
 * Notification constants
 */
export const NOTIFICATION = {
  RETENTION_DAYS: 90,
  MAX_PER_PAGE: 50,
} as const;
