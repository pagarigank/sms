export { cn } from './cn';
export { formatPHP, formatAmount, parseAmount, formatPercent, formatNumber } from './currency';
export { formatDate, formatDateTime } from './date';
export { getInitials, truncate, slugify, formatStatus, shortId } from './format';

// Aliases for compatibility
export { formatPHP as formatCurrency } from './currency';
export { formatDateTime as formatRelative } from './date';
export function getSchoolYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
