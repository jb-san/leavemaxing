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
  maxLeaveDays: number,
  priorityQuarter: number = 0
): AlgorithmResult {
  // Find all potential workdays (days we could take off)
  const workdays = findWorkdays(year, holidays);

  // If maxLeaveDays is greater than available workdays, cap it
  const effectiveMaxLeaveDays = Math.min(maxLeaveDays, workdays.length);

  // For small numbers of leave days, we can try all combinations
  if (effectiveMaxLeaveDays <= 10 && workdays.length <= 252) {
    return findOptimalByBruteForce(
      year,
      holidays,
      workdays,
      effectiveMaxLeaveDays,
      priorityQuarter
    );
  }

  // For larger numbers, use a greedy algorithm
  return findOptimalByGreedy(year, holidays, workdays, effectiveMaxLeaveDays, priorityQuarter);
}

/**
 * Brute force approach to find optimal leave days (for small number of days)
 */
function findOptimalByBruteForce(
  year: number,
  holidays: PublicHoliday[],
  workdays: Date[],
  maxLeaveDays: number,
  priorityQuarter: number = 0
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

      let score = scoreLeavePlan(plan);

      // Boost score for days in the priority quarter
      if (priorityQuarter > 0) {
        const startMonth = (priorityQuarter - 1) * 3;
        const endMonth = startMonth + 2;

        const daysInPriorityQuarter = currentSelection.filter(
          (date) => date.getMonth() >= startMonth && date.getMonth() <= endMonth
        ).length;

        score += daysInPriorityQuarter * 5; // Reduced from 10 to 5 points per day
      }

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
    return findOptimalByGreedy(year, holidays, workdays, maxLeaveDays, priorityQuarter);
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
  maxLeaveDays: number,
  priorityQuarter: number = 0
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

  // Helper function to check if a date is a good bridge day
  const isBridgeDay = (date: Date): boolean => {
    const dayBefore = new Date(date);
    dayBefore.setDate(date.getDate() - 1);

    const dayAfter = new Date(date);
    dayAfter.setDate(date.getDate() + 1);

    const dayBeforeKey = dayBefore.toISOString().split('T')[0];
    const dayAfterKey = dayAfter.toISOString().split('T')[0];

    // Check if this day connects two free periods
    return freeDaysMap[dayBeforeKey] && freeDaysMap[dayAfterKey];
  };

  // Helper function to check if a day extends a free period
  const extendsFreePeriod = (date: Date): boolean => {
    const dayBefore = new Date(date);
    dayBefore.setDate(date.getDate() - 1);

    const dayAfter = new Date(date);
    dayAfter.setDate(date.getDate() + 1);

    const dayBeforeKey = dayBefore.toISOString().split('T')[0];
    const dayAfterKey = dayAfter.toISOString().split('T')[0];

    // Check if this day is adjacent to a free period
    return freeDaysMap[dayBeforeKey] || freeDaysMap[dayAfterKey];
  };

  // Helper function to check if a date is in the priority quarter
  const isInPriorityQuarter = (date: Date): boolean => {
    if (priorityQuarter === 0) return false;

    const month = date.getMonth();
    const startMonth = (priorityQuarter - 1) * 3;
    const endMonth = startMonth + 2;

    return month >= startMonth && month <= endMonth;
  };

  // First, find all bridge opportunities
  const bridgeOpportunities: Date[][] = [];

  for (const workday of workdays) {
    // Skip if already selected as leave
    const dateKey = workday.toISOString().split('T')[0];
    if (freeDaysMap[dateKey]) continue;

    // Look for 1-4 day bridge opportunities
    for (let length = 1; length <= 4; length++) {
      // Check if we have enough consecutive days available
      let consecutiveDays: Date[] = [workday];
      let allAvailable = true;

      // Build up sequence of consecutive days
      for (let i = 1; i < length; i++) {
        const nextDay = new Date(workday);
        nextDay.setDate(workday.getDate() + i);
        const nextDayKey = nextDay.toISOString().split('T')[0];

        // Check if this day is a workday (not weekend/holiday) and not already selected
        if (freeDaysMap[nextDayKey]) {
          allAvailable = false;
          break;
        }

        // Add to potential sequence
        consecutiveDays.push(nextDay);
      }

      if (!allAvailable) continue;

      // Check if this sequence forms a bridge between free periods
      const startDay = consecutiveDays[0];
      const endDay = consecutiveDays[consecutiveDays.length - 1];

      const dayBefore = new Date(startDay);
      dayBefore.setDate(startDay.getDate() - 1);

      const dayAfter = new Date(endDay);
      dayAfter.setDate(endDay.getDate() + 1);

      const dayBeforeKey = dayBefore.toISOString().split('T')[0];
      const dayAfterKey = dayAfter.toISOString().split('T')[0];

      // Check if this sequence bridges free periods or extends at least one free period
      if (freeDaysMap[dayBeforeKey] && freeDaysMap[dayAfterKey]) {
        // This is a true bridge - connects two free periods
        bridgeOpportunities.push(consecutiveDays);
      } else if (freeDaysMap[dayBeforeKey] || freeDaysMap[dayAfterKey]) {
        // This extends a free period
        bridgeOpportunities.push(consecutiveDays);
      }
    }
  }

  // Score each bridge opportunity
  const scoredBridges = bridgeOpportunities.map((bridgeDays) => {
    const startDay = bridgeDays[0];
    const endDay = bridgeDays[bridgeDays.length - 1];

    const dayBefore = new Date(startDay);
    dayBefore.setDate(startDay.getDate() - 1);

    const dayAfter = new Date(endDay);
    dayAfter.setDate(endDay.getDate() + 1);

    const dayBeforeKey = dayBefore.toISOString().split('T')[0];
    const dayAfterKey = dayAfter.toISOString().split('T')[0];

    let score = 0;

    // True bridge (connects two free periods) gets highest score
    if (freeDaysMap[dayBeforeKey] && freeDaysMap[dayAfterKey]) {
      score = 40 - bridgeDays.length * 5; // Penalize longer sequences slightly
    }
    // Extending a free period gets medium score
    else if (freeDaysMap[dayBeforeKey] || freeDaysMap[dayAfterKey]) {
      score = 20 - bridgeDays.length * 2; // Penalize longer sequences slightly
    }

    // Check if the free period being extended is a holiday (higher value)
    if (freeDaysMap[dayBeforeKey]) {
      const isHolidayBefore = holidays.some((h) => h.date.split('T')[0] === dayBeforeKey);
      if (isHolidayBefore) score += 10;
    }

    if (freeDaysMap[dayAfterKey]) {
      const isHolidayAfter = holidays.some((h) => h.date.split('T')[0] === dayAfterKey);
      if (isHolidayAfter) score += 10;
    }

    // Apply bonus for days in priority quarter
    if (priorityQuarter > 0) {
      const daysInPriorityQuarter = bridgeDays.filter(isInPriorityQuarter).length;
      if (daysInPriorityQuarter > 0) {
        // Give modest boost for bridges in priority quarter (reduced from 15 to 5)
        score += daysInPriorityQuarter * 5;

        // Extra bonus if ALL days in the bridge are in priority quarter (reduced from 10 to 5)
        if (daysInPriorityQuarter === bridgeDays.length) {
          score += 5;
        }
      }
    }

    return {
      days: bridgeDays,
      score,
    };
  });

  // Sort bridges by score (highest first)
  scoredBridges.sort((a, b) => b.score - a.score);

  // Select the best bridge opportunities until we've used all leave days
  for (const bridge of scoredBridges) {
    // Skip if we don't have enough days left
    if (bridge.days.length > remainingDays) continue;

    // Skip if any of these days are already selected
    const alreadySelected = bridge.days.some((day) => {
      return selectedDays.some((selected) => selected.toISOString() === day.toISOString());
    });
    if (alreadySelected) continue;

    // Add these days to our selection
    selectedDays = [...selectedDays, ...bridge.days];
    remainingDays -= bridge.days.length;

    // Update free days map
    bridge.days.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];
      freeDaysMap[dayKey] = true;
    });

    // Stop if we've used all leave days
    if (remainingDays === 0) break;
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
  maxLeaveDays: number,
  priorityQuarter: number = 0
): AlgorithmResult[] {
  const results: AlgorithmResult[] = [];

  // Strategy 1: Maximize consecutive days off (default)
  results.push(findOptimalLeaveDays(year, holidays, maxLeaveDays, priorityQuarter));

  // Strategy 2: Focus on first half of the year
  const workdaysFirstHalf = findWorkdays(year, holidays).filter((d) => d.getMonth() < 6);

  const firstHalfResult = findOptimalByGreedy(
    year,
    holidays,
    workdaysFirstHalf,
    Math.floor(maxLeaveDays / 2),
    priorityQuarter
  );
  results.push(firstHalfResult);

  // Strategy 3: Focus on second half of the year
  const workdaysSecondHalf = findWorkdays(year, holidays).filter((d) => d.getMonth() >= 6);

  const secondHalfResult = findOptimalByGreedy(
    year,
    holidays,
    workdaysSecondHalf,
    Math.floor(maxLeaveDays / 2),
    priorityQuarter
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

    // Give more days to priority quarter if one is selected
    let daysPerQuarter = Math.floor(maxLeaveDays / 4);
    if (priorityQuarter > 0 && quarter === priorityQuarter - 1) {
      daysPerQuarter = Math.floor(maxLeaveDays * 0.3); // 30% of days to priority quarter (reduced from 33%)
    } else if (priorityQuarter > 0) {
      daysPerQuarter = Math.floor(maxLeaveDays * 0.23); // 23% to other quarters (more balanced distribution)
    }

    const quarterResult = findOptimalByGreedy(
      year,
      holidays,
      workdaysQuarter,
      daysPerQuarter,
      priorityQuarter
    );

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
