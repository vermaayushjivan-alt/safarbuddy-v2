/**
 * Formatting Utilities
 * 
 * WHY IT EXISTS:
 * - Consistent formatting across the application
 * - Locale-aware number and date formatting
 * - Reusable formatting functions
 * 
 * RESPONSIBILITY:
 * - Format currencies, numbers, dates, phone numbers
 * - Handle locale-specific formatting
 * 
 * SERVER/CLIENT: Both
 * 
 * USED BY: All display components, booking summaries, invoices
 */

import {
  format,
  formatDistance,
  formatRelative,
  parseISO,
  isValid,
} from 'date-fns';

/**
 * Format currency with Indian locale
 * 
 * @example
 * formatCurrency(150000) // "₹1,50,000"
 * formatCurrency(150000, 'USD') // "$150,000.00"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(amount);
}

/**
 * Format number with locale
 * 
 * @example
 * formatNumber(150000) // "1,50,000"
 */
export function formatNumber(
  value: number,
  locale: string = 'en-IN'
): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format compact number (1K, 1M, etc.)
 * 
 * @example
 * formatCompactNumber(1500) // "1.5K"
 * formatCompactNumber(1500000) // "1.5M"
 */
export function formatCompactNumber(
  value: number,
  locale: string = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Format percentage
 * 
 * @example
 * formatPercentage(0.15) // "15%"
 * formatPercentage(0.156, 1) // "15.6%"
 */
export function formatPercentage(
  value: number,
  decimals: number = 0
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format date with various patterns
 * 
 * @example
 * formatDate(new Date(), 'short') // "Jan 15, 2024"
 * formatDate(new Date(), 'long') // "Monday, January 15, 2024"
 * formatDate(new Date(), 'time') // "2:30 PM"
 */
export function formatDate(
  date: Date | string,
  pattern: 'short' | 'long' | 'full' | 'time' | 'datetime' | 'iso' = 'short'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  
  const patterns: Record<string, string> = {
    short: 'MMM d, yyyy',
    long: 'EEEE, MMMM d, yyyy',
    full: 'EEEE, MMMM d, yyyy \'at\' h:mm a',
    time: 'h:mm a',
    datetime: 'MMM d, yyyy h:mm a',
    iso: 'yyyy-MM-dd',
  };
  
  return format(dateObj, patterns[pattern]);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "about 1 hour ago"
 */
export function formatRelativeTime(
  date: Date | string,
  baseDate: Date = new Date()
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  
  return formatDistance(dateObj, baseDate, { addSuffix: true });
}

/**
 * Format relative date with context
 * 
 * @example
 * formatRelativeDate(yesterday) // "yesterday at 2:30 PM"
 */
export function formatRelativeDate(
  date: Date | string,
  baseDate: Date = new Date()
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  
  return formatRelative(dateObj, baseDate);
}

/**
 * Format duration in days/nights
 * 
 * @example
 * formatDuration(5, 4) // "5 Days, 4 Nights"
 * formatDuration(1, 0) // "1 Day"
 */
export function formatDuration(days: number, nights?: number): string {
  const dayStr = `${days} ${days === 1 ? 'Day' : 'Days'}`;
  
  if (nights === undefined || nights === null) {
    return dayStr;
  }
  
  const nightStr = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
  return `${dayStr}, ${nightStr}`;
}

/**
 * Format phone number (Indian format)
 * 
 * @example
 * formatPhone('9876543210') // "+91 98765 43210"
 */
export function formatPhone(phone: string, countryCode: string = '+91'): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle 10-digit Indian numbers
  if (digits.length === 10) {
    return `${countryCode} ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  
  // Handle numbers with country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  
  return phone;
}

/**
 * Format file size
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Truncate text with ellipsis
 * 
 * @example
 * truncate('Hello World', 5) // "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Format booking number
 * 
 * @example
 * formatBookingNumber('SB', 12345) // "SB0012345"
 */
export function formatBookingNumber(prefix: string, id: number): string {
  return `${prefix}${id.toString().padStart(7, '0')}`;
}

/**
 * Slugify text for URLs
 * 
 * @example
 * slugify('Hello World!') // "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
