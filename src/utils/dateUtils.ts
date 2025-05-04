import { addDays, format, isSameDay, isWeekend, parseISO } from 'date-fns';
import type { PublicHoliday } from '../types/api';

/**
 * Check if a date is a weekend day (Saturday or Sunday)
 */
export function isWeekendDay(date: Date): boolean {
  return isWeekend(date);
}

/**
 * Convert a string date from API to a Date object
 */
export function stringToDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date, formatString: string = 'MMM d, yyyy'): string {
  return format(date, formatString);
}

/**
 * Check if a date is a public holiday
 */
export function isHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  return holidays.some((holiday) => isSameDay(stringToDate(holiday.date), date));
}

/**
 * Get holiday details if a date is a holiday
 */
export function getHolidayDetails(date: Date, holidays: PublicHoliday[]): PublicHoliday | null {
  return holidays.find((holiday) => isSameDay(stringToDate(holiday.date), date)) || null;
}

/**
 * Check if a date is a free day (weekend or holiday)
 */
export function isFreeDay(date: Date, holidays: PublicHoliday[]): boolean {
  return isWeekendDay(date) || isHoliday(date, holidays);
}

/**
 * Get array of dates between start and end (inclusive)
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dateArray: Date[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateArray.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dateArray;
}

/**
 * Get all dates for a given year and month
 * Month is 0-indexed (0 = January, 11 = December)
 */
export function getDatesInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return getDateRange(firstDay, lastDay);
}

/**
 * Get all dates for a given year
 */
export function getDatesInYear(year: number): Date[] {
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);

  return getDateRange(firstDay, lastDay);
}

/**
 * Find consecutive free days (including weekends and holidays)
 */
export function findConsecutiveFreeDays(
  year: number,
  holidays: PublicHoliday[]
): Array<{ start: Date; end: Date; days: number }> {
  const allDates = getDatesInYear(year);
  const result: Array<{ start: Date; end: Date; days: number }> = [];

  let currentStreak: Date[] = [];

  for (const date of allDates) {
    if (isFreeDay(date, holidays)) {
      currentStreak.push(date);
    } else {
      if (currentStreak.length > 1) {
        result.push({
          start: currentStreak[0],
          end: currentStreak[currentStreak.length - 1],
          days: currentStreak.length,
        });
      }
      currentStreak = [];
    }
  }

  // Handle streak at the end of the year
  if (currentStreak.length > 1) {
    result.push({
      start: currentStreak[0],
      end: currentStreak[currentStreak.length - 1],
      days: currentStreak.length,
    });
  }

  return result;
}
