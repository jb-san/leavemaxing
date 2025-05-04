import { describe, expect, it } from 'vitest';
import type { PublicHoliday } from '../types/api';
import {
  formatDate,
  getDateRange,
  getDatesInMonth,
  getHolidayDetails,
  isFreeDay,
  isHoliday,
  isWeekendDay,
  stringToDate,
} from './dateUtils';

describe('Date Utils', () => {
  // Sample holidays for testing
  const holidays: PublicHoliday[] = [
    {
      date: '2023-01-01',
      localName: "New Year's Day",
      name: "New Year's Day",
      countryCode: 'US',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    {
      date: '2023-12-25',
      localName: 'Christmas Day',
      name: 'Christmas Day',
      countryCode: 'US',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
  ];

  describe('isWeekendDay', () => {
    it('should return true for Saturday', () => {
      // January 7, 2023 is a Saturday
      const date = new Date(2023, 0, 7);
      expect(isWeekendDay(date)).toBe(true);
    });

    it('should return true for Sunday', () => {
      // January 8, 2023 is a Sunday
      const date = new Date(2023, 0, 8);
      expect(isWeekendDay(date)).toBe(true);
    });

    it('should return false for weekdays', () => {
      // January 9, 2023 is a Monday
      const date = new Date(2023, 0, 9);
      expect(isWeekendDay(date)).toBe(false);
    });
  });

  describe('stringToDate', () => {
    it('should correctly parse date strings', () => {
      const date = stringToDate('2023-01-01');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(1);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly with default format', () => {
      const date = new Date(2023, 0, 1);
      expect(formatDate(date)).toBe('Jan 1, 2023');
    });

    it('should format date with custom format', () => {
      const date = new Date(2023, 0, 1);
      expect(formatDate(date, 'yyyy/MM/dd')).toBe('2023/01/01');
    });
  });

  describe('isHoliday', () => {
    it('should return true for a holiday date', () => {
      const date = new Date(2023, 0, 1); // New Year's Day
      expect(isHoliday(date, holidays)).toBe(true);
    });

    it('should return false for a non-holiday date', () => {
      const date = new Date(2023, 0, 2); // January 2nd, not a holiday
      expect(isHoliday(date, holidays)).toBe(false);
    });
  });

  describe('getHolidayDetails', () => {
    it('should return holiday details for a holiday date', () => {
      const date = new Date(2023, 0, 1); // New Year's Day
      const result = getHolidayDetails(date, holidays);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("New Year's Day");
    });

    it('should return null for a non-holiday date', () => {
      const date = new Date(2023, 0, 2); // January 2nd, not a holiday
      expect(getHolidayDetails(date, holidays)).toBeNull();
    });
  });

  describe('isFreeDay', () => {
    it('should return true for weekends', () => {
      const date = new Date(2023, 0, 7); // Saturday
      expect(isFreeDay(date, holidays)).toBe(true);
    });

    it('should return true for holidays', () => {
      const date = new Date(2023, 0, 1); // New Year's Day
      expect(isFreeDay(date, holidays)).toBe(true);
    });

    it('should return false for regular weekdays', () => {
      const date = new Date(2023, 0, 2); // Monday, not a holiday
      expect(isFreeDay(date, holidays)).toBe(false);
    });
  });

  describe('getDateRange', () => {
    it('should return all dates in range inclusive', () => {
      const start = new Date(2023, 0, 1);
      const end = new Date(2023, 0, 5);
      const result = getDateRange(start, end);

      expect(result.length).toBe(5);
      expect(result[0].getDate()).toBe(1);
      expect(result[4].getDate()).toBe(5);
    });

    it('should handle single day range', () => {
      const start = new Date(2023, 0, 1);
      const end = new Date(2023, 0, 1);
      const result = getDateRange(start, end);

      expect(result.length).toBe(1);
      expect(result[0].getDate()).toBe(1);
    });
  });

  describe('getDatesInMonth', () => {
    it('should return all dates in January 2023', () => {
      const result = getDatesInMonth(2023, 0); // January is 0
      expect(result.length).toBe(31); // January has 31 days
      expect(result[0].getDate()).toBe(1);
      expect(result[30].getDate()).toBe(31);
    });

    it('should return all dates in February 2023 (non-leap year)', () => {
      const result = getDatesInMonth(2023, 1); // February is 1
      expect(result.length).toBe(28); // February 2023 has 28 days
    });

    it('should return all dates in February 2024 (leap year)', () => {
      const result = getDatesInMonth(2024, 1); // February is 1
      expect(result.length).toBe(29); // February 2024 has 29 days
    });
  });
});
