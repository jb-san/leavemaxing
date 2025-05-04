import { FunctionalComponent } from "preact";
import { Holiday } from "../utils/holidays.ts";
import { formatDate, isWeekend } from "../utils/leave_maximizer.ts"; // Import helpers

interface CalendarMonthProps {
  year: number;
  month: number; // 0-indexed
  holidays: Holiday[]; // Changed to non-optional
  suggestedLeaveDays: string[]; // Changed to non-optional, format YYYY-MM-DD
}

const CalendarMonth: FunctionalComponent<CalendarMonthProps> = (
  { year, month, holidays, suggestedLeaveDays },
) => {
  // Create sets for quick lookups
  const holidayDates = new Set(holidays.map((h) => h.date));
  const suggestedDates = new Set(suggestedLeaveDays);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div class="p-3 border dark:border-gray-700 rounded shadow-sm bg-white dark:bg-gray-800 min-h-[250px]">
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

          let dayClasses =
            "border dark:border-gray-600 p-1 rounded aspect-square flex items-center justify-center text-gray-700 dark:text-gray-300";
          if (weekend) {
            dayClasses +=
              " bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
          }
          if (holidayDates.has(dateString)) {
            dayClasses +=
              " bg-orange-300 dark:bg-orange-600 font-bold text-orange-900 dark:text-orange-100";
          }
          if (suggestedDates.has(dateString)) {
            dayClasses +=
              " bg-green-300 dark:bg-green-600 font-bold text-green-900 dark:text-green-100 ring-2 ring-green-500 dark:ring-green-400";
          }
          dayClasses +=
            " hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150";

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
