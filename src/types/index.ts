/**
 * Global Type Definitions
 *
 * WHY IT EXISTS:
 * - Centralized type definitions used across the application
 * - Shared interfaces and type utilities
 *
 * RESPONSIBILITY:
 * - Define common types and interfaces
 * - Export type utilities
 *
 * SERVER/CLIENT: Both
 *
 * USED BY: All modules
 */

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Make specific properties optional
 */
export type PartialBy<
  T,
  K extends keyof T
> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<
  T,
  K extends keyof T
> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Extract only string keys from an object type
 */
export type StringKeys<T> =
  Extract<keyof T, string>;

/**
 * Make all properties nullable
 */
export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * Remove null and undefined from all properties
 */
export type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

// ============================================
// API TYPES
// ============================================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Combined API response type
 */
export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated response data
 */
export interface PaginatedData<T> {
  items: T[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// USER TYPES
// ============================================

/**
 * User roles.
 *
 * Kept in sync with AppRole in src/db/schema.ts
 * (the source of truth, backed by the public.roles
 * table) — see AUTH-05.
 */
export type UserRole =
  | "user"
  | "vendor"
  | "hotel_owner"
  | "travel_agent"
  | "admin"
  | "super_admin";

/**
 * Basic user info (safe to expose)
 */
export interface UserBasicInfo {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Session user (from auth)
 */
export interface SessionUser
  extends UserBasicInfo {
  roles: UserRole[];
  emailVerified: boolean;
  phoneVerified: boolean;
}

// ============================================
// BOOKING TYPES
// ============================================

/**
 * Booking status
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "failed";

/**
 * Payment status
 */
export type PaymentStatus =
  | "initiated"
  | "processing"
  | "paid"
  | "failed"
  | "flagged";

/**
 * Booking type (service type)
 */
export type BookingType =
  | "flight"
  | "hotel"
  | "bus"
  | "train"
  | "package"
  | "visa"
  | "forex"
  | "insurance";

// ============================================
// TRAVELER TYPES
// ============================================

/**
 * Traveler type based on age
 */
export type TravelerType =
  | "adult"
  | "child"
  | "infant";

/**
 * Gender options
 */
export type Gender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

/**
 * Title options
 */
export type Title =
  | "Mr"
  | "Mrs"
  | "Ms"
  | "Miss"
  | "Dr"
  | "Master";

/**
 * Traveler count
 */
export interface TravelerCount {
  adults: number;
  children: number;
  infants: number;
}

// ============================================
// SEARCH & FILTER TYPES
// ============================================

/**
 * Sort direction
 */
export type SortDirection =
  | "asc"
  | "desc";

/**
 * Price range filter
 */
export interface PriceRange {
  min?: number;
  max?: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: string;
  end: string;
}

// ============================================
// UI TYPES
// ============================================

/**
 * Size variants for components
 */
export type Size =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

/**
 * Color variants for components
 */
export type ColorVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "muted";

/**
 * Common component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// ============================================
// FORM TYPES
// ============================================

/**
 * Form field state
 */
export interface FieldState {
  value: string;
  error?: string;
  touched: boolean;
}

/**
 * Form state
 */
export interface FormState<
  T extends Record<string, unknown>
> {
  values: T;
  errors: Partial<
    Record<keyof T, string>
  >;
  touched: Partial<
    Record<keyof T, boolean>
  >;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * Click handler
 */
export type ClickHandler = (
  event: React.MouseEvent<HTMLElement>
) => void;

/**
 * Change handler
 */
export type ChangeHandler<T = string> = (
  value: T
) => void;

/**
 * Submit handler
 */
export type SubmitHandler<T> = (
  data: T
) => void | Promise<void>;
