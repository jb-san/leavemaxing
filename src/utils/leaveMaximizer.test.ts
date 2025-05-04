import { describe, expect, it } from 'vitest';
import type { PublicHoliday } from '../types/api';
import { findOptimalLeaveDays, generateLeaveStrategies } from './leaveMaximizer';

describe('Leave Maximizer', () => {
  // Sample holidays for 2023 (simplified for testing)
  const sampleHolidays: PublicHoliday[] = [
    // New Year's Day (Sunday)
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
    // Martin Luther King Jr. Day (Monday)
    {
      date: '2023-01-16',
      localName: 'Martin Luther King Jr. Day',
      name: 'Martin Luther King Jr. Day',
      countryCode: 'US',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    // Memorial Day (Monday)
    {
      date: '2023-05-29',
      localName: 'Memorial Day',
      name: 'Memorial Day',
      countryCode: 'US',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    // Independence Day (Tuesday)
    {
      date: '2023-07-04',
      localName: 'Independence Day',
      name: 'Independence Day',
      countryCode: 'US',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    // Labor Day (Monday)
    {
      date: '2023-09-04',
      localName: 'Labor Day',
      name: 'Labor Day',
      countryCode: 'US',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    // Thanksgiving (Thursday)
    {
      date: '2023-11-23',
      localName: 'Thanksgiving Day',
      name: 'Thanksgiving Day',
      countryCode: 'US',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'],
    },
    // Christmas (Monday)
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

  describe('findOptimalLeaveDays', () => {
    it('should return a valid leave plan', () => {
      const result = findOptimalLeaveDays(2023, sampleHolidays, 10);

      expect(result).toBeDefined();
      expect(result.leavePlan).toBeDefined();
      expect(result.leavePlan.recommendedLeaveDays.length).toBeLessThanOrEqual(10);
      expect(result.leavePlan.consecutiveBreaks.length).toBeGreaterThan(0);
      expect(result.leavePlan.totalTimeOff).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should not exceed the maximum number of leave days', () => {
      const maxLeaveDays = 5;
      const result = findOptimalLeaveDays(2023, sampleHolidays, maxLeaveDays);

      expect(result.leavePlan.recommendedLeaveDays.length).toBeLessThanOrEqual(maxLeaveDays);
    });

    it('should find a solution that includes days around holidays', () => {
      // For Thanksgiving (2023-11-23, Thursday), a good strategy would be to take
      // Friday off to get a 4-day weekend
      const result = findOptimalLeaveDays(2023, sampleHolidays, 5);

      // Check if any of the recommended days are around Thanksgiving
      const thanksgivingFriday = new Date(2023, 10, 24); // November 24, 2023

      // Look through the recommended leave days
      const recommendsDay = result.leavePlan.recommendedLeaveDays.some(
        (date) =>
          date.getFullYear() === thanksgivingFriday.getFullYear() &&
          date.getMonth() === thanksgivingFriday.getMonth() &&
          date.getDate() === thanksgivingFriday.getDate()
      );

      // This is a soft expectation because the algorithm might find other better options
      // but it's a good heuristic to check
      expect(recommendsDay).toBe(true);
    });

    it('should prioritize leave days in the selected quarter', () => {
      // Select Q4 as priority quarter (Oct-Dec)
      const priorityQuarter = 4;
      const result = findOptimalLeaveDays(2023, sampleHolidays, 10, priorityQuarter);

      // Count how many days are in Q4
      const q4Days = result.leavePlan.recommendedLeaveDays.filter(
        (date) => date.getMonth() >= 9 && date.getMonth() <= 11
      ).length;

      // With Q4 priority and Thanksgiving + Christmas, we should have more days in Q4
      expect(q4Days).toBeGreaterThan(0);

      // Compare with non-priority result
      const nonPriorityResult = findOptimalLeaveDays(2023, sampleHolidays, 10);
      const nonPriorityQ4Days = nonPriorityResult.leavePlan.recommendedLeaveDays.filter(
        (date) => date.getMonth() >= 9 && date.getMonth() <= 11
      ).length;

      // Should recommend more or equal number of days in Q4 when prioritized
      // Note: this is a soft check as it depends on the specific holidays
      expect(q4Days).toBeGreaterThanOrEqual(nonPriorityQ4Days);
    });
  });

  describe('generateLeaveStrategies', () => {
    it('should generate multiple strategies', () => {
      const results = generateLeaveStrategies(2023, sampleHolidays, 15);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(1);

      // Should be sorted by score (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should have different recommendations for different strategies', () => {
      const results = generateLeaveStrategies(2023, sampleHolidays, 15);

      // Check that at least some strategies recommend different days
      let foundDifference = false;

      for (let i = 0; i < results.length - 1; i++) {
        const strategy1Days = results[i].leavePlan.recommendedLeaveDays.map((d) => d.toISOString());
        const strategy2Days = results[i + 1].leavePlan.recommendedLeaveDays.map((d) =>
          d.toISOString()
        );

        if (JSON.stringify(strategy1Days) !== JSON.stringify(strategy2Days)) {
          foundDifference = true;
          break;
        }
      }

      expect(foundDifference).toBe(true);
    });

    it('should consider priority quarter in different strategies', () => {
      // Select Q1 as priority quarter (Jan-Mar)
      const priorityQuarter = 1;
      const results = generateLeaveStrategies(2023, sampleHolidays, 15, priorityQuarter);

      // Ensure we got multiple strategies
      expect(results.length).toBeGreaterThan(1);

      // The first strategy (highest score) should have days in Q1
      const q1Days = results[0].leavePlan.recommendedLeaveDays.filter(
        (date) => date.getMonth() >= 0 && date.getMonth() <= 2
      ).length;

      // There should be some Q1 days in the top strategy with Q1 priority
      expect(q1Days).toBeGreaterThan(0);
    });
  });
});
