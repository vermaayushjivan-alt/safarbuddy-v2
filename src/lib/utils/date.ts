/**
 * Date Utilities
 * 
 * WHY IT EXISTS:
 * - Consistent date manipulation across the application
 * - Travel-specific date calculations
 * - Timezone-aware operations
 * 
 * RESPONSIBILITY:
 * - Date calculations and comparisons
 * - Travel date utilities (duration, check-in/out)
 * - Date validation
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: Booking flow, search filters, calendar components
 */

import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInYears,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  isTomorrow,
  isValid,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';

/**
 * Parse date string to Date object safely
 */
export function parseDate(date: string | Date): Date | null {
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && isValid(date);
}

/**
 * Get today's date at start of day
 */
export function getToday(): Date {
  return startOfDay(new Date());
}

/**
 * Get tomorrow's date at start of day
 */
export function getTomorrow(): Date {
  return addDays(getToday(), 1);
}

/**
 * Calculate age from date of birth
 * 
 * @example
 * calculateAge(new Date('1990-05-15')) // 33 (depending on current date)
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  return differenceInYears(new Date(), dob);
}

/**
 * Check if person is a child (2-11 years)
 */
export function isChild(dateOfBirth: Date | string): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= 2 && age <= 11;
}

/**
 * Check if person is an infant (under 2 years)
 */
export function isInfant(dateOfBirth: Date | string): boolean {
  const age = calculateAge(dateOfBirth);
  return age < 2;
}

/**
 * Check if person is a senior (60+ years)
 */
export function isSenior(dateOfBirth: Date | string): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= 60;
}

/**
 * Calculate number of nights between two dates
 * 
 * @example
 * calculateNights('2024-01-15', '2024-01-18') // 3
 */
export function calculateNights(
  checkIn: Date | string,
  checkOut: Date | string
): number {
  const start = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  
  return Math.max(0, differenceInDays(end, start));
}

/**
 * Calculate duration in days
 */
export function calculateDays(
  startDate: Date | string,
  endDate: Date | string
): number {
  return calculateNights(startDate, endDate) + 1;
}

/**
 * Check if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(d, getToday());
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isAfter(d, new Date());
}

/**
 * Check if date is today
 */
export { isToday, isTomorrow, isWeekend, isSameDay };

/**
 * Get hours until a date
 * 
 * @example
 * hoursUntil(someDate) // 24
 */
export function hoursUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInHours(d, new Date());
}

/**
 * Get minutes until a date
 */
export function minutesUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInMinutes(d, new Date());
}

/**
 * Check if booking is within minimum lead time
 * 
 * @example
 * isWithinBookingWindow(departureDate, 2) // true if at least 2 hours away
 */
export function isWithinBookingWindow(
  date: Date | string,
  minHours: number
): boolean {
  return hoursUntil(date) >= minHours;
}

/**
 * Check if passport is valid for travel
 * 
 * @param expiryDate - Passport expiry date
 * @param travelDate - Travel date
 * @param minMonths - Minimum months of validity required (default: 6)
 */
export function isPassportValid(
  expiryDate: Date | string,
  travelDate: Date | string,
  minMonths: number = 6
): boolean {
  const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  const travel = typeof travelDate === 'string' ? parseISO(travelDate) : travelDate;
  
  const requiredValidity = addMonths(travel, minMonths);
  return isAfter(expiry, requiredValidity);
}

/**
 * Get date range for a month
 */
export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Generate array of dates between two dates
 */
export function getDateRange(
  startDate: Date | string,
  endDate: Date | string
): Date[] {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  const dates: Date[] = [];
  let current = start;
  
  while (!isAfter(current, end)) {
    dates.push(current);
    current = addDays(current, 1);
  }
  
  return dates;
}

/**
 * Format date for API (ISO format)
 */
export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format datetime for API (ISO format)
 */
export function toISODateTimeString(date: Date): string {
  return date.toISOString();
}

/**
 * Get start and end of day
 */
export { startOfDay, endOfDay, addDays, addMonths, addYears };

/**
 * Create date constraints for booking
 */
export function getBookingDateConstraints(options?: {
  minDaysFromNow?: number;
  maxDaysFromNow?: number;
}) {
  const { minDaysFromNow = 0, maxDaysFromNow = 365 } = options || {};
  
  return {
    minDate: addDays(getToday(), minDaysFromNow),
    maxDate: addDays(getToday(), maxDaysFromNow),
  };
}
