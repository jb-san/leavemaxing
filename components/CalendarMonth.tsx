import { FunctionalComponent } from "preact";
import { Holiday } from "../utils/holidays.ts";
import { formatDate, isWeekend } from "../utils/leave_maximizer.ts"; // Import helpers

interface CalendarMonthProps {
  year: number;
  month: number; // 0-indexed
  holidays: Holiday[]; // Changed to non-optional
  suggestedLeaveDays: string[]; // Changed to non-optional, format YYYY-MM-DD
  currentDateString: string | null; // Add prop for current date
}

const CalendarMonth: FunctionalComponent<CalendarMonthProps> = (
  { year, month, holidays, suggestedLeaveDays, currentDateString },
) => {
  // Create sets for quick lookups
  const holidayDates = new Set(holidays.map((h) => h.date));
  const suggestedDates = new Set(suggestedLeaveDays);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  // --- Determine if month is in the past ---
  let isPastMonth = false;
  if (currentDateString) {
    const currentMonthNum = parseInt(currentDateString.split("-")[1], 10) - 1; // 0-indexed
    const currentYearNum = parseInt(currentDateString.split("-")[0], 10);
    if (
      year < currentYearNum ||
      (year === currentYearNum && month < currentMonthNum)
    ) {
      isPastMonth = true;
    }
  }
  // --- End Check ---

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Apply opacity to the entire month container if it's in the past
  const monthContainerClasses =
    `p-3 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800 min-h-[250px] ${
      isPastMonth ? "opacity-50" : ""
    }`;

  return (
    <div class={monthContainerClasses}>
      <h3 class="text-md font-semibold text-center mb-2 dark:text-gray-200">
        {monthName} {year}
      </h3>
      <div class="grid grid-cols-7 gap-0.5 text-center text-xs">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            class="font-medium text-gray-500 dark:text-gray-400 pb-1"
          >
            {day}
          </div>
        ))}
        {/* Blank days before the 1st */}
        {blanks.map((_, index) => <div key={`blank-${index}`}></div>)}
        {/* Actual days */}
        {days.map((day) => {
          const date = new Date(Date.UTC(year, month, day));
          const dateString = formatDate(date);
          const weekend = isWeekend(date);

          // --- Determine if day is in the past ---
          let isPastDay = false;
          if (
            !isPastMonth && currentDateString && dateString < currentDateString
          ) {
            isPastDay = true;
          }
          // --- End Check ---

          let dayClasses =
            "border dark:border-gray-600 p-1 rounded aspect-square flex items-center justify-center text-gray-700 dark:text-gray-300";
          // Add opacity class if month or day is in the past
          if (isPastMonth || isPastDay) {
            dayClasses += " opacity-50";
          }

          // Apply other styling classes
          if (weekend) {
            dayClasses +=
              " bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
          } else if (suggestedDates.has(dateString)) { // Prioritize suggested leave styling over holiday
            dayClasses +=
              " bg-green-300 dark:bg-green-600 font-bold text-green-900 dark:text-green-100 ring-2 ring-green-500 dark:ring-green-400";
          } else if (holidayDates.has(dateString)) {
            dayClasses +=
              " bg-orange-300 dark:bg-orange-600 font-bold text-orange-900 dark:text-orange-100";
          }

          // Add hover effect only if not a past day/month
          if (!isPastMonth && !isPastDay) {
            dayClasses +=
              " hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150";
          }

          return (
            <div key={day} class={dayClasses}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarMonth;
