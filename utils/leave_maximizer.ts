import { Holiday } from "./holidays.ts";

// TODO: Implement helper functions and the main algorithm

/**
 * Checks if a given date is a weekend (Saturday or Sunday).
 * @param date The date to check.
 * @returns True if the date is a weekend, false otherwise.
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Converts a date string (YYYY-MM-DD) to a Date object (UTC).
 * Ensures consistency by treating dates as UTC.
 * @param dateString The date string in YYYY-MM-DD format.
 * @returns The corresponding Date object at UTC midnight.
 */
export function parseDateUTC(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  // Month is 0-indexed in JavaScript Date objects
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a Date object back to a YYYY-MM-DD string.
 * @param date The Date object.
 * @returns The date string in YYYY-MM-DD format.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Identifies all free days (weekends and public holidays) in a given year.
 * @param year The year to check.
 * @param holidays An array of public holidays for that year.
 * @returns A Set of date strings (YYYY-MM-DD) representing all free days.
 */
export function getAllFreeDays(year: number, holidays: Holiday[]): Set<string> {
  const freeDays = new Set<string>();
  const holidayDates = new Set(holidays.map((h) => h.date));

  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));

  for (let d = startDate; d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateString = formatDate(new Date(d)); // Create new Date object from timestamp
    if (isWeekend(d) || holidayDates.has(dateString)) {
      freeDays.add(dateString);
    }
  }
  return freeDays;
}

/**
 * Identifies all workdays in a given year.
 * @param year The year to check.
 * @param freeDaysSet A Set of date strings (YYYY-MM-DD) representing all free days.
 * @returns An array of date strings (YYYY-MM-DD) representing all workdays.
 */
export function getWorkdays(year: number, freeDaysSet: Set<string>): string[] {
  const workdays: string[] = [];
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));

  for (let d = startDate; d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateString = formatDate(new Date(d)); // Create new Date object
    if (!freeDaysSet.has(dateString)) {
      workdays.push(dateString);
    }
  }
  return workdays;
}

export interface DateBlock {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  length: number;
}

/**
 * Finds consecutive date blocks from a set of dates.
 * @param dateSet A Set of date strings (YYYY-MM-DD).
 * @returns An array of DateBlock objects, sorted by start date.
 */
export function findFreeBlocks(dateSet: Set<string>): DateBlock[] {
  if (dateSet.size === 0) {
    return [];
  }

  const sortedDates = Array.from(dateSet).map(parseDateUTC).sort((a, b) =>
    a.getTime() - b.getTime()
  );
  const blocks: DateBlock[] = [];
  if (sortedDates.length === 0) return blocks; // Should not happen due to size check, but safe

  let currentBlockStart = sortedDates[0];
  let currentBlockEnd = sortedDates[0];
  let currentBlockLength = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) /
      (1000 * 60 * 60 * 24);
    if (diff === 1) {
      // Dates are consecutive
      currentBlockEnd = sortedDates[i];
      currentBlockLength++;
    } else {
      // Gap detected, finalize the current block
      blocks.push({
        start: formatDate(currentBlockStart),
        end: formatDate(currentBlockEnd),
        length: currentBlockLength,
      });
      // Start a new block
      currentBlockStart = sortedDates[i];
      currentBlockEnd = sortedDates[i];
      currentBlockLength = 1;
    }
  }

  // Add the last block
  blocks.push({
    start: formatDate(currentBlockStart),
    end: formatDate(currentBlockEnd),
    length: currentBlockLength,
  });

  return blocks;
}

interface BridgeOpportunity {
  gapDays: string[]; // Workdays needed to bridge the gap
  gapLength: number;
  blockBefore: DateBlock;
  blockAfter: DateBlock;
  score: number; // Higher is better
  totalBlockLength: number; // Length if bridge is taken
}

/**
 * Calculates the number of days between two YYYY-MM-DD strings.
 */
