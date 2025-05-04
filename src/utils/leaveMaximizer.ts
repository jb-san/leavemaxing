import type { PublicHoliday } from '../types/api';
import type { AlgorithmResult, ConsecutiveBreak, LeavePlan } from '../types/state';
import { getDatesInYear, isFreeDay, isHoliday, isWeekendDay } from './dateUtils';

interface WorkingDayInfo {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  isLeave: boolean;
}

/**
 * Scores a leave plan based on criteria like consecutive days and total time off
 */
function scoreLeavePlan(leavePlan: LeavePlan): number {
  // Base score is the total time off
  let score = leavePlan.totalTimeOff;

  // Bonus for consecutive breaks (longer breaks are worth more)
  for (const breakPeriod of leavePlan.consecutiveBreaks) {
    // Square the duration to make longer breaks more valuable
    // but divide by leave days used to reward efficiency
    const breakScore =
      (breakPeriod.duration * breakPeriod.duration) /
      (breakPeriod.leaveDaysUsed > 0 ? breakPeriod.leaveDaysUsed : 1);
    score += breakScore;
  }

  return score;
}

/**
 * Find all workdays in a year (non-weekend, non-holiday days)
 */
function findWorkdays(year: number, holidays: PublicHoliday[]): Date[] {
  const allDates = getDatesInYear(year);
  return allDates.filter((date) => !isFreeDay(date, holidays));
}

/**
 * Calculate consecutive day breaks given a set of leave days
 */
function calculateConsecutiveBreaks(
  year: number,
  holidays: PublicHoliday[],
  leaveDays: Date[]
): ConsecutiveBreak[] {
  const allDates = getDatesInYear(year);
  const breaks: ConsecutiveBreak[] = [];

  // Mark all dates as either free (weekend/holiday) or leave
  const dateMap: Record<string, WorkingDayInfo> = {};

  allDates.forEach((date) => {
    const dateKey = date.toISOString().split('T')[0];
    const isWeekendValue = isWeekendDay(date);
    const isHolidayValue = isHoliday(date, holidays);

    dateMap[dateKey] = {
      date,
      isWeekend: isWeekendValue,
      isHoliday: isHolidayValue,
      isLeave: false,
    };
  });

  // Mark leave days
  leaveDays.forEach((date) => {
    const dateKey = date.toISOString().split('T')[0];
    if (dateMap[dateKey]) {
      dateMap[dateKey].isLeave = true;
    }
  });

  // Find consecutive breaks
  let currentBreak: Date[] = [];
  let currentLeaveDaysUsed = 0;

  allDates.forEach((date) => {
    const dateKey = date.toISOString().split('T')[0];
    const info = dateMap[dateKey];

    if (info.isWeekend || info.isHoliday || info.isLeave) {
      currentBreak.push(date);
      if (info.isLeave) {
        currentLeaveDaysUsed++;
      }
    } else {
      // End of a break
      if (currentBreak.length > 1) {
        breaks.push({
          startDate: currentBreak[0],
          endDate: currentBreak[currentBreak.length - 1],
          duration: currentBreak.length,
          leaveDaysUsed: currentLeaveDaysUsed,
        });
      }

      // Reset for next break
      currentBreak = [];
      currentLeaveDaysUsed = 0;
    }
  });

  // Check if there's a break at the end of the year
  if (currentBreak.length > 1) {
    breaks.push({
      startDate: currentBreak[0],
      endDate: currentBreak[currentBreak.length - 1],
      duration: currentBreak.length,
      leaveDaysUsed: currentLeaveDaysUsed,
    });
  }

  return breaks;
}

/**
 * Main algorithm to optimize leave days for maximum time off
 */
export function findOptimalLeaveDays(
  year: number,
  holidays: PublicHoliday[],
  maxLeaveDays: number
): AlgorithmResult {
  // Find all potential workdays (days we could take off)
  const workdays = findWorkdays(year, holidays);

  // If maxLeaveDays is greater than available workdays, cap it
  const effectiveMaxLeaveDays = Math.min(maxLeaveDays, workdays.length);

  // For small numbers of leave days, we can try all combinations
  if (effectiveMaxLeaveDays <= 10 && workdays.length <= 252) {
    return findOptimalByBruteForce(year, holidays, workdays, effectiveMaxLeaveDays);
  }

  // For larger numbers, use a greedy algorithm
  return findOptimalByGreedy(year, holidays, workdays, effectiveMaxLeaveDays);
}

