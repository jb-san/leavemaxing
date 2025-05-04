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
    <div class="p-4 border rounded shadow mb-4 bg-white">
      <h3 class="text-lg font-semibold text-center mb-2">
        {monthName} {year}
      </h3>
      <div class="grid grid-cols-7 gap-1 text-center text-sm">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div key={day} class="font-medium text-gray-600 pb-1">{day}</div>
        ))}
        {/* Blank days before the 1st */}
        {blanks.map((_, index) => <div key={`blank-${index}`}></div>)}
        {/* Actual days */}
        {days.map((day) => {
          const date = new Date(Date.UTC(year, month, day));
          const dateString = formatDate(date);
          const weekend = isWeekend(date);

          let dayClasses = "border p-2 rounded"; // Base classes
          if (weekend) {
            dayClasses += " bg-gray-100 text-gray-500";
          }
          if (holidayDates.has(dateString)) {
            dayClasses += " bg-orange-300 font-bold"; // Holiday: Orange
          }
          if (suggestedDates.has(dateString)) {
            dayClasses += " bg-green-300 font-bold ring-2 ring-green-500"; // Suggested: Green + Ring
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
