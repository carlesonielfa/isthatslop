import {
  formatDistanceToNow,
  differenceInDays,
  format,
  type Locale,
} from "date-fns";
import { enUS } from "date-fns/locale";

/**
 * Date formatting options that can be passed to all formatting functions.
 * Allows for locale customization when i18n support is added.
 */
export interface DateFormatOptions {
  locale?: Locale;
}

/**
 * Default locale for date formatting.
 * Change this when adding i18n support.
 */
const defaultLocale = enUS;

/**
 * Format a date as a relative time string (e.g., "2 days ago", "5 hours ago").
 * Falls back to a localized short date format for dates older than 30 days.
 *
 * @param date - Date object or ISO string
 * @param options - Optional formatting options including locale
 * @returns Formatted relative time string
 */
export function formatTimeAgo(
  date: Date | string,
  options?: DateFormatOptions,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = options?.locale ?? defaultLocale;
  const now = new Date();
  const daysDiff = differenceInDays(now, dateObj);

  if (daysDiff > 30) {
    return format(dateObj, "PP", { locale });
  }

  return formatDistanceToNow(dateObj, { addSuffix: true, locale });
}

/**
 * Format a date as month and year (e.g., "Jan 2024").
 *
 * @param date - Date object or ISO string
 * @param options - Optional formatting options including locale
 * @returns Formatted month and year string
 */
export function formatMonthYear(
  date: Date | string,
  options?: DateFormatOptions,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = options?.locale ?? defaultLocale;
  return format(dateObj, "MMM yyyy", { locale });
}

/**
 * Format a date as a short date (e.g., "Jan 15").
 *
 * @param date - Date object or ISO string
 * @param options - Optional formatting options including locale
 * @returns Formatted short date string
 */
export function formatShortDate(
  date: Date | string,
  options?: DateFormatOptions,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = options?.locale ?? defaultLocale;
  return format(dateObj, "PP", { locale });
}
