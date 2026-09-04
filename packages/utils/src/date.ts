import { format, parseISO, isValid } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

/**
 * Format a date string for display (e.g., "January 15, 2026")
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return format(date, 'MMMM d, yyyy');
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format a datetime for display (e.g., "January 15, 2026 2:30 PM")
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return format(date, 'MMMM d, yyyy h:mm a');
}

/**
 * Format a date for short display (e.g., "Jan 15, 2026")
 */
export function formatDateShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) return '—';
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a date for PH convention
 */
export function formatDatePH(dateStr: string | Date | null | undefined): string {
  return formatDate(dateStr);
}

/**
 * Check if a date is in the past
 */
export function isPast(dateStr: string | Date): boolean {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return date < new Date();
}

/**
 * Calculate days remaining from now
 */
export function daysRemaining(dateStr: string | Date): number {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