/**
 * Brute force approach to find optimal leave days (for small number of days)
 */
function findOptimalByBruteForce(
  year: number,
  holidays: PublicHoliday[],
  workdays: Date[],
  maxLeaveDays: number
): AlgorithmResult {
  let bestScore = -1;
  let bestPlan: LeavePlan | null = null;

  // Helper function to generate combinations
  function generateCombinations(
    availableDays: Date[],
    currentSelection: Date[],
    startIndex: number,
    remainingToSelect: number
  ) {
    // If we've selected enough days, evaluate this plan
    if (remainingToSelect === 0) {
      const breaks = calculateConsecutiveBreaks(year, holidays, currentSelection);
      const totalTimeOff = breaks.reduce((sum, b) => sum + b.duration, 0);

      const plan: LeavePlan = {
        recommendedLeaveDays: [...currentSelection],
        totalTimeOff,
        consecutiveBreaks: breaks,
      };

      const score = scoreLeavePlan(plan);

      if (score > bestScore) {
        bestScore = score;
        bestPlan = plan;
      }

      return;
    }

    // Not enough days left to select
    if (startIndex >= availableDays.length) {
      return;
    }

    // Take current day
    currentSelection.push(availableDays[startIndex]);
    generateCombinations(availableDays, currentSelection, startIndex + 1, remainingToSelect - 1);

    // Backtrack
    currentSelection.pop();

    // Skip current day
    generateCombinations(availableDays, currentSelection, startIndex + 1, remainingToSelect);
  }

  // Start recursive combination generation
  generateCombinations(workdays, [], 0, maxLeaveDays);

  if (!bestPlan) {
    // Fallback to greedy if something went wrong
    return findOptimalByGreedy(year, holidays, workdays, maxLeaveDays);
  }

  return {
    leavePlan: bestPlan,
    score: bestScore,
  };
}

/**
 * Greedy approach for larger numbers of leave days
 * This prioritizes days adjacent to weekends and holidays
 */
function findOptimalByGreedy(
  year: number,
  holidays: PublicHoliday[],
  workdays: Date[],
  maxLeaveDays: number
): AlgorithmResult {
  // Create a map of all dates for fast checking of free days
  const allDates = getDatesInYear(year);
  const freeDaysMap: Record<string, boolean> = {};

  allDates.forEach((date) => {
    const dateKey = date.toISOString().split('T')[0];
    freeDaysMap[dateKey] = isWeekendDay(date) || isHoliday(date, holidays);
  });

  // We'll iteratively add leave days to maximize consecutive breaks
  let selectedDays: Date[] = [];
  let remainingDays = maxLeaveDays;

  while (remainingDays > 0 && workdays.length > 0) {
    // Update our free days map with currently selected leave days
    selectedDays.forEach((date) => {
      const dateKey = date.toISOString().split('T')[0];
      freeDaysMap[dateKey] = true;
    });

    // Score each potential leave day based on adjacent free days
    const scoredDays = workdays
      .filter((date) => {
        // Skip dates already selected
        const dateKey = date.toISOString().split('T')[0];
        return !freeDaysMap[dateKey];
      })
      .map((date) => {
        // Check days before and after
        const dayBefore = new Date(date);
        dayBefore.setDate(date.getDate() - 1);

        const dayAfter = new Date(date);
        dayAfter.setDate(date.getDate() + 1);

        const twoDaysBefore = new Date(date);
        twoDaysBefore.setDate(date.getDate() - 2);

        const twoDaysAfter = new Date(date);
        twoDaysAfter.setDate(date.getDate() + 2);

        let score = 0;

        // Get date keys for checking
        const dayBeforeKey = dayBefore.toISOString().split('T')[0];
        const dayAfterKey = dayAfter.toISOString().split('T')[0];
        const twoDaysBeforeKey = twoDaysBefore.toISOString().split('T')[0];
        const twoDaysAfterKey = twoDaysAfter.toISOString().split('T')[0];

        // Check connectivity - prioritize days that connect existing free days
        if (freeDaysMap[dayBeforeKey] && freeDaysMap[dayAfterKey]) {
          // This leave day would connect two existing free periods - highest priority
          score += 30;
        } else {
          // Higher score if adjacent to existing free days
          if (freeDaysMap[dayBeforeKey]) {
            score += 10;

            // Check if taking this day extends an existing chain
            if (freeDaysMap[twoDaysBeforeKey]) {
              score += 5;
            }
          }

          if (freeDaysMap[dayAfterKey]) {
            score += 10;

            // Check if taking this day extends an existing chain
            if (freeDaysMap[twoDaysAfterKey]) {
              score += 5;
            }
          }
        }

        return { date, score };
      });

    // If no valid days are left, break
    if (scoredDays.length === 0) break;

    // Sort by score (highest first)
    scoredDays.sort((a, b) => b.score - a.score);

    // Take the highest scoring day
    selectedDays.push(scoredDays[0].date);
    remainingDays--;

    // Optionally, remove selected day from workdays to prevent reselection
    const selectedDateStr = scoredDays[0].date.toISOString();
    workdays = workdays.filter((d) => d.toISOString() !== selectedDateStr);
  }

  // Sort the selected days chronologically
  selectedDays.sort((a, b) => a.getTime() - b.getTime());

  const breaks = calculateConsecutiveBreaks(year, holidays, selectedDays);
  const totalTimeOff = breaks.reduce((sum, b) => sum + b.duration, 0);

  const plan: LeavePlan = {
    recommendedLeaveDays: selectedDays,
    totalTimeOff,
    consecutiveBreaks: breaks,
  };

  return {
    leavePlan: plan,
    score: scoreLeavePlan(plan),
  };
}