function daysBetween(dateStr1: string, dateStr2: string): number {
  const date1 = parseDateUTC(dateStr1);
  const date2 = parseDateUTC(dateStr2);
  return Math.round(
    Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Gets all dates between start (exclusive) and end (exclusive).
 */
function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = parseDateUTC(startDateStr);
  const end = parseDateUTC(endDateStr);
  current.setUTCDate(current.getUTCDate() + 1);
  while (current < end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Determines the calendar quarter (1-4) for a given date string.
 * @param dateString YYYY-MM-DD
 * @returns Quarter number (1, 2, 3, or 4).
 */
function getQuarter(dateString: string): number {
  const month = parseInt(dateString.split("-")[1], 10); // Month is 1-indexed here
  return Math.ceil(month / 3);
}

// --- Main Function (Bridge Finder with Priority Quarter) ---

/**
 * Calculates suggested leave days by finding and scoring bridges between free blocks,
 * prioritizing bridges within the selected quarter.
 *
 * Identifies gaps between weekends/holidays and suggests filling the most
 * efficient gaps first based on leave days used vs. total block length achieved.
 *
 * @param holidays An array of public holidays for the selected year.
 * @param availableLeaveDays The number of leave days the user has.
 * @param year The selected year.
 * @param priorityQuarter The preferred quarter (e.g., "q1", "q2", "q3", "q4", or "any").
 * @param currentDateString The current date (YYYY-MM-DD) if filtering past dates, otherwise null.
 * @returns An array of suggested leave date strings (YYYY-MM-DD).
 */
export function calculateOptimalLeave(
  holidays: Holiday[],
  availableLeaveDays: number,
  year: number,
  priorityQuarter: string, // e.g., "q1", "q2", "q3", "q4", or "any"
  currentDateString: string | null, // Add current date parameter
): string[] {
  if (!holidays || availableLeaveDays <= 0) {
    return [];
  }

  // --- Filter holidays if it's the current year ---
  let effectiveHolidays = holidays;
  if (currentDateString) {
    effectiveHolidays = holidays.filter((h) => h.date >= currentDateString!);
  }
  // --- End Filter ---

  // Use effectiveHolidays from now on
  if (effectiveHolidays.length === 0) {
    return [];
  }

  const baseFreeDaysSet = getAllFreeDays(year, effectiveHolidays);
  const freeBlocks = findFreeBlocks(baseFreeDaysSet);
  const workdaysSet = new Set(getWorkdays(year, baseFreeDaysSet)); // For quick lookup

  if (freeBlocks.length < 2) {
    return []; // No bridges possible if less than 2 blocks
  }

  const potentialBridges: BridgeOpportunity[] = [];
  const priorityQuarterNum = priorityQuarter === "any"
    ? 0
    : parseInt(priorityQuarter.substring(1), 10);
  const QUARTER_BONUS = 1.5; // Score multiplier for prioritized quarter

  // 1. Identify and score potential bridges
  for (let i = 0; i < freeBlocks.length - 1; i++) {
    const blockBefore = freeBlocks[i];
    const blockAfter = freeBlocks[i + 1];

    // --- Check if bridge start is in the past ---
    if (currentDateString && blockBefore.end < currentDateString) {
      continue; // Don't consider bridges where the first part has already ended before today
    }
    // --- End Check ---

    const daysInGap = daysBetween(blockBefore.end, blockAfter.start) - 1;

    if (daysInGap > 0) {
      const gapDays = getDatesBetween(blockBefore.end, blockAfter.start);
      // Ensure all days in the gap are actually workdays
      const bridgeWorkdays = gapDays.filter((day) => workdaysSet.has(day));

      if (bridgeWorkdays.length === daysInGap) { // Check if the gap consists *only* of workdays
        const totalBlockLength = blockBefore.length + bridgeWorkdays.length +
          blockAfter.length;
        // Base score: Benefit (total length) per day spent.
        let score = totalBlockLength / bridgeWorkdays.length;

        // Apply bonus if the bridge falls within the priority quarter
        if (priorityQuarterNum > 0) {
          // Check if the midpoint of the *gap* falls in the quarter
          // (Simpler proxy than checking the whole resulting block)
          const midGapIndex = Math.floor(bridgeWorkdays.length / 2);
          const midGapDate = bridgeWorkdays[midGapIndex] || bridgeWorkdays[0]; // Handle empty/single day gaps
          if (midGapDate && getQuarter(midGapDate) === priorityQuarterNum) {
            score *= QUARTER_BONUS;
          }
        }

        potentialBridges.push({
          gapDays: bridgeWorkdays,
          gapLength: bridgeWorkdays.length,
          blockBefore: blockBefore,
          blockAfter: blockAfter,
          score: score, // Now potentially includes bonus
          totalBlockLength: totalBlockLength,
        });
      }
    }
  }

  if (potentialBridges.length === 0) {
    return [];
  }

  // 2. Sort bridges by score (descending), maybe secondary sort by gap length (ascending)?
  potentialBridges.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    return a.gapLength - b.gapLength; // Shorter gap first for tie-break
  });

  // 3. Select best bridges greedily
  const selectedLeaveDays = new Set<string>();
  let leaveDaysRemaining = availableLeaveDays;

  for (const bridge of potentialBridges) {
    // Can we afford this bridge?
    if (bridge.gapLength <= leaveDaysRemaining) {
      // Are any of these days already taken by a previously selected bridge?
      const alreadyTaken = bridge.gapDays.some((day) =>
        selectedLeaveDays.has(day)
      );

      // --- Check if the first suggested leave day is in the past ---
      const firstLeaveDay = bridge.gapDays[0];
      if (currentDateString && firstLeaveDay < currentDateString) {
        continue; // Don't select a bridge where the leave starts in the past
      }
      // --- End Check ---

      if (!alreadyTaken) {
        bridge.gapDays.forEach((day) => selectedLeaveDays.add(day));
        leaveDaysRemaining -= bridge.gapLength;

        // Optimization: Could potentially remove overlapping/adjacent bridges from consideration now
      }
    }

    if (leaveDaysRemaining === 0) {
      break; // No more leave days left
    }
  }

  const finalSuggestions = Array.from(selectedLeaveDays).sort();

  return finalSuggestions;
}