/**
 * Generate multiple leave strategies with different priorities
 */
export function generateLeaveStrategies(
  year: number,
  holidays: PublicHoliday[],
  maxLeaveDays: number
): AlgorithmResult[] {
  const results: AlgorithmResult[] = [];

  // Strategy 1: Maximize consecutive days off (default)
  results.push(findOptimalLeaveDays(year, holidays, maxLeaveDays));

  // Strategy 2: Focus on first half of the year
  const workdaysFirstHalf = findWorkdays(year, holidays).filter((d) => d.getMonth() < 6);

  const firstHalfResult = findOptimalByGreedy(
    year,
    holidays,
    workdaysFirstHalf,
    Math.floor(maxLeaveDays / 2)
  );
  results.push(firstHalfResult);

  // Strategy 3: Focus on second half of the year
  const workdaysSecondHalf = findWorkdays(year, holidays).filter((d) => d.getMonth() >= 6);

  const secondHalfResult = findOptimalByGreedy(
    year,
    holidays,
    workdaysSecondHalf,
    Math.floor(maxLeaveDays / 2)
  );
  results.push(secondHalfResult);

  // Strategy 4: Even distribution (one long break per quarter)
  const quarterlyResults: LeavePlan = {
    recommendedLeaveDays: [],
    totalTimeOff: 0,
    consecutiveBreaks: [],
  };

  for (let quarter = 0; quarter < 4; quarter++) {
    const startMonth = quarter * 3;
    const endMonth = startMonth + 2;

    const workdaysQuarter = findWorkdays(year, holidays).filter(
      (d) => d.getMonth() >= startMonth && d.getMonth() <= endMonth
    );

    const daysPerQuarter = Math.floor(maxLeaveDays / 4);

    const quarterResult = findOptimalByGreedy(year, holidays, workdaysQuarter, daysPerQuarter);

    quarterlyResults.recommendedLeaveDays = [
      ...quarterlyResults.recommendedLeaveDays,
      ...quarterResult.leavePlan.recommendedLeaveDays,
    ];

    quarterlyResults.consecutiveBreaks = [
      ...quarterlyResults.consecutiveBreaks,
      ...quarterResult.leavePlan.consecutiveBreaks,
    ];
  }

  quarterlyResults.totalTimeOff = quarterlyResults.consecutiveBreaks.reduce(
    (sum, b) => sum + b.duration,
    0
  );

  results.push({
    leavePlan: quarterlyResults,
    score: scoreLeavePlan(quarterlyResults),
  });

  // Sort results by score
  return results.sort((a, b) => b.score - a.score);
}
